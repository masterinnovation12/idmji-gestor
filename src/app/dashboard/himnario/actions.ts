'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse, Himno, Coro } from '@/types/database'

export async function getHimnos(search?: string): Promise<ActionResponse<Himno[]>> {
    try {
        const supabase = await createClient()

        let query = supabase
            .from('himnos')
            .select('*')
            .order('numero')

        if (search) {
            query = query.or(`titulo.ilike.%${search}%,numero.eq.${parseInt(search) || 0}`)
        }

        const { data, error } = await query

        if (error) throw error

        return { success: true, data: data as Himno[] || [] }
    } catch (error) {
        console.error('Error fetching himnos:', error)
        return { success: false, error: 'Error al cargar himnos' }
    }
}

export async function getCoros(search?: string): Promise<ActionResponse<Coro[]>> {
    try {
        const supabase = await createClient()

        let query = supabase
            .from('coros')
            .select('*')
            .order('numero')

        if (search) {
            query = query.or(`titulo.ilike.%${search}%,numero.eq.${parseInt(search) || 0}`)
        }

        const { data, error } = await query

        if (error) throw error

        return { success: true, data: data as Coro[] || [] }
    } catch (error) {
        console.error('Error fetching coros:', error)
        return { success: false, error: 'Error al cargar coros' }
    }
}

export async function getHimnaryCounts(): Promise<ActionResponse<{ himnos: number, coros: number }>> {
    try {
        const supabase = await createClient()

        const [himnosResult, corosResult] = await Promise.all([
            supabase.from('himnos').select('id', { count: 'exact', head: true }),
            supabase.from('coros').select('id', { count: 'exact', head: true })
        ])

        return {
            success: true,
            data: {
                himnos: himnosResult.count || 0,
                coros: corosResult.count || 0
            }
        }
    } catch (error) {
        console.error('Error fetching counts:', error)
        return { success: false, error: 'Error al cargar conteos' }
    }
}
