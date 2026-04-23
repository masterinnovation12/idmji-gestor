'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendNotificationToUser } from '@/app/actions/notifications'
import { formatHoraNotificacion } from '@/lib/format-hora-notificacion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Mapeo de tipos de asignación a nombres legibles
 */
const tipoAsignacionLabels: Record<string, string> = {
    introduccion: 'Introducción',
    finalizacion: 'Finalización',
    ensenanza: 'Enseñanza',
    testimonios: 'Testimonios',
}

/**
 * Actualizar asignación de hermano en un culto
 * Tipos de asignación según tipo de culto:
 * - Estudio Bíblico: introduccion, finalizacion
 * - Alabanza: introduccion, finalizacion
 * - Enseñanza: introduccion, ensenanza, testimonios (NO finalizacion)
 */
export async function updateAssignment(
    cultoId: string,
    tipoAsignacion: 'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios',
    userId: string | null
) {
    const supabase = await createClient()

    const fieldMap = {
        introduccion: 'id_usuario_intro',
        finalizacion: 'id_usuario_finalizacion',
        ensenanza: 'id_usuario_ensenanza',
        testimonios: 'id_usuario_testimonios',
    }

    const field = fieldMap[tipoAsignacion]

    const { error } = await supabase
        .from('cultos')
        .update({ [field]: userId })
        .eq('id', cultoId)

    if (error) {
        return { error: error.message }
    }

    // Registrar en movimientos
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.from('movimientos').insert({
            id_usuario: user.id,
            tipo: 'cambio_asignacion',
            descripcion: `Cambio de ${tipoAsignacion} en culto`,
            culto_id: cultoId,
        })
    }

    // ========== ENVIAR NOTIFICACIÓN AL USUARIO ASIGNADO ==========
    if (userId) {
        try {
            // Obtener datos del culto para el mensaje
            const { data: culto } = await supabase
                .from('cultos')
                .select('fecha, hora_inicio, tipo_culto:culto_types(nombre)')
                .eq('id', cultoId)
                .single()

            if (culto) {
                const fechaFormateada = format(new Date(culto.fecha), "EEEE d 'de' MMMM", { locale: es })
                const tipoCulto = (culto.tipo_culto as unknown as { nombre: string })?.nombre || 'Culto'
                const tipoLabel = tipoAsignacionLabels[tipoAsignacion] || tipoAsignacion

                const notifResult = await sendNotificationToUser(
                    userId,
                    '¡Nueva Asignación!',
                    `${tipoLabel} - ${tipoCulto} del ${fechaFormateada} a las ${formatHoraNotificacion(culto.hora_inicio)}`,
                    `/dashboard/cultos/${cultoId}`
                )
                if (!notifResult.success) {
                    console.error('Notificación de asignación no enviada:', notifResult.error, { userId })
                }
            }
        } catch (notifError) {
            // No bloquear si falla la notificación
            console.error('Error enviando notificación de asignación:', notifError)
        }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true }
}

/**
 * Toggle del estado festivo laborable con ajuste automático de horario
 */
export async function toggleFestivo(cultoId: string, currentStatus: boolean, currentHora: string) {
    const supabase = await createClient()

    // 1. Obtener la fecha del culto
    const { data: culto } = await supabase.from('cultos').select('fecha').eq('id', cultoId).single()
    if (!culto) return { error: 'Culto no encontrado' }

    // Calcular nueva hora: -1h si pasa a festivo, +1h si vuelve a normal
    const [h, m] = currentHora.split(':').map(Number)
    const newH = currentStatus ? (h + 1) % 24 : (h - 1 + 24) % 24
    const newHora = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    // 2. Actualizar el Culto
    const { error } = await supabase
        .from('cultos')
        .update({
            es_laborable_festivo: !currentStatus,
            hora_inicio: newHora
        })
        .eq('id', cultoId)

    if (error) {
        return { error: error.message }
    }

    // 3. Sincronizar con tabla 'festivos'
    if (!currentStatus) {
        // Se está MARCANDO como festivo -> Crear entrada en festivos si no existe
        const { count } = await supabase
            .from('festivos')
            .select('*', { count: 'exact', head: true })
            .eq('fecha', culto.fecha)

        if (count === 0) {
            await supabase.from('festivos').insert({
                fecha: culto.fecha,
                tipo: 'laborable_festivo',
                descripcion: 'Festivo Laborable (Manual desde Culto)',
            })
        }
    } else {
        // Se está DESMARCANDO -> Borrar entrada en festivos (solo si es del tipo manual o general)
        // Eliminamos cualquiera que coincida con la fecha para mantener consistencia simple
        await supabase
            .from('festivos')
            .delete()
            .eq('fecha', culto.fecha)
    }

    // Registrar en movimientos
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.from('movimientos').insert({
            id_usuario: user.id,
            tipo: 'cambio_festivo',
            descripcion: `Cambio de estado festivo en culto. Nueva hora: ${newHora}`,
            culto_id: cultoId,
        })
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    revalidatePath('/dashboard/cultos')
    revalidatePath('/dashboard/festivos')
    return { success: true }
}

/**
 * Buscar hermanos con pulpito = true para asignaciones
 */
export async function searchProfiles(query: string = '') {
    const supabase = await createClient()

    let dbQuery = supabase
        .from('profiles')
        .select('id, nombre, apellidos, avatar_url, pulpito')
        .eq('pulpito', true)
        .order('nombre', { ascending: true })

    if (query) {
        dbQuery = dbQuery.or(`nombre.ilike.%${query}%,apellidos.ilike.%${query}%`)
    }

    const { data, error } = await dbQuery.limit(20)

    if (error) {
        return { error: error.message }
    }

    return { data }
}

/**
 * Obtener detalles completos de un culto
 */
export async function getCultoDetails(cultoId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('cultos')
        .select(`
      *,
      tipo_culto:culto_types(*),
      usuario_intro:profiles!id_usuario_intro(id, nombre, apellidos, avatar_url),
      usuario_finalizacion:profiles!id_usuario_finalizacion(id, nombre, apellidos, avatar_url),
      usuario_ensenanza:profiles!id_usuario_ensenanza(id, nombre, apellidos, avatar_url),
      usuario_testimonios:profiles!id_usuario_testimonios(id, nombre, apellidos, avatar_url)
    `)
        .eq('id', cultoId)
        .single()

    if (error) {
        return { error: error.message }
    }

    return { data }
}

/**
 * Actualizar protocolo del estudio bíblico (metadata)
 */
export async function updateCultoProtocol(
    cultoId: string,
    protocol: { oracion_inicio: boolean; congregacion_pie: boolean }
) {
    const supabase = await createClient()

    // 1. Obtener metadata actual para no sobrescribir otros campos
    const { data: culto } = await supabase
        .from('cultos')
        .select('meta_data')
        .eq('id', cultoId)
        .single()

    const currentMeta = (culto?.meta_data as Record<string, unknown>) || {}

    // 2. Mezclar con nuevo protocolo y marcar como definido
    const newMeta = {
        ...currentMeta,
        protocolo: protocol,
        protocolo_definido: true
    }

    const { error } = await supabase
        .from('cultos')
        .update({ meta_data: newMeta })
        .eq('id', cultoId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Resetear protocolo del estudio bíblico a estado "Por definir"
 */
export async function resetCultoProtocol(cultoId: string) {
    const supabase = await createClient()

    const { data: culto } = await supabase
        .from('cultos')
        .select('meta_data')
        .eq('id', cultoId)
        .single()

    const currentMeta = (culto?.meta_data as Record<string, unknown>) || {}
    const { protocolo, protocolo_definido, ...rest } = currentMeta

    const newMeta = {
        ...rest,
        protocolo_definido: false
    }

    const { error } = await supabase
        .from('cultos')
        .update({ meta_data: newMeta })
        .eq('id', cultoId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Actualizar inicio anticipado del estudio bíblico (metadata)
 * Permite indicar que el culto comienza antes de la hora programada
 */
export async function updateInicioAnticipado(
    cultoId: string,
    config: { activo: boolean; minutos: number; observaciones?: string }
) {
    const supabase = await createClient()

    // 1. Obtener metadata actual para no sobrescribir otros campos
    const { data: culto } = await supabase
        .from('cultos')
        .select('meta_data')
        .eq('id', cultoId)
        .single()

    const currentMeta = (culto?.meta_data as Record<string, unknown>) || {}

    // 2. Mezclar con nuevo inicio_anticipado y marcar como definido
    const newMeta = {
        ...currentMeta,
        inicio_anticipado: {
            activo: config.activo,
            minutos: config.minutos,
            observaciones: config.observaciones || ''
        },
        inicio_anticipado_definido: true
    }

    const { error } = await supabase
        .from('cultos')
        .update({ meta_data: newMeta })
        .eq('id', cultoId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Resetear inicio anticipado a estado "Por definir"
 */
export async function resetInicioAnticipado(cultoId: string) {
    const supabase = await createClient()

    const { data: culto } = await supabase
        .from('cultos')
        .select('meta_data')
        .eq('id', cultoId)
        .single()

    const currentMeta = (culto?.meta_data as Record<string, unknown>) || {}
    const { inicio_anticipado, inicio_anticipado_definido, ...rest } = currentMeta

    const newMeta = {
        ...rest,
        inicio_anticipado_definido: false
    }

    const { error } = await supabase
        .from('cultos')
        .update({ meta_data: newMeta })
        .eq('id', cultoId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Actualizar tema de introducción para cultos de Alabanza (metadata)
 */
export async function updateTemaIntroduccionAlabanza(
    cultoId: string,
    temaKey: string | null
) {
    const supabase = await createClient()

    const { data: culto } = await supabase
        .from('cultos')
        .select('meta_data')
        .eq('id', cultoId)
        .single()

    const currentMeta = (culto?.meta_data as Record<string, unknown>) || {}

    const newMeta = temaKey === null
        ? (() => {
            const { tema_introduccion_alabanza: _, ...rest } = currentMeta
            return rest
        })()
        : { ...currentMeta, tema_introduccion_alabanza: temaKey }

    const { error } = await supabase
        .from('cultos')
        .update({ meta_data: newMeta })
        .eq('id', cultoId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    revalidatePath('/dashboard')
    return { success: true }
}

/**
 * Actualizar observaciones del culto (metadata)
 * Disponible para TODOS los tipos de culto
 */
export async function updateCultoObservaciones(
    cultoId: string,
    observaciones: string
) {
    const supabase = await createClient()

    // 1. Obtener metadata actual para no sobrescribir otros campos
    const { data: culto } = await supabase
        .from('cultos')
        .select('meta_data')
        .eq('id', cultoId)
        .single()

    const currentMeta = (culto?.meta_data as Record<string, unknown>) || {}

    // 2. Mezclar con nuevas observaciones
    const newMeta = {
        ...currentMeta,
        observaciones: observaciones
    }

    const { error } = await supabase
        .from('cultos')
        .update({ meta_data: newMeta })
        .eq('id', cultoId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    revalidatePath('/dashboard')
    return { success: true }
}

interface CultoDraftPayload {
    cultoId: string
    assignments: Partial<Record<'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios', string | null>>
    observaciones: string
    temaIntroduccionAlabanza: string | null
    protocolo: { oracion_inicio: boolean; congregacion_pie: boolean } | null
    protocoloDefinido: boolean
    inicioAnticipado: { activo: boolean; minutos: number; observaciones?: string } | null
    inicioAnticipadoDefinido: boolean
    esLaborableFestivo: boolean
    horaInicio: string
    himnosCoros?: Array<{
        tipo: 'himno' | 'coro'
        item_id: number
        orden: number
    }>
    lecturas?: Array<{
        tipo_lectura: 'introduccion' | 'finalizacion'
        libro: string
        capitulo_inicio: number
        versiculo_inicio: number
        capitulo_fin: number
        versiculo_fin: number
        id_usuario_lector: string
        es_repetida?: boolean
        lectura_original_id?: string | null
    }>
}

export async function saveCultoDraft(payload: CultoDraftPayload) {
    const supabase = await createClient()
    const { cultoId } = payload
    const { data: cultoActual, error: cultoError } = await supabase
        .from('cultos')
        .select('meta_data, id_usuario_intro, id_usuario_finalizacion, id_usuario_ensenanza, id_usuario_testimonios')
        .eq('id', cultoId)
        .single()

    if (cultoError || !cultoActual) {
        return { success: false, error: cultoError?.message || 'Culto no encontrado' }
    }

    const currentMeta = (cultoActual.meta_data as Record<string, unknown>) || {}
    const nextMeta: Record<string, unknown> = {
        ...currentMeta,
        observaciones: payload.observaciones ?? '',
    }

    if (payload.temaIntroduccionAlabanza) {
        nextMeta.tema_introduccion_alabanza = payload.temaIntroduccionAlabanza
    } else {
        delete nextMeta.tema_introduccion_alabanza
    }

    if (payload.protocoloDefinido && payload.protocolo) {
        nextMeta.protocolo = payload.protocolo
        nextMeta.protocolo_definido = true
    } else {
        delete nextMeta.protocolo
        nextMeta.protocolo_definido = false
    }

    if (payload.inicioAnticipadoDefinido && payload.inicioAnticipado) {
        nextMeta.inicio_anticipado = payload.inicioAnticipado
        nextMeta.inicio_anticipado_definido = true
    } else {
        delete nextMeta.inicio_anticipado
        nextMeta.inicio_anticipado_definido = false
    }

    const updateData = {
        id_usuario_intro: payload.assignments.introduccion ?? cultoActual.id_usuario_intro ?? null,
        id_usuario_finalizacion: payload.assignments.finalizacion ?? cultoActual.id_usuario_finalizacion ?? null,
        id_usuario_ensenanza: payload.assignments.ensenanza ?? cultoActual.id_usuario_ensenanza ?? null,
        id_usuario_testimonios: payload.assignments.testimonios ?? cultoActual.id_usuario_testimonios ?? null,
        es_laborable_festivo: payload.esLaborableFestivo,
        hora_inicio: payload.horaInicio,
        meta_data: nextMeta,
    }

    const { error: updateError } = await supabase
        .from('cultos')
        .update(updateData)
        .eq('id', cultoId)

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    if (payload.himnosCoros) {
        const { error: deletePlanError } = await supabase
            .from('plan_himnos_coros')
            .delete()
            .eq('culto_id', cultoId)
        if (deletePlanError) {
            return { success: false, error: deletePlanError.message }
        }

        if (payload.himnosCoros.length > 0) {
            const planRows = payload.himnosCoros.map((item) => ({
                culto_id: cultoId,
                tipo: item.tipo,
                himno_id: item.tipo === 'himno' ? item.item_id : null,
                coro_id: item.tipo === 'coro' ? item.item_id : null,
                orden: item.orden,
            }))
            const { error: insertPlanError } = await supabase.from('plan_himnos_coros').insert(planRows)
            if (insertPlanError) {
                return { success: false, error: insertPlanError.message }
            }
        }
    }

    if (payload.lecturas) {
        const { error: deleteLecturasError } = await supabase
            .from('lecturas_biblicas')
            .delete()
            .eq('culto_id', cultoId)
        if (deleteLecturasError) {
            return { success: false, error: deleteLecturasError.message }
        }

        if (payload.lecturas.length > 0) {
            const lecturaRows = payload.lecturas.map((l) => ({
                culto_id: cultoId,
                tipo_lectura: l.tipo_lectura,
                libro: l.libro,
                capitulo_inicio: l.capitulo_inicio,
                versiculo_inicio: l.versiculo_inicio,
                capitulo_fin: l.capitulo_fin,
                versiculo_fin: l.versiculo_fin,
                id_usuario_lector: l.id_usuario_lector,
                es_repetida: l.es_repetida ?? false,
                lectura_original_id: l.lectura_original_id ?? null,
            }))
            const { error: insertLecturasError } = await supabase.from('lecturas_biblicas').insert(lecturaRows)
            if (insertLecturasError) {
                return { success: false, error: insertLecturasError.message }
            }
        }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/cultos')
    return { success: true }
}
