'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse, Profile } from '@/types/database'

export interface UserStats {
    userId: string
    user: Partial<Profile>
    total: number
    stats: {
        introduccion: number
        finalizacion: number
        ensenanza: number
        testimonios: number
    }
}

export interface ReadingStats {
    label: string
    count: number
    [key: string]: string | number
}

export interface StatsSummary {
    totalCultos: number
    totalParticipaciones: number
    hermanosActivos: number
}

export async function getCultoTypes(): Promise<ActionResponse<{ id: string; nombre: string }[]>> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('culto_types')
            .select('id, nombre')
            .order('nombre')
        if (error) throw error
        return { success: true, data: data || [] }
    } catch (e) {
        console.error('getCultoTypes:', e)
        return { success: false, error: 'Error al cargar tipos' }
    }
}

export async function getStatsSummary(
    year: number,
    tipoCultoId?: string | null
): Promise<ActionResponse<StatsSummary>> {
    try {
        const supabase = await createClient()
        const start = `${year}-01-01`
        const end = `${year}-12-31`

        let cultosQuery = supabase
            .from('cultos')
            .select('id, id_usuario_intro, id_usuario_finalizacion, id_usuario_ensenanza, id_usuario_testimonios, tipo_culto_id')
            .gte('fecha', start)
            .lte('fecha', end)

        if (tipoCultoId) {
            cultosQuery = cultosQuery.eq('tipo_culto_id', tipoCultoId)
        }

        const { data: cultos, error } = await cultosQuery
        if (error) throw error

        let totalParticipaciones = 0
        const activeIds = new Set<string>()
        cultos?.forEach(c => {
            ;[c.id_usuario_intro, c.id_usuario_finalizacion, c.id_usuario_ensenanza, c.id_usuario_testimonios].forEach(id => {
                if (id) {
                    totalParticipaciones++
                    activeIds.add(id)
                }
            })
        })

        return {
            success: true,
            data: {
                totalCultos: cultos?.length ?? 0,
                totalParticipaciones,
                hermanosActivos: activeIds.size
            }
        }
    } catch (e) {
        console.error('getStatsSummary:', e)
        return { success: false, error: 'Error al cargar resumen' }
    }
}

export async function getParticipationStats(
    year: number,
    tipoCultoId?: string | null
): Promise<ActionResponse<UserStats[]>> {
    try {
        const supabase = await createClient()
        const start = `${year}-01-01`
        const end = `${year}-12-31`

        let cultosQuery = supabase
            .from('cultos')
            .select(`
                id,
                fecha,
                id_usuario_intro,
                id_usuario_finalizacion,
                id_usuario_ensenanza,
                id_usuario_testimonios
            `)
            .gte('fecha', start)
            .lte('fecha', end)

        if (tipoCultoId) {
            cultosQuery = cultosQuery.eq('tipo_culto_id', tipoCultoId)
        }

        const { data: cultos, error: cultosError } = await cultosQuery
        if (cultosError) throw cultosError

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('pulpito', true)
            .order('nombre')

        if (profilesError) throw profilesError

        const statsMap = new Map<string, UserStats>()
        profiles.forEach(p => {
            statsMap.set(p.id, {
                userId: p.id,
                user: p,
                total: 0,
                stats: {
                    introduccion: 0,
                    finalizacion: 0,
                    ensenanza: 0,
                    testimonios: 0
                }
            })
        })

        cultos?.forEach(c => {
            if (c.id_usuario_intro && statsMap.has(c.id_usuario_intro)) {
                statsMap.get(c.id_usuario_intro)!.stats.introduccion++
                statsMap.get(c.id_usuario_intro)!.total++
            }
            if (c.id_usuario_finalizacion && statsMap.has(c.id_usuario_finalizacion)) {
                statsMap.get(c.id_usuario_finalizacion)!.stats.finalizacion++
                statsMap.get(c.id_usuario_finalizacion)!.total++
            }
            if (c.id_usuario_ensenanza && statsMap.has(c.id_usuario_ensenanza)) {
                statsMap.get(c.id_usuario_ensenanza)!.stats.ensenanza++
                statsMap.get(c.id_usuario_ensenanza)!.total++
            }
            if (c.id_usuario_testimonios && statsMap.has(c.id_usuario_testimonios)) {
                statsMap.get(c.id_usuario_testimonios)!.stats.testimonios++
                statsMap.get(c.id_usuario_testimonios)!.total++
            }
        })

        const results = Array.from(statsMap.values()).sort((a, b) => b.total - a.total)
        return { success: true, data: results }
    } catch (error) {
        console.error('Error fetching stats:', error)
        return { success: false, error: 'Error al cargar estadísticas' }
    }
}

function formatCitation(r: {
    libro: string
    capitulo_inicio: number
    versiculo_inicio: number
    capitulo_fin: number
    versiculo_fin: number
}): string {
    const sameChapter = r.capitulo_inicio === r.capitulo_fin
    const sameVerse = r.versiculo_inicio === r.versiculo_fin
    if (sameChapter && sameVerse) {
        return `${r.libro} ${r.capitulo_inicio}:${r.versiculo_inicio}`
    }
    if (sameChapter) {
        return `${r.libro} ${r.capitulo_inicio}:${r.versiculo_inicio}-${r.versiculo_fin}`
    }
    return `${r.libro} ${r.capitulo_inicio}:${r.versiculo_inicio}-${r.capitulo_fin}:${r.versiculo_fin}`
}

export async function getBibleReadingStats(
    year?: number | null,
    tipoCultoId?: string | null
): Promise<ActionResponse<{ topReadings: ReadingStats[]; readingsByType: ReadingStats[]; totalLecturas: number }>> {
    try {
        const supabase = await createClient()

        const { data: readings, error } = await supabase
            .from('lecturas_biblicas')
            .select('libro, capitulo_inicio, versiculo_inicio, capitulo_fin, versiculo_fin, tipo_lectura, culto_id')

        if (error) throw error

        let filteredReadings = readings || []
        if (year || tipoCultoId) {
            let cultosQuery = supabase.from('cultos').select('id')
            if (year) {
                cultosQuery = cultosQuery
                    .gte('fecha', `${year}-01-01`)
                    .lte('fecha', `${year}-12-31`)
            }
            if (tipoCultoId) {
                cultosQuery = cultosQuery.eq('tipo_culto_id', tipoCultoId)
            }
            const { data: cultos } = await cultosQuery
            const cultoIds = new Set((cultos || []).map(c => c.id))
            filteredReadings = filteredReadings.filter(r => cultoIds.has(r.culto_id))
        }

        const citationCounts: Record<string, number> = {}
        filteredReadings.forEach(r => {
            const label = formatCitation({
                libro: r.libro,
                capitulo_inicio: r.capitulo_inicio,
                versiculo_inicio: r.versiculo_inicio,
                capitulo_fin: r.capitulo_fin ?? r.capitulo_inicio,
                versiculo_fin: r.versiculo_fin ?? r.versiculo_inicio
            })
            citationCounts[label] = (citationCounts[label] || 0) + 1
        })

        const topReadings = Object.entries(citationCounts)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        const typeCounts: Record<string, number> = { introduccion: 0, finalizacion: 0 }
        filteredReadings.forEach(t => {
            if (t.tipo_lectura === 'introduccion') typeCounts.introduccion++
            if (t.tipo_lectura === 'finalizacion') typeCounts.finalizacion++
        })

        const readingsByType = [
            { label: 'Introducción', count: typeCounts.introduccion },
            { label: 'Finalización', count: typeCounts.finalizacion }
        ].filter(({ count }) => count > 0)

        return {
            success: true,
            data: {
                topReadings,
                readingsByType,
                totalLecturas: filteredReadings.length
            }
        }
    } catch (error) {
        console.error('Error fetching reading stats:', error)
        return { success: false, error: 'Error al cargar estadísticas de lectura' }
    }
}
