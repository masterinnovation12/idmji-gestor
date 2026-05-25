'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Himno, Coro, PlanHimnoCoro, ActionResponse } from '@/types/database'
import { LIMITES } from '@/lib/constants'
import { format } from 'date-fns'
import { pickLastCoroIdForSequence, pickLastHimnoCoroIdsForSequence } from '@/lib/utils/sequencePlanPick'
import {
    normalizeSequenceDate,
} from '@/lib/utils/sequenceAutofillDate'

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
        date: normalizeSequenceDate(value.date) 
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
    const storedDate = date ? normalizeSequenceDate(date) : format(new Date(), 'yyyy-MM-dd')
    const { error } = await supabase
        .from('app_config')
        .upsert({
            key,
            value: { id: itemId, date: storedDate },
            description: `ID y fecha del último punto de verdad en la secuencia de ${key.includes('alabanza') ? 'Alabanza' : 'Enseñanza'}`
        }, { onConflict: 'key' })

    if (error) return { error: error.message }

    // Disparar auto-relleno inmediato de la semana afectada
    if (date && !skipAutoFill) {
        if (key.includes('alabanza')) {
            await autoFillAlabanzaSequence(new Date(storedDate))
        } else {
            const onlyCategory = key.includes('himno') ? 'himno' as const : key.includes('coro') ? 'coro' as const : undefined
            await autoFillEnsenanzaSequence(new Date(storedDate), onlyCategory)
        }
    }

    return { success: true }
}

/**
 * Tras confirmar "actualizar secuencia" en el culto: guarda el puntero global, borra solo la parte
 * del plan afectada (himnos O coros en Enseñanza) y rellena esa categoría desde la secuencia.
 * Así no se regeneran himnos al confirmar solo coros (y viceversa). Alabanza: solo coros, borra todo el plan del culto.
 * Solo ADMIN.
 */
export async function replaceCultoPlanAfterSequenceConfirm(
    cultoId: string,
    key: string,
    itemId: number,
    cultoFecha: string,
    tipoCultoNombre: string
): Promise<ActionResponse> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
    if (profile?.rol !== 'ADMIN') {
        return { error: 'Solo administradores pueden actualizar la secuencia' }
    }

    const storedFecha = normalizeSequenceDate(cultoFecha)
    const pointerRes = await updateSequencePointer(key, itemId, storedFecha, true)
    if (pointerRes.error) return pointerRes

    const t = (tipoCultoNombre || '').toLowerCase()
    const isEns = t.includes('enseñanza') || t.includes('ensenanza')
    const onlyEnsCategory: 'himno' | 'coro' | undefined =
        key === 'ultimo_himno_id_ensenanza' ? 'himno' : key === 'ultimo_coro_id_ensenanza' ? 'coro' : undefined

    let deleteQuery = supabase.from('plan_himnos_coros').delete().eq('culto_id', cultoId)
    if (isEns && onlyEnsCategory) {
        deleteQuery = deleteQuery.eq('tipo', onlyEnsCategory)
    }
    const { error: delError } = await deleteQuery
    if (delError) return { error: delError.message }

    if (t.includes('alabanza')) {
        const r = await autoFillAlabanzaSequence(new Date(storedFecha), true)
        if (r.error) return { error: r.error }
    } else if (isEns) {
        const r = await autoFillEnsenanzaSequence(new Date(storedFecha), onlyEnsCategory, true)
        if (r.error) return { error: r.error }
    } else {
        return { error: 'Solo aplica a cultos de Alabanza o Enseñanza' }
    }

    await supabase.from('movimientos').insert({
        id_usuario: user.id,
        tipo: 'cambio_himnos_coros',
        descripcion: isEns && onlyEnsCategory
            ? `Secuencia Enseñanza (${onlyEnsCategory === 'himno' ? 'himnos' : 'coros'}): lista del culto sustituida por la secuencia automática`
            : 'Secuencia global actualizada: lista del culto sustituida por la secuencia automática',
        culto_id: cultoId,
    })
    revalidatePath(`/dashboard/cultos/${cultoId}`)
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Fija los punteros globales de secuencia a partir del plan ya guardado en este culto
 * (sin tener que añadir un himno/coro nuevo). Solo ADMIN.
 * Enseñanza: actualiza himno + coro y luego un autofill completo de la semana.
 * Alabanza: actualiza solo el último coro y dispara autofill de Alabanza.
 */
export async function syncSequenceFromCultoPlan(
    cultoId: string,
    cultoFecha: string,
    tipoCultoNombre: string
): Promise<ActionResponse> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single()
    if (profile?.rol !== 'ADMIN') {
        return { error: 'Solo administradores pueden fijar la secuencia global desde el culto' }
    }

    const t = (tipoCultoNombre || '').toLowerCase()
    const isAlabanza = t.includes('alabanza')
    const isEnsenanza = t.includes('enseñanza') || t.includes('ensenanza')
    if (!isAlabanza && !isEnsenanza) {
        return { error: 'Solo aplica a cultos de Alabanza o Enseñanza' }
    }

    const { data: rows, error } = await supabase
        .from('plan_himnos_coros')
        .select('tipo, orden, himno_id, coro_id')
        .eq('culto_id', cultoId)
        .order('orden', { ascending: true })

    if (error) return { error: error.message }
    if (!rows?.length) return { error: 'No hay himnos ni coros en este culto' }

    const plan = rows as Array<{ tipo: 'himno' | 'coro'; orden: number; himno_id: number | null; coro_id: number | null }>

    if (isAlabanza) {
        const lastCoroId = pickLastCoroIdForSequence(plan)
        if (lastCoroId == null) {
            return { error: 'Añade al menos un coro para fijar la secuencia de Alabanza' }
        }
        const r = await updateSequencePointer('ultimo_coro_id_alabanza', lastCoroId, cultoFecha, false)
        if (r.error) return r
        await supabase.from('movimientos').insert({
            id_usuario: user.id,
            tipo: 'cambio_himnos_coros',
            descripcion: 'Secuencia Alabanza fijada desde plan del culto',
            culto_id: cultoId,
        })
        revalidatePath(`/dashboard/cultos/${cultoId}`)
        return { success: true }
    }

    const { lastHimnoId, lastCoroId } = pickLastHimnoCoroIdsForSequence(plan)
    if (lastHimnoId == null || lastCoroId == null) {
        return { error: 'Para Enseñanza hace falta al menos un himno y un coro en este culto' }
    }

    const r1 = await updateSequencePointer('ultimo_himno_id_ensenanza', lastHimnoId, cultoFecha, true)
    if (r1.error) return r1
    const r2 = await updateSequencePointer('ultimo_coro_id_ensenanza', lastCoroId, cultoFecha, true)
    if (r2.error) return r2

    await autoFillEnsenanzaSequence(new Date(cultoFecha))

    await supabase.from('movimientos').insert({
        id_usuario: user.id,
        tipo: 'cambio_himnos_coros',
        descripcion: 'Secuencia Enseñanza fijada desde plan del culto (himnos+coros)',
        culto_id: cultoId,
    })
    revalidatePath(`/dashboard/cultos/${cultoId}`)
    revalidatePath('/dashboard')
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
 * `count` ítems en orden de id empezando en `anchorId` (incluido).
 * El puntero de secuencia es el himno/coro que el usuario eligió; debe salir en la lista, no saltarse.
 */
export async function getSequentialItemsFromAnchor(
    table: 'himnos' | 'coros',
    anchorId: number,
    count: number
): Promise<(Himno | Coro)[]> {
    if (count <= 0) return []
    const supabase = await createClient()
    const { data: anchor } = await supabase.from(table).select('*').eq('id', anchorId).single()
    if (!anchor) {
        return getNextSequentialItems(table, anchorId, count)
    }
    if (count === 1) return [anchor as Himno | Coro]
    const rest = await getNextSequentialItems(table, anchorId, count - 1)
    return [anchor as Himno | Coro, ...rest]
}

/**
 * Auto-rellenar secuencia de Alabanza (4 coros)
 */
export async function autoFillAlabanzaSequence(
    targetDate?: Date,
    respectTargetAsAnchor: boolean = false
): Promise<ActionResponse<{ count: number }>> {
    // Deprecated/Disabled: El autofill automático de secuencia ya no se utiliza
    return { data: { count: 0 } }
}


/**
 * Auto-rellenar secuencia de Enseñanza (3 himnos + 3 coros)
 * @param onlyCategory Si se indica, solo completa esa categoría (cuando el usuario confirma tras añadir himno o coro)
 */
export async function autoFillEnsenanzaSequence(
    targetDate?: Date,
    onlyCategory?: 'himno' | 'coro',
    respectTargetAsAnchor: boolean = false
): Promise<ActionResponse<{ count: number }>> {
    // Deprecated/Disabled: El autofill automático de secuencia ya no se utiliza
    return { data: { count: 0 } }
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
    const mappedData = (data as unknown as Array<{
        id: string;
        culto_id: string;
        tipo: 'himno' | 'coro';
        orden: number;
        himno?: { id: number; numero: number; titulo: string; duracion_segundos: number | null } | null;
        coro?: { id: number; numero: number; titulo: string; duracion_segundos: number | null } | null;
    }>)?.map(item => ({ ...item, item_id: item.tipo === 'himno' ? item.himno?.id : item.coro?.id }))
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
