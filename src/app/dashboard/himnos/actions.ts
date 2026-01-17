'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Himno, Coro, PlanHimnoCoro, ActionResponse } from '@/types/database'
import { LIMITES } from '@/lib/constants'
import { startOfWeek, endOfWeek, format } from 'date-fns'

/**
 * Obtener el puntero de la secuencia de coros desde app_config
 */
export async function getSequencePointer(): Promise<number> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'ultimo_coro_id_alabanza')
        .single()

    if (error || !data) {
        // Si no existe, inicializar con el primer coro disponible
        const { data: firstCoro } = await supabase
            .from('coros')
            .select('id')
            .order('id', { ascending: true })
            .limit(1)
            .single()

        return firstCoro?.id || 0
    }

    return (data.value as { id: number }).id
}

/**
 * Actualizar el puntero de la secuencia de coros en app_config
 */
export async function updateSequencePointer(coroId: number): Promise<ActionResponse> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('app_config')
        .upsert({
            key: 'ultimo_coro_id_alabanza',
            value: { id: coroId },
            description: 'ID del último coro asignado en la secuencia de Alabanza'
        }, { onConflict: 'key' })

    if (error) return { error: error.message }
    return { success: true }
}

/**
 * Obtener los siguientes N coros secuenciales
 */
export async function getNextSequentialCoros(lastId: number, count: number): Promise<Coro[]> {
    const supabase = await createClient()
    
    // 1. Intentar obtener los siguientes a partir de lastId
    const { data: nextCoros } = await supabase
        .from('coros')
        .select('*')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(count)

    let results = (nextCoros || []) as Coro[]

    // 2. Si no hay suficientes, volver al principio (loop)
    if (results.length < count) {
        const remaining = count - results.length
        const { data: loopCoros } = await supabase
            .from('coros')
            .select('*')
            .order('id', { ascending: true })
            .limit(remaining)
        
        results = [...results, ...(loopCoros || []) as Coro[]]
    }

    return results
}

/**
 * Auto-rellenar secuencia de coros para cultos de Alabanza en un rango de fechas
 */
export async function autoFillAlabanzaSequence(): Promise<ActionResponse<{ count: number }>> {
    const supabase = await createClient()
    
    // Rango de la semana actual
    const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    // 1. Obtener cultos de Alabanza sin coros asignados
    const { data: cultos, error: cultosError } = await supabase
        .from('cultos')
        .select(`
            id,
            fecha,
            tipo_culto:culto_types!inner(nombre)
        `)
        .gte('fecha', start)
        .lte('fecha', end)
        .ilike('tipo_culto.nombre', '%Alabanza%')
        .order('fecha', { ascending: true })

    if (cultosError) return { error: cultosError.message }
    if (!cultos || cultos.length === 0) return { data: { count: 0 } }

    let totalAssigned = 0
    let currentPointer = await getSequencePointer()

    for (const culto of cultos) {
        // Verificar si ya tiene coros
        const { count: existingCount } = await supabase
            .from('plan_himnos_coros')
            .select('*', { count: 'exact', head: true })
            .eq('culto_id', culto.id)
            .eq('tipo', 'coro')

        if (existingCount && existingCount > 0) continue

        // Obtener los siguientes 4 coros
        const nextCoros = await getNextSequentialCoros(currentPointer, 4)
        if (nextCoros.length === 0) continue

        // Insertar en el plan
        const inserts = nextCoros.map((coro, index) => ({
            culto_id: culto.id,
            tipo: 'coro' as const,
            coro_id: coro.id,
            orden: index + 1
        }))

        const { error: insertError } = await supabase
            .from('plan_himnos_coros')
            .insert(inserts)

        if (!insertError) {
            totalAssigned++
            currentPointer = nextCoros[nextCoros.length - 1].id
        }
    }

    // Actualizar puntero final
    if (totalAssigned > 0) {
        await updateSequencePointer(currentPointer)
        revalidatePath('/dashboard')
    }

    return { data: { count: totalAssigned } }
}

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

    // Verificar límites (5 himnos + 5 coros)
    const { data: existing } = await supabase
        .from('plan_himnos_coros')
        .select('tipo')
        .eq('culto_id', cultoId)

    const himnosCount = existing?.filter(e => e.tipo === 'himno').length || 0
    const corosCount = existing?.filter(e => e.tipo === 'coro').length || 0

    if (tipo === 'himno' && himnosCount >= LIMITES.MAX_HIMNOS_POR_CULTO) {
        return { error: `Máximo ${LIMITES.MAX_HIMNOS_POR_CULTO} himnos permitidos` }
    }

    if (tipo === 'coro' && corosCount >= LIMITES.MAX_COROS_POR_CULTO) {
        return { error: `Máximo ${LIMITES.MAX_COROS_POR_CULTO} coros permitidos` }
    }

    const { error } = await supabase
        .from('plan_himnos_coros')
        .insert({
            culto_id: cultoId,
            tipo,
            himno_id: tipo === 'himno' ? itemId : null,
            coro_id: tipo === 'coro' ? itemId : null,
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
            id,
            culto_id,
            tipo,
            orden,
            himno:himnos(id, numero, titulo, duracion_segundos),
            coro:coros(id, numero, titulo, duracion_segundos)
        `)
        .eq('culto_id', cultoId)
        .order('orden', { ascending: true })

    if (error) {
        return { error: error.message }
    }

    interface PlanItemMap {
        tipo: 'himno' | 'coro';
        himno?: { id: number };
        coro?: { id: number };
    }

    // Mapear para mantener compatibilidad con la interfaz item_id
    const mappedData = (data as unknown as PlanItemMap[])?.map(item => ({
        ...item,
        item_id: item.tipo === 'himno' ? item.himno?.id : item.coro?.id
    }))

    return { data: mappedData as PlanHimnoCoro[] }
}

/**
 * Actualizar el orden de los himnos y coros de un culto
 */
export async function updateHimnosCorosOrder(
    cultoId: string,
    items: { id: string; orden: number }[]
): Promise<ActionResponse> {
    const supabase = await createClient()

    // Actualizar cada item con su nuevo orden
    for (const item of items) {
        const { error } = await supabase
            .from('plan_himnos_coros')
            .update({ orden: item.orden })
            .eq('id', item.id)
            .eq('culto_id', cultoId)

        if (error) {
            return { error: error.message }
        }
    }

    // Registrar en movimientos
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.from('movimientos').insert({
            id_usuario: user.id,
            tipo: 'cambio_himnos_coros',
            descripcion: 'Reordenado himnos y coros',
            culto_id: cultoId,
        })
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true }
}
