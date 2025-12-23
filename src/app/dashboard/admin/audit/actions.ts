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
        fecha: string
    }
}

export async function getMovimientos(
    page: number = 1,
    limit: number = 20,
    tipo?: string
): Promise<ActionResponse<{ data: MovimientoData[], total: number }>> {
    try {
        const supabase = await createClient()
        const offset = (page - 1) * limit

        let query = supabase
            .from('movimientos')
            .select(`
                id,
                fecha_hora,
                id_usuario,
                tipo,
                descripcion,
                culto_id,
                profiles!movimientos_id_usuario_fkey(nombre, apellidos),
                cultos!movimientos_culto_id_fkey(fecha)
            `, { count: 'exact' })
            .order('fecha_hora', { ascending: false })
            .range(offset, offset + limit - 1)

        if (tipo) {
            query = query.eq('tipo', tipo)
        }

        const { data, error, count } = await query

        if (error) throw error

        const formattedData: MovimientoData[] = (data || []).map((m: any) => ({
            id: m.id,
            fecha_hora: m.fecha_hora,
            id_usuario: m.id_usuario,
            tipo: m.tipo,
            descripcion: m.descripcion,
            culto_id: m.culto_id,
            usuario: m.profiles ? {
                nombre: m.profiles.nombre,
                apellidos: m.profiles.apellidos
            } : undefined,
            culto: m.cultos ? {
                fecha: m.cultos.fecha
            } : undefined
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

export async function getMovimientosTipos(): Promise<ActionResponse<string[]>> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('movimientos')
            .select('tipo')
            .order('tipo')

        if (error) throw error

        const tipos = [...new Set((data || []).map(m => m.tipo))].filter(Boolean)

        return { success: true, data: tipos }
    } catch (error) {
        console.error('Error fetching tipos:', error)
        return { success: false, error: 'Error al cargar tipos' }
    }
}
