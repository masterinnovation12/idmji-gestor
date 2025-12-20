'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse } from '@/types/database'

export interface UserData {
    id: string
    nombre: string
    apellidos: string
    email: string | null
    rol: string
    pulpito: boolean
    avatar_url: string | null
    created_at: string
}

export async function getUsers(): Promise<ActionResponse<UserData[]>> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('nombre')

        if (error) throw error

        return { success: true, data: data || [] }
    } catch (error) {
        console.error('Error fetching users:', error)
        return { success: false, error: 'Error al cargar usuarios' }
    }
}

export async function updateUser(
    userId: string,
    updates: { rol?: string, pulpito?: boolean }
): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()

        // Verify current user is admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('rol')
            .eq('id', user.id)
            .single()

        if (profile?.rol !== 'ADMIN') {
            return { success: false, error: 'No autorizado' }
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('Error updating user:', error)
        return { success: false, error: 'Error al actualizar usuario' }
    }
}

export async function getUserCounts(): Promise<ActionResponse<{ total: number, pulpito: number, admins: number }>> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('profiles')
            .select('rol, pulpito')

        if (error) throw error

        const total = data?.length || 0
        const pulpito = data?.filter(u => u.pulpito).length || 0
        const admins = data?.filter(u => u.rol === 'ADMIN').length || 0

        return { success: true, data: { total, pulpito, admins } }
    } catch (error) {
        console.error('Error fetching counts:', error)
        return { success: false, error: 'Error al cargar conteos' }
    }
}
