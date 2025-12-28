/**
 * Cultos Server Actions - IDMJI Gestor de Púlpito
 * 
 * Acciones para la gestión de cultos: generación mensual, creación manual
 * y obtención de datos con filtros.
 * 
 * @author Antigravity AI
 * @date 2024-12-25
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { eachDayOfInterval, endOfMonth, getDay, startOfMonth, format, isWithinInterval } from 'date-fns'

/**
 * Genera automáticamente los cultos de un mes basándose en el calendario semanal
 * y las reglas de festivos laborables.
 * 
 * @param date Fecha del mes a generar
 */
export async function generateCultosForMonth(date: Date) {
    const supabase = await createClient()

    const start = startOfMonth(date)
    const end = endOfMonth(date)
    const days = eachDayOfInterval({ start, end })

    // 1. Verificar si ya existen cultos generados para este mes para evitar duplicados
    const { data: existingCultos } = await supabase
        .from('cultos')
        .select('id')
        .gte('fecha', format(start, 'yyyy-MM-dd'))
        .lte('fecha', format(end, 'yyyy-MM-dd'))
        .limit(1)

    if (existingCultos && existingCultos.length > 0) {
        return { success: false, error: 'Ya existen cultos generados para este mes.' }
    }

    // 2. Obtener configuraciones base
    const { data: schedules } = await supabase.from('culto_schedules').select('*')
    const scheduleMap = new Map(schedules?.map(s => [s.day_of_week, s]))

    // 3. Obtener festivos del mes para aplicar regla de horario (1h antes)
    const { data: festivos } = await supabase
        .from('festivos')
        .select('fecha, tipo')
        .gte('fecha', format(start, 'yyyy-MM-dd'))
        .lte('fecha', format(end, 'yyyy-MM-dd'))
        .eq('tipo', 'laborable_festivo')

    const laborablesFestivos = new Set(festivos?.map(f => f.fecha))

    const cultosToInsert = []

    for (const day of days) {
        const dayOfWeek = getDay(day) // 0=Dom, 1=Lun...
        const fechaStr = format(day, 'yyyy-MM-dd')
        const schedule = scheduleMap.get(dayOfWeek as any)

        if (schedule) {
            let horaInicio = schedule.default_time.slice(0, 5) // HH:mm
            let esLaborableFestivo = false

            // Regla MVP 5.2: Solo de lunes a viernes si es laborable_festivo, restar 1 hora
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && laborablesFestivos.has(fechaStr) && schedule.affected_by_laborable_festivo) {
                const [h, m] = horaInicio.split(':').map(Number)
                horaInicio = `${String(h - 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`
                esLaborableFestivo = true
            }

            cultosToInsert.push({
                fecha: fechaStr,
                hora_inicio: horaInicio,
                tipo_culto_id: schedule.tipo_culto_id,
                estado: 'planeado',
                es_laborable_festivo: esLaborableFestivo
            })
        }
    }

    if (cultosToInsert.length > 0) {
        const { error } = await supabase.from('cultos').insert(cultosToInsert)
        if (error) {
            console.error('Error al insertar cultos:', error)
            return { success: false, error: 'Error al guardar los cultos en la base de datos.' }
        }
    }

    revalidatePath('/dashboard/cultos')
    return { success: true, count: cultosToInsert.length }
}

/**
 * Genera todos los cultos para un año entero (ej: 2026)
 * Se usa para pre-generar datos por defecto.
 */
export async function generateYear(year: number) {
    let totals = 0
    const errors = []

    for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1) // 1st of each month
        const result = await generateCultosForMonth(date)
        if (result.error) {
            errors.push({ month: month + 1, error: result.error })
        } else if (result.count) {
            totals += result.count
        }
    }

    revalidatePath('/dashboard/cultos')
    return { success: errors.length === 0, total: totals, errors }
}

/**
 * Crea un culto de forma manual (excepción)
 */
export async function createCulto(formData: FormData) {
    const supabase = await createClient()

    const fecha = formData.get('fecha') as string
    const hora = formData.get('hora') as string
    const tipoId = formData.get('tipo_id')

    const { error } = await supabase.from('cultos').insert({
        fecha,
        hora_inicio: hora,
        tipo_culto_id: tipoId,
        estado: 'planeado'
    })

    if (error) return { error: error.message }

    revalidatePath('/dashboard/cultos')
    return { success: true }
}

/**
 * Obtiene los cultos de un mes con toda la información de asignaciones relacionada
 */
export async function getCultosForMonth(year: number, month: number) {
    const supabase = await createClient()

    const start = format(new Date(year, month, 1), 'yyyy-MM-dd')
    const end = format(endOfMonth(new Date(year, month, 1)), 'yyyy-MM-dd')

    const { data, error } = await supabase
        .from('cultos')
        .select(`
            *,
            tipo_culto:culto_types(*),
            usuario_intro:profiles!id_usuario_intro(nombre, apellidos),
            usuario_finalizacion:profiles!id_usuario_finalizacion(nombre, apellidos),
            usuario_ensenanza:profiles!id_usuario_ensenanza(nombre, apellidos),
            usuario_testimonios:profiles!id_usuario_testimonios(nombre, apellidos)
        `)
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha', { ascending: true })

    if (error) {
        console.error('Error fetching cultos:', error)
        return { error: error.message }
    }

    return { data }
}

/**
 * Obtiene las asignaciones específicas de un usuario en un rango de fechas.
 */
export async function getUserAssignments(userId: string, startStr: string, endStr: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('cultos')
        .select(`
            *,
            tipo_culto:culto_types(nombre, color)
        `)
        .gte('fecha', startStr)
        .lte('fecha', endStr)
        .or(`id_usuario_intro.eq.${userId},id_usuario_ensenanza.eq.${userId},id_usuario_finalizacion.eq.${userId},id_usuario_testimonios.eq.${userId}`)
        .order('fecha', { ascending: true })

    if (error) {
        console.error('Error fetching user assignments:', error)
        return { error: error.message }
    }

    return { data }
}
