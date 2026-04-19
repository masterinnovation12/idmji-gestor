'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { TEMAS_ALABANZA_KEYS, type TemaAlabanzaKey } from '@/lib/constants/temasAlabanza'

export interface LecturaIntro {
    libro: string
    capitulo_inicio: number
    versiculo_inicio: number
    capitulo_fin: number
    versiculo_fin: number
}

export interface TemaAlabanzaRegistro {
    id: string
    fecha: string
    hora_inicio: string
    tema_key: string
    culto_id: string
    tipo_culto: { id: string; nombre: string }
    usuario_intro: { id: string; nombre: string; apellidos: string } | null
    /** Lectura de introducción, solo si está registrada */
    lectura_intro: LecturaIntro | null
}

export interface TemaAlabanzaStats {
    totalUsos: number
    temaMasUsado: { temaKey: string; count: number } | null
    hermanoMasUsaTema: { hermanoId: string; hermanoNombre: string; temaKey: string; count: number } | null
    temasPorUso: { temaKey: string; count: number }[]
    hermanosPorTema: Record<string, { id: string; nombre: string; count: number }[]>
}

export interface HermanosConTemas {
    id: string
    nombre: string
    apellidos: string
}

/**
 * Obtener el ID del tipo de culto Alabanza
 */
async function getAlabanzaTipoId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
    const { data } = await supabase
        .from('culto_types')
        .select('id')
        .ilike('nombre', '%Alabanza%')
        .limit(1)
        .single()
    return data?.id ?? null
}

/**
 * Obtener todos los registros de temas de alabanza con filtros
 */
export async function getAllTemasAlabanza(
    page: number = 1,
    limit: number = 20,
    filters?: {
        temaKey?: string
        hermanoId?: string
        startDate?: string
        endDate?: string
    }
) {
    noStore()
    const supabase = await createClient()

    const alabanzaId = await getAlabanzaTipoId(supabase)
    if (!alabanzaId) {
        return { data: [], count: 0, totalPages: 0 }
    }

    let query = supabase
        .from('cultos')
        .select(
            `
            id,
            fecha,
            hora_inicio,
            meta_data,
            tipo_culto:culto_types(id, nombre),
            usuario_intro:profiles!id_usuario_intro(id, nombre, apellidos)
        `,
            { count: 'exact' }
        )
        .eq('tipo_culto_id', alabanzaId)
        .not('meta_data->tema_introduccion_alabanza', 'is', null)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })

    if (filters?.startDate) {
        query = query.gte('fecha', filters.startDate)
    }
    if (filters?.endDate) {
        query = query.lte('fecha', filters.endDate)
    }
    if (filters?.hermanoId) {
        query = query.eq('id_usuario_intro', filters.hermanoId)
    }
    if (filters?.temaKey) {
        query = query.contains('meta_data', { tema_introduccion_alabanza: filters.temaKey })
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    const { data: rawData, error, count } = await query.range(from, to)

    if (error) {
        console.error('Error getAllTemasAlabanza:', error)
        return { error: error.message }
    }

    const cultoIds = (rawData || []).map((c: any) => c.id).filter(Boolean)
    const lecturasMap: Record<string, LecturaIntro> = {}

    if (cultoIds.length > 0) {
        const { data: lecturasData } = await supabase
            .from('lecturas_biblicas')
            .select('culto_id, libro, capitulo_inicio, versiculo_inicio, capitulo_fin, versiculo_fin')
            .in('culto_id', cultoIds)
            .eq('tipo_lectura', 'introduccion')

        lecturasData?.forEach((l: any) => {
            if (!lecturasMap[l.culto_id]) {
                lecturasMap[l.culto_id] = {
                    libro: l.libro,
                    capitulo_inicio: l.capitulo_inicio,
                    versiculo_inicio: l.versiculo_inicio,
                    capitulo_fin: l.capitulo_fin,
                    versiculo_fin: l.versiculo_fin
                }
            }
        })
    }

    const registros = (rawData || []).map((c: any) => {
        const tema = c.meta_data?.tema_introduccion_alabanza
        return {
            id: c.id,
            culto_id: c.id,
            fecha: c.fecha,
            hora_inicio: c.hora_inicio,
            tema_key: tema,
            tipo_culto: c.tipo_culto,
            usuario_intro: c.usuario_intro,
            lectura_intro: lecturasMap[c.id] ?? null
        }
    }).filter((r: { tema_key: string }) => r.tema_key) as TemaAlabanzaRegistro[]

    const totalCount = count ?? 0
    return {
        data: registros,
        count: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1
    }
}

/**
 * Obtener estadísticas de temas de alabanza
 */
export async function getTemasAlabanzaStats(filters?: {
    temaKey?: string
    hermanoId?: string
    startDate?: string
    endDate?: string
}): Promise<TemaAlabanzaStats> {
    noStore()
    const supabase = await createClient()

    const alabanzaId = await getAlabanzaTipoId(supabase)
    if (!alabanzaId) {
        return {
            totalUsos: 0,
            temaMasUsado: null,
            hermanoMasUsaTema: null,
            temasPorUso: [],
            hermanosPorTema: {}
        }
    }

    let query = supabase
        .from('cultos')
        .select('id, fecha, meta_data, id_usuario_intro, usuario_intro:profiles!id_usuario_intro(id, nombre, apellidos)')
        .eq('tipo_culto_id', alabanzaId)
        .not('meta_data->tema_introduccion_alabanza', 'is', null)

    if (filters?.startDate) query = query.gte('fecha', filters.startDate)
    if (filters?.endDate) query = query.lte('fecha', filters.endDate)
    if (filters?.hermanoId) query = query.eq('id_usuario_intro', filters.hermanoId)

    const { data: rawData, error } = await query

    if (error) {
        console.error('Error getTemasAlabanzaStats:', error)
        return {
            totalUsos: 0,
            temaMasUsado: null,
            hermanoMasUsaTema: null,
            temasPorUso: [],
            hermanosPorTema: {}
        }
    }

    let items = (rawData || []).map((c: any) => ({
        tema_key: c.meta_data?.tema_introduccion_alabanza,
        id_usuario_intro: c.id_usuario_intro,
        usuario_intro: c.usuario_intro
    })).filter((x: { tema_key: string }) => x.tema_key)

    if (filters?.temaKey) {
        items = items.filter((x: { tema_key: string }) => x.tema_key === filters.temaKey)
    }

    const totalUsos = items.length

    const temasCount = new Map<string, number>()
    const hermanosPorTemaMap = new Map<string, Map<string, { id: string; nombre: string; count: number }>>()

    items.forEach((item: { tema_key: string; id_usuario_intro: string; usuario_intro: { id: string; nombre: string; apellidos: string } | null }) => {
        temasCount.set(item.tema_key, (temasCount.get(item.tema_key) || 0) + 1)

        if (item.id_usuario_intro) {
            if (!hermanosPorTemaMap.has(item.tema_key)) {
                hermanosPorTemaMap.set(item.tema_key, new Map())
            }
            const map = hermanosPorTemaMap.get(item.tema_key)!
            const nombre = item.usuario_intro
                ? `${item.usuario_intro.nombre || ''} ${item.usuario_intro.apellidos || ''}`.trim() || 'Sin nombre'
                : 'Sin nombre'
            const entry = map.get(item.id_usuario_intro)
            if (entry) {
                entry.count++
            } else {
                map.set(item.id_usuario_intro, { id: item.id_usuario_intro, nombre, count: 1 })
            }
        }
    })

    const temasPorUso = Array.from(temasCount.entries())
        .map(([temaKey, count]) => ({ temaKey, count }))
        .sort((a, b) => b.count - a.count)

    const temaMasUsado = temasPorUso[0] || null

    let hermanoMasUsaTema: { hermanoId: string; hermanoNombre: string; temaKey: string; count: number } | null = null
    let maxCount = 0
    hermanosPorTemaMap.forEach((map, temaKey) => {
        map.forEach((v, hermanoId) => {
            if (v.count > maxCount) {
                maxCount = v.count
                hermanoMasUsaTema = { hermanoId, hermanoNombre: v.nombre, temaKey, count: v.count }
            }
        })
    })

    const hermanosPorTema: Record<string, { id: string; nombre: string; count: number }[]> = {}
    hermanosPorTemaMap.forEach((map, temaKey) => {
        hermanosPorTema[temaKey] = Array.from(map.values()).sort((a, b) => b.count - a.count)
    })

    return {
        totalUsos,
        temaMasUsado,
        hermanoMasUsaTema,
        temasPorUso,
        hermanosPorTema
    }
}

/**
 * Obtener lista de hermanos que han dado temas (para filtro)
 */
export async function getHermanosConTemas(): Promise<{ data: HermanosConTemas[] }> {
    noStore()
    const supabase = await createClient()

    const alabanzaId = await getAlabanzaTipoId(supabase)
    if (!alabanzaId) {
        return { data: [] }
    }

    const { data, error } = await supabase
        .from('cultos')
        .select('id_usuario_intro, usuario_intro:profiles!id_usuario_intro(id, nombre, apellidos)')
        .eq('tipo_culto_id', alabanzaId)
        .not('meta_data->tema_introduccion_alabanza', 'is', null)
        .not('id_usuario_intro', 'is', null)

    if (error) {
        return { data: [] }
    }

    const seen = new Map<string, HermanosConTemas>()
    data?.forEach((row: any) => {
        if (row.usuario_intro && row.id_usuario_intro && !seen.has(row.id_usuario_intro)) {
            seen.set(row.id_usuario_intro, {
                id: row.id_usuario_intro,
                nombre: row.usuario_intro.nombre || '',
                apellidos: row.usuario_intro.apellidos || ''
            })
        }
    })

    const result = Array.from(seen.values()).sort((a, b) =>
        `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`)
    )
    return { data: result }
}

/**
 * Obtener las claves de temas para filtros (traducidas en el cliente)
 */
export async function getTemasAlabanzaKeys(): Promise<TemaAlabanzaKey[]> {
    return [...TEMAS_ALABANZA_KEYS]
}
