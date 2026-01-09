'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendNotificationToUser } from '@/app/actions/notifications'
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

                await sendNotificationToUser(
                    userId,
                    '¡Nueva Asignación!',
                    `${tipoLabel} - ${tipoCulto} del ${fechaFormateada} a las ${culto.hora_inicio}`,
                    `/dashboard/cultos/${cultoId}`
                )
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

    // 2. Mezclar con nuevo protocolo
    const newMeta = {
        ...currentMeta,
        protocolo: protocol
    }

    const { error } = await supabase
        .from('cultos')
        .update({ meta_data: newMeta })
        .eq('id', cultoId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true }
}
