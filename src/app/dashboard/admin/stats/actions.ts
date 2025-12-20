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

export async function getParticipationStats(year: number): Promise<ActionResponse<UserStats[]>> {
    try {
        const supabase = await createClient()
        const start = `${year}-01-01`
        const end = `${year}-12-31`

        // 1. Fetch cultos in range (only finished ones? or all assigned?)
        // Usually stats count what HAS happened or IS planned. Let's count all assigned.
        const { data: cultos, error: cultosError } = await supabase
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

        if (cultosError) throw cultosError

        // 2. Fetch all profiles eligible for pulpit
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('pulpito', true)
            .order('nombre')

        if (profilesError) throw profilesError

        // 3. Calculate stats in memory
        const statsMap = new Map<string, UserStats>()

        // Initialize map with all eligible profiles
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

        // Iterate over cultos and increment counts
        cultos.forEach(c => {
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

        // Sort by total participations descending
        const results = Array.from(statsMap.values()).sort((a, b) => b.total - a.total)

        return { success: true, data: results }

    } catch (error) {
        console.error('Error fetching stats:', error)
        return { success: false, error: 'Error al cargar estadísticas' }
    }
}

export async function getBibleReadingStats(): Promise<ActionResponse<{ topReadings: ReadingStats[], readingsByType: ReadingStats[] }>> {
    try {
        const supabase = await createClient()

        // 1. Most read citations (top 5)
        const { data: readings, error } = await supabase
            .from('lecturas_biblicas')
            .select('libro, capitulo_inicio, versiculo_inicio, capitulo_fin, versiculo_fin')

        if (error) throw error

        const citationCounts: Record<string, number> = {}
        readings.forEach(r => {
            const label = `${r.libro} ${r.capitulo_inicio}:${r.versiculo_inicio}${r.capitulo_fin !== r.capitulo_inicio || r.versiculo_fin !== r.versiculo_inicio ? `-${r.capitulo_fin}:${r.versiculo_fin}` : ''}`
            citationCounts[label] = (citationCounts[label] || 0) + 1
        })

        const topReadings = Object.entries(citationCounts)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

        // 2. Readings by type (intro vs final)
        const { data: types, error: typesError } = await supabase
            .from('lecturas_biblicas')
            .select('tipo_lectura')

        if (typesError) throw typesError

        const typeCounts: Record<string, number> = { 'Introducción': 0, 'Finalización': 0 }
        types.forEach(t => {
            if (t.tipo_lectura === 'introduccion') typeCounts['Introducción']++
            if (t.tipo_lectura === 'finalizacion') typeCounts['Finalización']++
        })

        const readingsByType = Object.entries(typeCounts).map(([label, count]) => ({ label, count }))

        return { success: true, data: { topReadings, readingsByType } }
    } catch (error) {
        console.error('Error fetching reading stats:', error)
        return { success: false, error: 'Error al cargar estadísticas de lectura' }
    }
}
