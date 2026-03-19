'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse } from '@/types/database'

export interface MovimientoData {
    id: string
    fecha_hora: string
    id_usuario: string | null
    tipo: string
    descripcion: string | null
    culto_id: string | null
    usuario?: {
        nombre: string
        apellidos: string
    }
    culto?: {
        id?: string
        fecha: string
    }
}

type RawRow = {
    id: string
    fecha_hora: string
    id_usuario: string | null
    tipo: string
    descripcion: string | null
    culto_id: string | null
    profiles: { nombre: string; apellidos: string } | { nombre: string; apellidos: string }[] | null
    cultos: { id?: string; fecha: string } | { id?: string; fecha: string }[] | null
}

function normalizeProfile(p: RawRow['profiles']): MovimientoData['usuario'] {
    if (!p) return undefined
    const obj = Array.isArray(p) ? p[0] : p
    if (!obj?.nombre || !obj?.apellidos) return undefined
    return { nombre: obj.nombre, apellidos: obj.apellidos }
}

function normalizeCulto(c: RawRow['cultos']): MovimientoData['culto'] {
    if (!c) return undefined
    const obj = Array.isArray(c) ? c[0] : c
    if (!obj?.fecha) return undefined
    return { id: obj.id, fecha: obj.fecha }
}

/** Obtiene IDs de usuarios que coinciden con la búsqueda por nombre/apellidos */
async function getMatchingUserIds(supabase: Awaited<ReturnType<typeof createClient>>, search: string): Promise<string[]> {
    const term = search.trim()
    if (term.length < 2) return []
    const { data } = await supabase
        .from('profiles')
        .select('id')
        .or(`nombre.ilike.%${term}%,apellidos.ilike.%${term}%`)
    return (data || []).map((r) => r.id)
}

export async function getMovimientos(
    page: number = 1,
    limit: number = 20,
    tipo?: string,
    search?: string,
    dateFrom?: string,
    dateTo?: string
): Promise<ActionResponse<{ data: MovimientoData[]; total: number }>> {
    try {
        const supabase = await createClient()
        const offset = (page - 1) * limit

        let query = supabase
            .from('movimientos')
            .select(
                `
                id,
                fecha_hora,
                id_usuario,
                tipo,
                descripcion,
                culto_id,
                profiles!movimientos_id_usuario_fkey(nombre, apellidos),
                cultos!movimientos_culto_id_fkey(id, fecha)
            `,
                { count: 'exact' }
            )

        if (tipo) query = query.eq('tipo', tipo)
        if (dateFrom) query = query.gte('fecha_hora', dateFrom)
        if (dateTo) query = query.lte('fecha_hora', `${dateTo}T23:59:59.999Z`)

        if (search && search.trim().length >= 2) {
            const term = search.trim()
            const userIds = await getMatchingUserIds(supabase, term)
            const conditions: string[] = [`descripcion.ilike.%${term}%`]
            if (userIds.length > 0) {
                conditions.push(`id_usuario.in.(${userIds.map((id) => `"${id}"`).join(',')})`)
            }
            query = query.or(conditions.join(','))
        }

        const { data, error, count } = await query
            .order('fecha_hora', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        const formattedData: MovimientoData[] = ((data || []) as RawRow[]).map((m) => ({
            id: m.id,
            fecha_hora: m.fecha_hora,
            id_usuario: m.id_usuario,
            tipo: m.tipo,
            descripcion: m.descripcion,
            culto_id: m.culto_id,
            usuario: normalizeProfile(m.profiles),
            culto: normalizeCulto(m.cultos)
        }))

        return {
            success: true,
            data: {
                data: formattedData,
                total: count || 0
            }
        }
    } catch (error) {
        console.error('Error fetching movimientos:', error)
        return { success: false, error: 'Error al cargar movimientos' }
    }
}

/** Obtiene todos los movimientos filtrados para exportar (máx 5000) */
export async function getMovimientosForExport(
    tipo?: string,
    search?: string,
    dateFrom?: string,
    dateTo?: string
): Promise<ActionResponse<MovimientoData[]>> {
    try {
        const result = await getMovimientos(1, 5000, tipo, search, dateFrom, dateTo)
        if (!result.success || !result.data) return { success: false, error: result.error || 'Error' }
        return { success: true, data: result.data.data }
    } catch (error) {
        console.error('Error exporting movimientos:', error)
        return { success: false, error: 'Error al exportar' }
    }
}

export async function getMovimientosTipos(): Promise<ActionResponse<string[]>> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('movimientos')
            .select('tipo')
            .order('tipo')

        if (error) throw error

        const tipos = [...new Set((data || []).map((m) => m.tipo))].filter(Boolean)

        return { success: true, data: tipos }
    } catch (error) {
        console.error('Error fetching tipos:', error)
        return { success: false, error: 'Error al cargar tipos' }
    }
}
