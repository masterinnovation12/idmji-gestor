'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Himno, Coro, PlanHimnoCoro, ActionResponse } from '@/types/database'
import { LIMITES } from '@/lib/constants'
import { startOfWeek, endOfWeek, format } from 'date-fns'

/**
 * Obtener el puntero de la secuencia desde app_config
 * @param key Clave en app_config (ej: 'ultimo_coro_id_alabanza')
 */
export async function getSequencePointer(key: string): Promise<{ id: number, date: string }> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', key)
        .single()

    if (error || !data) {
        // Inicializar con el primer item disponible
        const table = key.includes('coro') ? 'coros' : 'himnos'
        const { data: firstItem } = await supabase
            .from(table)
            .select('id')
            .order('id', { ascending: true })
            .limit(1)
            .single()

        return { id: firstItem?.id || 0, date: '2000-01-01' }
    }

    const value = data.value as { id: number, date?: string }
    return { 
        id: value.id, 
        date: value.date || '2000-01-01' 
    }
}

/**
 * Actualizar el puntero de la secuencia en app_config
 * @param key Clave en app_config
 * @param itemId ID del himno o coro
 * @param date Fecha del culto (punto de verdad)
 * @param skipAutoFill Si es true, no dispara el auto-relleno
 */
export async function updateSequencePointer(key: string, itemId: number, date?: string, skipAutoFill: boolean = false): Promise<ActionResponse> {
    const supabase = await createClient()
    const { error } = await supabase
        .from('app_config')
        .upsert({
            key,
            value: { id: itemId, date: date || format(new Date(), 'yyyy-MM-dd') },
            description: `ID y fecha del último punto de verdad en la secuencia de ${key.includes('alabanza') ? 'Alabanza' : 'Enseñanza'}`
        }, { onConflict: 'key' })

    if (error) return { error: error.message }

    // Disparar auto-relleno inmediato de la semana afectada
    if (date && !skipAutoFill) {
        if (key.includes('alabanza')) {
            await autoFillAlabanzaSequence(new Date(date))
        } else {
            await autoFillEnsenanzaSequence(new Date(date))
        }
    }

    return { success: true }
}

/**
 * Obtener los siguientes N items secuenciales
 */
export async function getNextSequentialItems(table: 'himnos' | 'coros', lastId: number, count: number): Promise<(Himno | Coro)[]> {
    const supabase = await createClient()
    
    // 1. Intentar obtener los siguientes a partir de lastId
    const { data: nextItems } = await supabase
        .from(table)
        .select('*')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(count)

    let results = (nextItems || []) as (Himno | Coro)[]

    // 2. Si no hay suficientes, volver al principio (loop)
    if (results.length < count) {
        const remaining = count - results.length
        const { data: loopItems } = await supabase
            .from(table)
            .select('*')
            .order('id', { ascending: true })
            .limit(remaining)
        
        results = [...results, ...(loopItems || []) as (Himno | Coro)[]]
    }

    return results
}

/**
 * Auto-rellenar secuencia de Alabanza (4 coros)
 */
export async function autoFillAlabanzaSequence(targetDate?: Date): Promise<ActionResponse<{ count: number }>> {
    const supabase = await createClient()
    const baseDate = targetDate || new Date()
    const start = format(startOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const end = format(endOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const { data: cultos, error: cultosError } = await supabase
        .from('cultos')
        .select(`id, fecha, tipo_culto:culto_types!inner(nombre)`)
        .gte('fecha', start)
        .lte('fecha', end)
        .ilike('tipo_culto.nombre', '%Alabanza%')
        .order('fecha', { ascending: true })

    if (cultosError) return { error: cultosError.message }
    if (!cultos || cultos.length === 0) return { data: { count: 0 } }

    let totalAssigned = 0
    let pointer = await getSequencePointer('ultimo_coro_id_alabanza')
    const allInserts: any[] = []
    const cultosToClear: string[] = []

    const ALABANZA_COROS_COUNT = 4

    for (const culto of cultos) {
        if (culto.fecha < pointer.date) {
            const { data: lastCoro } = await supabase
                .from('plan_himnos_coros')
                .select('coro_id')
                .eq('culto_id', culto.id)
                .eq('tipo', 'coro')
                .order('orden', { ascending: false })
                .limit(1)
                .single()
            if (lastCoro) { pointer.id = lastCoro.coro_id; pointer.date = culto.fecha }
            continue
        }

        if (culto.fecha === pointer.date) {
            const { data: existingCoros } = await supabase
                .from('plan_himnos_coros')
                .select('coro_id, orden')
                .eq('culto_id', culto.id)
                .eq('tipo', 'coro')
                .order('orden', { ascending: true })

            const count = existingCoros?.length || 0
            if (count >= ALABANZA_COROS_COUNT) {
                const last = existingCoros![existingCoros!.length - 1]
                pointer.id = last.coro_id
                pointer.date = culto.fecha
                continue
            }

            const lastCoroId = existingCoros?.length ? existingCoros[existingCoros.length - 1].coro_id : pointer.id
            const toAdd = ALABANZA_COROS_COUNT - count
            const nextCoros = await getNextSequentialItems('coros', lastCoroId, toAdd)
            if (nextCoros.length === 0) continue

            const baseOrden = existingCoros?.length ? Math.max(...existingCoros.map(c => c.orden)) : 0
            nextCoros.forEach((coro, index) => {
                allInserts.push({ culto_id: culto.id, tipo: 'coro', coro_id: coro.id, orden: baseOrden + index + 1 })
            })

            totalAssigned++
            pointer.id = nextCoros[nextCoros.length - 1].id
            pointer.date = culto.fecha
            continue
        }

        const nextCoros = await getNextSequentialItems('coros', pointer.id, ALABANZA_COROS_COUNT)
        if (nextCoros.length === 0) continue

        cultosToClear.push(culto.id)
        nextCoros.forEach((coro, index) => {
            allInserts.push({ culto_id: culto.id, tipo: 'coro', coro_id: coro.id, orden: index + 1 })
        })

        totalAssigned++
        pointer.id = nextCoros[nextCoros.length - 1].id
        pointer.date = culto.fecha
    }

    if (cultosToClear.length > 0) {
        await supabase.from('plan_himnos_coros').delete().in('culto_id', cultosToClear).eq('tipo', 'coro')
    }
    if (allInserts.length > 0) {
        await supabase.from('plan_himnos_coros').insert(allInserts)
    }

    if (totalAssigned > 0) {
        await updateSequencePointer('ultimo_coro_id_alabanza', pointer.id, pointer.date, true)
        revalidatePath('/dashboard')
    }

    return { data: { count: totalAssigned } }
}

/**
 * Auto-rellenar secuencia de Enseñanza (3 himnos + 3 coros)
 */
export async function autoFillEnsenanzaSequence(targetDate?: Date): Promise<ActionResponse<{ count: number }>> {
    const supabase = await createClient()
    const baseDate = targetDate || new Date()
    const start = format(startOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const end = format(endOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const { data: cultos, error: cultosError } = await supabase
        .from('cultos')
        .select(`id, fecha, tipo_culto:culto_types!inner(nombre)`)
        .gte('fecha', start)
        .lte('fecha', end)
        .ilike('tipo_culto.nombre', '%Enseñanza%')
        .order('fecha', { ascending: true })

    if (cultosError) return { error: cultosError.message }
    if (!cultos || cultos.length === 0) return { data: { count: 0 } }

    let totalAssigned = 0
    let hPointer = await getSequencePointer('ultimo_himno_id_ensenanza')
    let cPointer = await getSequencePointer('ultimo_coro_id_ensenanza')
    
    const allInserts: any[] = []
    const cultosToClear: string[] = []

    for (const culto of cultos) {
        // Lógica de "Cadena de Verdad" para Enseñanza (Himnos y Coros)
        const isPastOrEqualH = culto.fecha <= hPointer.date
        const isPastOrEqualC = culto.fecha <= cPointer.date

        if (isPastOrEqualH || isPastOrEqualC) {
            // Actualizar punteros desde DB si existen
            const { data: plan } = await supabase
                .from('plan_himnos_coros')
                .select('tipo, himno_id, coro_id')
                .eq('culto_id', culto.id)
                .order('orden', { ascending: false })

            if (plan && plan.length > 0) {
                const lastHimno = plan.find(p => p.tipo === 'himno')
                const lastCoro = plan.find(p => p.tipo === 'coro')
                if (lastHimno && isPastOrEqualH) { hPointer.id = lastHimno.himno_id; hPointer.date = culto.fecha }
                if (lastCoro && isPastOrEqualC) { cPointer.id = lastCoro.coro_id; cPointer.date = culto.fecha }
            }
            if (isPastOrEqualH && isPastOrEqualC) continue
        }

        // Obtener los siguientes 3 de cada uno
        const nextHimnos = await getNextSequentialItems('himnos', hPointer.id, 3)
        const nextCoros = await getNextSequentialItems('coros', cPointer.id, 3)
        
        if (nextHimnos.length === 0 || nextCoros.length === 0) continue

        cultosToClear.push(culto.id)
        
        // Himnos (orden 1-3)
        nextHimnos.forEach((h, i) => {
            allInserts.push({ culto_id: culto.id, tipo: 'himno', himno_id: h.id, orden: i + 1 })
        })
        // Coros (orden 4-6)
        nextCoros.forEach((c, i) => {
            allInserts.push({ culto_id: culto.id, tipo: 'coro', coro_id: c.id, orden: i + 4 })
        })

        totalAssigned++
        hPointer.id = nextHimnos[nextHimnos.length - 1].id
        hPointer.date = culto.fecha
        cPointer.id = nextCoros[nextCoros.length - 1].id
        cPointer.date = culto.fecha
    }

    if (cultosToClear.length > 0) {
        await supabase.from('plan_himnos_coros').delete().in('culto_id', cultosToClear)
        if (allInserts.length > 0) await supabase.from('plan_himnos_coros').insert(allInserts)
    }

    if (totalAssigned > 0) {
        await updateSequencePointer('ultimo_himno_id_ensenanza', hPointer.id, hPointer.date, true)
        await updateSequencePointer('ultimo_coro_id_ensenanza', cPointer.id, cPointer.date, true)
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
    let searchQuery = supabase.from('himnos').select('*').limit(20)
    if (isNumber) searchQuery = searchQuery.eq('numero', parseInt(query))
    else searchQuery = searchQuery.ilike('titulo', `%${query}%`)
    const { data, error } = await searchQuery
    if (error) return { error: error.message }
    return { data: data as Himno[] }
}

/**
 * Buscar coros por número o título
 */
export async function searchCoros(query: string): Promise<ActionResponse<Coro[]>> {
    const supabase = await createClient()
    const isNumber = /^\d+$/.test(query)
    let searchQuery = supabase.from('coros').select('*').limit(20)
    if (isNumber) searchQuery = searchQuery.eq('numero', parseInt(query))
    else searchQuery = searchQuery.ilike('titulo', `%${query}%`)
    const { data, error } = await searchQuery
    if (error) return { error: error.message }
    return { data: data as Coro[] }
}

/**
 * Añadir himno o coro a un culto
 */
export async function addHimnoCoro(cultoId: string, tipo: 'himno' | 'coro', itemId: number, orden: number): Promise<ActionResponse> {
    const supabase = await createClient()
    const { data: existing } = await supabase.from('plan_himnos_coros').select('tipo').eq('culto_id', cultoId)
    const himnosCount = existing?.filter(e => e.tipo === 'himno').length || 0
    const corosCount = existing?.filter(e => e.tipo === 'coro').length || 0

    if (tipo === 'himno' && himnosCount >= LIMITES.MAX_HIMNOS_POR_CULTO) return { error: `Máximo ${LIMITES.MAX_HIMNOS_POR_CULTO} himnos permitidos` }
    if (tipo === 'coro' && corosCount >= LIMITES.MAX_COROS_POR_CULTO) return { error: `Máximo ${LIMITES.MAX_COROS_POR_CULTO} coros permitidos` }

    const { error } = await supabase.from('plan_himnos_coros').insert({
        culto_id: cultoId, tipo,
        himno_id: tipo === 'himno' ? itemId : null,
        coro_id: tipo === 'coro' ? itemId : null,
        orden,
    })
    if (error) return { error: error.message }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('movimientos').insert({ id_usuario: user.id, tipo: 'cambio_himnos_coros', descripcion: `Añadido ${tipo} al culto`, culto_id: cultoId })

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true }
}

/**
 * Eliminar himno o coro de un culto
 */
export async function removeHimnoCoro(planId: string, cultoId: string): Promise<ActionResponse> {
    const supabase = await createClient()
    const { error } = await supabase.from('plan_himnos_coros').delete().eq('id', planId)
    if (error) return { error: error.message }
    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true }
}

/**
 * Obtener himnos y coros de un culto
 */
export async function getHimnosCorosByCulto(cultoId: string): Promise<ActionResponse<PlanHimnoCoro[]>> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('plan_himnos_coros').select(`
            id, culto_id, tipo, orden,
            himno:himnos(id, numero, titulo, duracion_segundos),
            coro:coros(id, numero, titulo, duracion_segundos)
        `).eq('culto_id', cultoId).order('orden', { ascending: true })
    if (error) return { error: error.message }
    const mappedData = (data as any[])?.map(item => ({ ...item, item_id: item.tipo === 'himno' ? item.himno?.id : item.coro?.id }))
    return { data: mappedData as PlanHimnoCoro[] }
}

/**
 * Actualizar el orden de los himnos y coros de un culto
 */
export async function updateHimnosCorosOrder(cultoId: string, items: { id: string; orden: number }[]): Promise<ActionResponse> {
    const supabase = await createClient()
    for (const item of items) {
        const { error } = await supabase.from('plan_himnos_coros').update({ orden: item.orden }).eq('id', item.id).eq('culto_id', cultoId)
        if (error) return { error: error.message }
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('movimientos').insert({ id_usuario: user.id, tipo: 'cambio_himnos_coros', descripcion: 'Reordenado himnos y coros', culto_id: cultoId })
    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true }
}
