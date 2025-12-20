'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { eachDayOfInterval, endOfMonth, getDay, startOfMonth, format } from 'date-fns'

/**
 * Generar cultos para un mes según MVP
 * Considera festivos laborables para ajustar horarios
 */
export async function generateCultosForMonth(date: Date) {
    const supabase = await createClient()

    const start = startOfMonth(date)
    const end = endOfMonth(date)
    const days = eachDayOfInterval({ start, end })

    // Obtener tipos de culto
    const { data: types } = await supabase.from('culto_types').select('id, nombre')
    const typeMap = new Map(types?.map(t => [t.nombre, t.id]))

    // Obtener festivos del mes
    const { data: festivos } = await supabase
        .from('festivos')
        .select('fecha, tipo')
        .gte('fecha', format(start, 'yyyy-MM-dd'))
        .lte('fecha', format(end, 'yyyy-MM-dd'))

    const festivosMap = new Map(festivos?.map(f => [f.fecha, f.tipo]))

    // Obtener reglas de horarios desde BD
    const { data: schedules } = await supabase
        .from('culto_schedules')
        .select('*')

    const scheduleMap = new Map(schedules?.map(s => [s.day_of_week, s]))

    const cultosToInsert = []

    for (const day of days) {
        const dayOfWeek = getDay(day) // 0 = Domingo, 1 = Lunes, ...
        const fechaStr = format(day, 'yyyy-MM-dd')
        const festivoTipo = festivosMap.get(fechaStr)
        const schedule = scheduleMap.get(dayOfWeek)

        if (schedule) {
            let hora = schedule.default_time.slice(0, 5) // HH:mm
            let esLaborableFestivo = false

            // Aplicar regla de laborable festivo (ahora controlada por DB)
            if (schedule.affected_by_laborable_festivo && festivoTipo === 'laborable_festivo') {
                // Restar 1 hora simple: 19:00 -> 18:00
                const [h, m] = hora.split(':').map(Number)
                hora = `${h - 1}:${m.toString().padStart(2, '0')}`
                esLaborableFestivo = true
            }

            cultosToInsert.push({
                fecha: fechaStr,
                hora_inicio: hora,
                tipo_culto_id: schedule.tipo_culto_id,
                estado: 'planeado',
                es_festivo: festivoTipo !== undefined,
                es_laborable_festivo: esLaborableFestivo,
            })
        }
    }

    if (cultosToInsert.length > 0) {
        const { error } = await supabase.from('cultos').insert(cultosToInsert)
        if (error) {
            console.error('Error generating cultos:', error)
            return { error: error.message }
        }
    }

    revalidatePath('/dashboard/cultos')
    return { success: true, count: cultosToInsert.length }
}

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
 * Obtener cultos de un mes con detalles
 */
export async function getCultosForMonth(year: number, month: number) {
    const supabase = await createClient()

    const start = new Date(year, month, 1)
    const end = endOfMonth(start)

    const { data, error } = await supabase
        .from('cultos')
        .select(`
      *,
      tipo_culto:culto_types(nombre, color, tiene_ensenanza, tiene_testimonios, tiene_lectura_introduccion, tiene_lectura_finalizacion, tiene_himnos_y_coros),
      usuario_intro:profiles!id_usuario_intro(nombre, apellidos),
      usuario_finalizacion:profiles!id_usuario_finalizacion(nombre, apellidos),
      usuario_ensenanza:profiles!id_usuario_ensenanza(nombre, apellidos),
      usuario_testimonios:profiles!id_usuario_testimonios(nombre, apellidos)
    `)
        .gte('fecha', format(start, 'yyyy-MM-dd'))
        .lte('fecha', format(end, 'yyyy-MM-dd'))
        .order('fecha', { ascending: true })

    if (error) {
        return { error: error.message }
    }

    return { data }
}
