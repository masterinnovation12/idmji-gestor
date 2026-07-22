'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveSedeIdForCurrentUser } from '@/lib/sede/activeSede'
import { UserRole } from '@/types/database'

export interface HermanoData {
    id: string
    nombre: string | null
    apellidos: string | null
    email: string
    email_contacto: string | null
    telefono: string | null
    avatar_url: string | null
    rol: UserRole
    pulpito: boolean
    created_at: string
}

/**
 * Obtener todos los hermanos (usuarios con pulpito activo)
 */
export async function getHermanos(search?: string, role?: string): Promise<{ success: boolean; data?: HermanoData[]; error?: string }> {
    const supabase = await createClient()
    // El ADMIN ve todas las sedes por RLS: acotar SIEMPRE a la sede activa para
    // que el directorio de hermanos muestre solo la sede elegida en el sidebar.
    const sedeId = await getActiveSedeIdForCurrentUser()

    let query = supabase
        .from('profiles')
        .select('id, nombre, apellidos, email, email_contacto, telefono, avatar_url, rol, pulpito, created_at')
        .order('nombre', { ascending: true })
    if (sedeId) query = query.eq('sede_id', sedeId)

    // Por defecto, en el directorio de hermanos solemos ver a los que tienen acceso al púlpito
    // pero permitimos filtrar si se desea en el futuro.
    if (!role || role === 'ALL') {
        // No aplicamos filtro de rol
    } else {
        query = query.eq('rol', role)
    }

    if (search) {
        query = query.or(`nombre.ilike.%${search}%,apellidos.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching hermanos:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: data as HermanoData[] }
}

/**
 * Obtener estadísticas de hermanos
 */
export async function getHermanosStats() {
    const supabase = await createClient()
    const sedeId = await getActiveSedeIdForCurrentUser()

    let pulpitoQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('pulpito', true)
    if (sedeId) pulpitoQuery = pulpitoQuery.eq('sede_id', sedeId)

    let totalQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
    if (sedeId) totalQuery = totalQuery.eq('sede_id', sedeId)

    const [{ count: totalPulpito }, { count: totalUsers }] = await Promise.all([
        pulpitoQuery,
        totalQuery,
    ])

    return {
        pulpito: totalPulpito || 0,
        total: totalUsers || 0
    }
}
