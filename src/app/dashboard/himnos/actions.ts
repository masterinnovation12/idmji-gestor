'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Himno, Coro, PlanHimnoCoro, ActionResponse } from '@/types/database'

/**
 * Buscar himnos por número o título
 */
export async function searchHimnos(query: string): Promise<ActionResponse<Himno[]>> {
    const supabase = await createClient()

    const isNumber = /^\d+$/.test(query)

    let searchQuery = supabase
        .from('himnos')
        .select('*')
        .limit(20)

    if (isNumber) {
        searchQuery = searchQuery.eq('numero', parseInt(query))
    } else {
        searchQuery = searchQuery.ilike('titulo', `%${query}%`)
    }

    const { data, error } = await searchQuery

    if (error) {
        return { error: error.message }
    }

    return { data: data as Himno[] }
}

/**
 * Buscar coros por número o título
 */
export async function searchCoros(query: string): Promise<ActionResponse<Coro[]>> {
    const supabase = await createClient()

    const isNumber = /^\d+$/.test(query)

    let searchQuery = supabase
        .from('coros')
        .select('*')
        .limit(20)

    if (isNumber) {
        searchQuery = searchQuery.eq('numero', parseInt(query))
    } else {
        searchQuery = searchQuery.ilike('titulo', `%${query}%`)
    }

    const { data, error } = await searchQuery

    if (error) {
        return { error: error.message }
    }

    return { data: data as Coro[] }
}

/**
 * Añadir himno o coro a un culto
 */
export async function addHimnoCoro(
    cultoId: string,
    tipo: 'himno' | 'coro',
    itemId: number,
    orden: number
): Promise<ActionResponse> {
    const supabase = await createClient()

    // Verificar límites (3 himnos + 3 coros)
    const { data: existing } = await supabase
        .from('plan_himnos_coros')
        .select('tipo')
        .eq('culto_id', cultoId)

    const himnosCount = existing?.filter(e => e.tipo === 'himno').length || 0
    const corosCount = existing?.filter(e => e.tipo === 'coro').length || 0

    if (tipo === 'himno' && himnosCount >= 3) {
        return { error: 'Máximo 3 himnos permitidos' }
    }

    if (tipo === 'coro' && corosCount >= 3) {
        return { error: 'Máximo 3 coros permitidos' }
    }

    const { error } = await supabase
        .from('plan_himnos_coros')
        .insert({
            culto_id: cultoId,
            tipo,
            item_id: itemId,
            orden,
        })

    if (error) {
        return { error: error.message }
    }

    // Registrar en movimientos
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.from('movimientos').insert({
            id_usuario: user.id,
            tipo: 'cambio_himnos_coros',
            descripcion: `Añadido ${tipo} al culto`,
            culto_id: cultoId,
        })
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true }
}

/**
 * Eliminar himno o coro de un culto
 */
export async function removeHimnoCoro(planId: string, cultoId: string): Promise<ActionResponse> {
    const supabase = await createClient()

    const { error } = await supabase
        .from('plan_himnos_coros')
        .delete()
        .eq('id', planId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true }
}

/**
 * Obtener himnos y coros de un culto
 */
export async function getHimnosCorosByCulto(cultoId: string): Promise<ActionResponse<PlanHimnoCoro[]>> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('plan_himnos_coros')
        .select(`
      *,
      himno:himnos(numero, titulo, duracion_segundos),
      coro:coros(numero, titulo, duracion_segundos)
    `)
        .eq('culto_id', cultoId)
        .order('orden', { ascending: true })

    if (error) {
        return { error: error.message }
    }

    // Cast data because nested relations might not match strict Partial<Himno> perfectly without recursion
    // but PlanHimnoCoro has optional himno/coro matching this structure.
    return { data: data as PlanHimnoCoro[] }
}
