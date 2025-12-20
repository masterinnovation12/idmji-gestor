'use server'

import { createClient } from '@/lib/supabase/server'
import { UserRole } from '@/types/database'

export interface HermanoData {
    id: string
    nombre: string | null
    apellidos: string | null
    email: string
    avatar_url: string | null
    rol: UserRole
    pulpito: boolean
    created_at: string
}

/**
 * Obtener todos los hermanos (usuarios con pulpito activo)
 */
export async function getHermanos(search?: string): Promise<{ success: boolean; data?: HermanoData[]; error?: string }> {
    const supabase = await createClient()

    let query = supabase
        .from('profiles')
        .select('id, nombre, apellidos, email, avatar_url, rol, pulpito, created_at')
        .eq('pulpito', true)
        .order('nombre', { ascending: true })

    if (search) {
        query = query.or(`nombre.ilike.%${search}%,apellidos.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true, data: data as HermanoData[] }
}

/**
 * Obtener estadísticas de hermanos
 */
export async function getHermanosStats() {
    const supabase = await createClient()

    const { count: totalPulpito } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('pulpito', true)

    const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

    return {
        pulpito: totalPulpito || 0,
        total: totalUsers || 0
    }
}
