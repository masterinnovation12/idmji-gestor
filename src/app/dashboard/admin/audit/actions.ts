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
    tipo?: string,
    search?: string
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

        if (tipo) {
            query = query.eq('tipo', tipo)
        }

        if (search) {
            query = query.ilike('descripcion', `%${search}%`)
        }

        const { data, error, count } = await query
            .order('fecha_hora', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        const formattedData: MovimientoData[] = (data as unknown as { id: string; fecha_hora: string; id_usuario: string | null; tipo: string; descripcion: string | null; culto_id: string | null; profiles: { nombre: string; apellidos: string }[] | null; cultos: { fecha: string }[] | null }[] || []).map((m) => ({
            id: m.id,
            fecha_hora: m.fecha_hora,
            id_usuario: m.id_usuario,
            tipo: m.tipo,
            descripcion: m.descripcion,
            culto_id: m.culto_id,
            usuario: m.profiles && m.profiles[0] ? {
                nombre: m.profiles[0].nombre,
                apellidos: m.profiles[0].apellidos
            } : undefined,
            culto: m.cultos && m.cultos[0] ? {
                fecha: m.cultos[0].fecha
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

        // Assuming initialTipos is defined elsewhere or this is a placeholder for a different logic
        // The original patch had `const [tipos] = useState<string[]>(initialTipos).map(m => m.tipo))].filter(Boolean)`
        // which is syntactically incorrect and misuses useState.
        // Reverting to the original logic for extracting unique types, as useState is not applicable here.
        const tipos = [...new Set((data || []).map(m => m.tipo))].filter(Boolean)

        return { success: true, data: tipos }
    } catch (error) {
        console.error('Error fetching tipos:', error)
        return { success: false, error: 'Error al cargar tipos' }
    }
}
