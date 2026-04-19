'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Himno, Coro, PlanHimnoCoro, ActionResponse } from '@/types/database'
import { LIMITES } from '@/lib/constants'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { pickLastCoroIdForSequence, pickLastHimnoCoroIdsForSequence } from '@/lib/utils/sequencePlanPick'
import {
    normalizeSequenceDate,
    isAlabanzaIncrementalCulto,
    isEnsenanzaIncrementalCulto,
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
    const pointer = await getSequencePointer('ultimo_coro_id_alabanza')
    const allInserts: any[] = []
    const cultosToClear: string[] = []

    const ALABANZA_COROS_COUNT = 4
    const targetFecha = format(baseDate, 'yyyy-MM-dd')

    for (const culto of cultos) {
        const cf = normalizeSequenceDate(culto.fecha)
        const pd = normalizeSequenceDate(pointer.date)

        if (respectTargetAsAnchor && cf < targetFecha) {
            continue
        }

        if (cf < pd) {
            const { data: lastCoro } = await supabase
                .from('plan_himnos_coros')
                .select('coro_id')
                .eq('culto_id', culto.id)
                .eq('tipo', 'coro')
                .order('orden', { ascending: false })
                .limit(1)
                .single()
            if (lastCoro) { pointer.id = lastCoro.coro_id; pointer.date = cf }
            continue
        }

        if (isAlabanzaIncrementalCulto(culto.fecha, pointer.date, targetFecha)) {
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
                pointer.date = cf
                continue
            }

            const lastCoroId = existingCoros?.length ? existingCoros[existingCoros.length - 1].coro_id : pointer.id
            const toAdd = ALABANZA_COROS_COUNT - count
            const nextCoros = existingCoros?.length
                ? await getNextSequentialItems('coros', lastCoroId, toAdd)
                : await getSequentialItemsFromAnchor('coros', pointer.id, toAdd)
            if (nextCoros.length === 0) continue

            const baseOrden = existingCoros?.length ? Math.max(...existingCoros.map(c => c.orden)) : 0
            nextCoros.forEach((coro, index) => {
                allInserts.push({ culto_id: culto.id, tipo: 'coro', coro_id: coro.id, orden: baseOrden + index + 1 })
            })

            totalAssigned++
            pointer.id = nextCoros[nextCoros.length - 1].id
            pointer.date = cf
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
        pointer.date = cf
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
 * @param onlyCategory Si se indica, solo completa esa categoría (cuando el usuario confirma tras añadir himno o coro)
 */
export async function autoFillEnsenanzaSequence(
    targetDate?: Date,
    onlyCategory?: 'himno' | 'coro',
    respectTargetAsAnchor: boolean = false
): Promise<ActionResponse<{ count: number }>> {
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
    const hPointer = await getSequencePointer('ultimo_himno_id_ensenanza')
    const cPointer = await getSequencePointer('ultimo_coro_id_ensenanza')
    
    const allInserts: any[] = []
    const cultosToClear: string[] = []

    const ENSENANZA_HIMNOS = 3
    const ENSENANZA_COROS = 3
    const targetFecha = format(baseDate, 'yyyy-MM-dd')

    for (const culto of cultos) {
        const cf = normalizeSequenceDate(culto.fecha)
        const hD = normalizeSequenceDate(hPointer.date)
        const cD = normalizeSequenceDate(cPointer.date)

        if (respectTargetAsAnchor && onlyCategory && cf < targetFecha) {
            continue
        }

        const isSameDay = isEnsenanzaIncrementalCulto(culto.fecha, hPointer.date, cPointer.date, targetFecha)

        // Cultos pasados: actualizar punteros desde DB
        if (cf < hD && cf < cD) {
            const { data: plan } = await supabase
                .from('plan_himnos_coros')
                .select('tipo, himno_id, coro_id')
                .eq('culto_id', culto.id)
                .order('orden', { ascending: false })

            if (plan && plan.length > 0) {
                const lastHimno = plan.find(p => p.tipo === 'himno')
                const lastCoro = plan.find(p => p.tipo === 'coro')
                if (lastHimno) { hPointer.id = lastHimno.himno_id; hPointer.date = cf }
                if (lastCoro) { cPointer.id = lastCoro.coro_id; cPointer.date = cf }
            }
            continue
        }

        // Mismo día: añadir solo la categoría que el usuario confirmó (himno o coro)
        if (isSameDay) {
            const { data: plan } = await supabase
                .from('plan_himnos_coros')
                .select('tipo, himno_id, coro_id, orden')
                .eq('culto_id', culto.id)
                .order('orden', { ascending: true })

            const existingHimnos = (plan || []).filter(p => p.tipo === 'himno')
            const existingCoros = (plan || []).filter(p => p.tipo === 'coro')
            let didAdd = false

            const shouldAddHimnos = (!onlyCategory || onlyCategory === 'himno') && existingHimnos.length < ENSENANZA_HIMNOS
            if (shouldAddHimnos) {
                const lastHimnoId = existingHimnos.length ? existingHimnos[existingHimnos.length - 1].himno_id : hPointer.id
                const toAdd = ENSENANZA_HIMNOS - existingHimnos.length
                const nextHimnos = existingHimnos.length
                    ? await getNextSequentialItems('himnos', lastHimnoId, toAdd)
                    : await getSequentialItemsFromAnchor('himnos', hPointer.id, toAdd)
                if (nextHimnos.length > 0) {
                    const baseOrden = existingHimnos.length ? Math.max(...existingHimnos.map(h => h.orden)) : 0
                    nextHimnos.forEach((h, i) => {
                        allInserts.push({ culto_id: culto.id, tipo: 'himno', himno_id: h.id, orden: baseOrden + i + 1 })
                    })
                    hPointer.id = nextHimnos[nextHimnos.length - 1].id
                    didAdd = true
                }
            } else if (existingHimnos.length > 0) {
                hPointer.id = existingHimnos[existingHimnos.length - 1].himno_id
            }

            const shouldAddCoros = (!onlyCategory || onlyCategory === 'coro') && existingCoros.length < ENSENANZA_COROS
            if (shouldAddCoros) {
                const lastCoroId = existingCoros.length ? existingCoros[existingCoros.length - 1].coro_id : cPointer.id
                const toAdd = ENSENANZA_COROS - existingCoros.length
                const nextCoros = existingCoros.length
                    ? await getNextSequentialItems('coros', lastCoroId, toAdd)
                    : await getSequentialItemsFromAnchor('coros', cPointer.id, toAdd)
                if (nextCoros.length > 0) {
                    const baseOrden = existingCoros.length ? Math.max(...existingCoros.map(c => c.orden)) : 4
                    nextCoros.forEach((c, i) => {
                        allInserts.push({ culto_id: culto.id, tipo: 'coro', coro_id: c.id, orden: baseOrden + i + 1 })
                    })
                    cPointer.id = nextCoros[nextCoros.length - 1].id
                    didAdd = true
                }
            } else if (existingCoros.length > 0) {
                cPointer.id = existingCoros[existingCoros.length - 1].coro_id
            }

            hPointer.date = cf
            cPointer.date = cf
            if (didAdd) totalAssigned++
            continue
        }

        // Futuros: reemplazar solo la categoría indicada (o ambas si no hay onlyCategory)
        const doHimnos = !onlyCategory || onlyCategory === 'himno'
        const doCoros = !onlyCategory || onlyCategory === 'coro'

        const nextHimnos = doHimnos ? await getNextSequentialItems('himnos', hPointer.id, ENSENANZA_HIMNOS) : []
        const nextCoros = doCoros ? await getNextSequentialItems('coros', cPointer.id, ENSENANZA_COROS) : []
        if ((doHimnos && nextHimnos.length === 0) || (doCoros && nextCoros.length === 0)) continue

        cultosToClear.push(culto.id)
        if (doHimnos && nextHimnos.length > 0) {
            nextHimnos.forEach((h, i) => {
                allInserts.push({ culto_id: culto.id, tipo: 'himno', himno_id: h.id, orden: i + 1 })
            })
            hPointer.id = nextHimnos[nextHimnos.length - 1].id
        }
        if (doCoros && nextCoros.length > 0) {
            nextCoros.forEach((c, i) => {
                allInserts.push({ culto_id: culto.id, tipo: 'coro', coro_id: c.id, orden: (doHimnos ? 4 : 1) + i })
            })
            cPointer.id = nextCoros[nextCoros.length - 1].id
        }

        totalAssigned++
        hPointer.date = cf
        cPointer.date = cf
    }

    if (cultosToClear.length > 0) {
        let deleteQuery = supabase.from('plan_himnos_coros').delete().in('culto_id', cultosToClear)
        if (onlyCategory) deleteQuery = deleteQuery.eq('tipo', onlyCategory)
        await deleteQuery
    }
    if (allInserts.length > 0) {
        await supabase.from('plan_himnos_coros').insert(allInserts)
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
