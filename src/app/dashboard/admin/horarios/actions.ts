'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { logMovimiento } from '@/lib/audit/logMovimiento'
import type { ActionResponse, CultoType, Sede } from '@/types/database'

/**
 * Gestión de horarios de culto por sede (solo ADMIN) con propagación a los
 * cultos ya generados: crear un horario crea los cultos futuros que faltan,
 * cambiar el tipo/hora actualiza los cultos futuros planeados y eliminar un
 * horario puede retirar sus cultos futuros sin tocar el histórico.
 */

export interface HorarioRow {
    id: string
    sede_id: string
    day_of_week: number
    default_time: string
    tipo_culto_id: number
    affected_by_laborable_festivo: boolean
    tipo?: Pick<CultoType, 'nombre' | 'color' | 'tiene_ensenanza' | 'tiene_testimonios' | 'tiene_lectura_finalizacion'>
}

const horarioSchema = z.object({
    sedeId: z.string().uuid(),
    dayOfWeek: z.number().int().min(0).max(6),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    tipoCultoId: z.number().int(),
    affected: z.boolean(),
})

const DIAS_LARGO_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function hoyISO(): string {
    return new Date().toISOString().slice(0, 10)
}

/** Fechas futuras (>= hoy) que caen en `dayOfWeek`, hasta `hastaFecha` inclusive. */
function fechasFuturasDelDia(dayOfWeek: number, hastaFecha: string): string[] {
    const out: string[] = []
    const cursor = new Date()
    cursor.setHours(12, 0, 0, 0)
    while (cursor.getDay() !== dayOfWeek) cursor.setDate(cursor.getDate() + 1)
    for (;;) {
        const iso = cursor.toISOString().slice(0, 10)
        if (iso > hastaFecha) break
        out.push(iso)
        cursor.setDate(cursor.getDate() + 7)
    }
    return out
}

/** Sedes + tipos de culto para el editor. */
export async function getHorariosBootstrap(): Promise<
    ActionResponse<{ sedes: Pick<Sede, 'id' | 'nombre' | 'slug' | 'activo' | 'es_principal'>[]; tipos: CultoType[] }>
> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const [sedesRes, tiposRes] = await Promise.all([
        ctx.supabase
            .from('sedes')
            .select('id, nombre, slug, activo, es_principal')
            .order('es_principal', { ascending: false })
            .order('nombre'),
        ctx.supabase.from('culto_types').select('*').order('nombre'),
    ])

    if (sedesRes.error) return { success: false, error: sedesRes.error.message }
    if (tiposRes.error) return { success: false, error: tiposRes.error.message }

    return { success: true, data: { sedes: sedesRes.data ?? [], tipos: (tiposRes.data ?? []) as CultoType[] } }
}

/** Horarios de una sede con su tipo de culto. */
export async function getHorariosSede(sedeId: string): Promise<ActionResponse<HorarioRow[]>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data, error: qError } = await ctx.supabase
        .from('culto_schedules')
        .select('id, sede_id, day_of_week, default_time, tipo_culto_id, affected_by_laborable_festivo, tipo:culto_types(nombre, color, tiene_ensenanza, tiene_testimonios, tiene_lectura_finalizacion)')
        .eq('sede_id', sedeId)
        .order('day_of_week')
        .order('default_time')

    if (qError) return { success: false, error: qError.message }
    return { success: true, data: (data ?? []) as unknown as HorarioRow[] }
}

/** Horizonte de generación de la sede: última fecha con cultos ya creados. */
async function horizonteCultos(supabase: SessionSupabase, sedeId: string): Promise<string | null> {
    const { data } = await supabase
        .from('cultos')
        .select('fecha')
        .eq('sede_id', sedeId)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()
    return data?.fecha ?? null
}

type SessionSupabase = NonNullable<Awaited<ReturnType<typeof requireAdmin>>['ctx']>['supabase']

/** Festivos laborables futuros de la sede (regla "1 hora antes" de L-V). */
async function festivosLaborables(supabase: SessionSupabase, sedeId: string, desde: string, hasta: string): Promise<Set<string>> {
    const { data } = await supabase
        .from('festivos')
        .select('fecha')
        .eq('sede_id', sedeId)
        .eq('tipo', 'laborable_festivo')
        .gte('fecha', desde)
        .lte('fecha', hasta)
    return new Set((data ?? []).map(f => f.fecha as string))
}

function restarUnaHora(hora: string): string {
    const [h, m] = hora.split(':').map(Number)
    return `${String(h - 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Crea un horario y genera los cultos futuros que faltan dentro del horizonte
 * ya generado de la sede (mismas reglas que la generación mensual).
 */
export async function createHorario(input: {
    sedeId: string
    dayOfWeek: number
    time: string
    tipoCultoId: number
    affected: boolean
}): Promise<ActionResponse<{ cultosCreados: number }>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const parsed = horarioSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Datos inválidos' }
    const { sedeId, dayOfWeek, time, tipoCultoId, affected } = parsed.data

    const { error: insertError } = await ctx.supabase.from('culto_schedules').insert({
        sede_id: sedeId,
        day_of_week: dayOfWeek,
        default_time: time,
        tipo_culto_id: tipoCultoId,
        affected_by_laborable_festivo: affected,
    })
    if (insertError) {
        if (insertError.code === '23505') return { success: false, error: 'DUPLICADO' }
        return { success: false, error: insertError.message }
    }

    // Propagación: crear los cultos futuros del nuevo horario hasta el
    // horizonte que la sede ya tiene generado.
    let cultosCreados = 0
    const hoy = hoyISO()
    const horizonte = await horizonteCultos(ctx.supabase, sedeId)
    if (horizonte && horizonte >= hoy) {
        const fechas = fechasFuturasDelDia(dayOfWeek, horizonte)
        if (fechas.length > 0) {
            const { data: existentes } = await ctx.supabase
                .from('cultos')
                .select('fecha')
                .eq('sede_id', sedeId)
                .eq('hora_inicio', time)
                .in('fecha', fechas)
            const ocupadas = new Set((existentes ?? []).map(c => c.fecha as string))

            const laborables = affected && dayOfWeek >= 1 && dayOfWeek <= 5
                ? await festivosLaborables(ctx.supabase, sedeId, hoy, horizonte)
                : new Set<string>()

            const nuevos = fechas
                .filter(f => !ocupadas.has(f))
                .map(fecha => ({
                    fecha,
                    hora_inicio: laborables.has(fecha) ? restarUnaHora(time) : time,
                    tipo_culto_id: tipoCultoId,
                    estado: 'planeado',
                    es_laborable_festivo: laborables.has(fecha),
                    sede_id: sedeId,
                }))
            if (nuevos.length > 0) {
                const { error: cultosError } = await ctx.supabase.from('cultos').insert(nuevos)
                if (cultosError) return { success: false, error: cultosError.message }
                cultosCreados = nuevos.length
            }
        }
    }

    await logMovimiento(
        ctx.supabase,
        ctx.userId,
        'admin_horarios',
        `Horario ${DIAS_LARGO_ES[dayOfWeek]} ${time} creado (${cultosCreados} cultos generados)`,
        sedeId,
    )
    revalidatePath('/dashboard/admin/horarios')
    revalidatePath('/dashboard/cultos')
    return { success: true, data: { cultosCreados } }
}

/**
 * Actualiza un horario (hora / tipo / regla de festivo) y, si `propagar`,
 * aplica el cambio a los cultos futuros planeados de ese hueco. Al cambiar de
 * tipo se limpian las asignaciones de roles que el nuevo tipo no contempla
 * (p. ej. enseñanza → alabanza retira enseñanza y testimonios).
 */
export async function updateHorario(
    id: string,
    input: { time: string; tipoCultoId: number; affected: boolean },
    propagar: boolean,
): Promise<ActionResponse<{ cultosActualizados: number }>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data: actual } = await ctx.supabase
        .from('culto_schedules')
        .select('id, sede_id, day_of_week, default_time, tipo_culto_id')
        .eq('id', id)
        .maybeSingle()
    if (!actual) return { success: false, error: 'Horario no encontrado' }

    const parsed = horarioSchema.safeParse({
        sedeId: actual.sede_id,
        dayOfWeek: actual.day_of_week,
        time: input.time,
        tipoCultoId: input.tipoCultoId,
        affected: input.affected,
    })
    if (!parsed.success) return { success: false, error: 'Datos inválidos' }

    const { error: updateError } = await ctx.supabase
        .from('culto_schedules')
        .update({
            default_time: input.time,
            tipo_culto_id: input.tipoCultoId,
            affected_by_laborable_festivo: input.affected,
        })
        .eq('id', id)
    if (updateError) {
        if (updateError.code === '23505') return { success: false, error: 'DUPLICADO' }
        return { success: false, error: updateError.message }
    }

    let cultosActualizados = 0
    if (propagar) {
        const hoy = hoyISO()
        const horizonte = await horizonteCultos(ctx.supabase, actual.sede_id)
        if (horizonte && horizonte >= hoy) {
            const fechas = fechasFuturasDelDia(actual.day_of_week, horizonte)
            if (fechas.length > 0) {
                const horaVieja = (actual.default_time as string).slice(0, 5)

                const { data: tipoNuevo } = await ctx.supabase
                    .from('culto_types')
                    .select('tiene_ensenanza, tiene_testimonios, tiene_lectura_finalizacion')
                    .eq('id', input.tipoCultoId)
                    .single()

                const cambios: Record<string, unknown> = {
                    hora_inicio: input.time,
                    tipo_culto_id: input.tipoCultoId,
                }
                if (tipoNuevo && !tipoNuevo.tiene_ensenanza) cambios.id_usuario_ensenanza = null
                if (tipoNuevo && !tipoNuevo.tiene_testimonios) cambios.id_usuario_testimonios = null
                if (tipoNuevo && !tipoNuevo.tiene_lectura_finalizacion) cambios.id_usuario_finalizacion = null

                const { data: actualizados, error: cultosError } = await ctx.supabase
                    .from('cultos')
                    .update(cambios)
                    .eq('sede_id', actual.sede_id)
                    .eq('estado', 'planeado')
                    .eq('hora_inicio', horaVieja)
                    .gte('fecha', hoy)
                    .in('fecha', fechas)
                    .select('id')
                if (cultosError) return { success: false, error: cultosError.message }
                cultosActualizados = actualizados?.length ?? 0
            }
        }
    }

    await logMovimiento(
        ctx.supabase,
        ctx.userId,
        'admin_horarios',
        `Horario ${DIAS_LARGO_ES[actual.day_of_week]} ${(actual.default_time as string).slice(0, 5)} → ${input.time} actualizado (${cultosActualizados} cultos propagados)`,
        actual.sede_id,
    )
    revalidatePath('/dashboard/admin/horarios')
    revalidatePath('/dashboard/cultos')
    return { success: true, data: { cultosActualizados } }
}

/**
 * Elimina un horario y, opcionalmente, sus cultos futuros planeados.
 * El histórico (cultos realizados o pasados) nunca se toca.
 */
export async function deleteHorario(
    id: string,
    eliminarCultosFuturos: boolean,
): Promise<ActionResponse<{ cultosEliminados: number }>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data: actual } = await ctx.supabase
        .from('culto_schedules')
        .select('id, sede_id, day_of_week, default_time')
        .eq('id', id)
        .maybeSingle()
    if (!actual) return { success: false, error: 'Horario no encontrado' }

    const { error: deleteError } = await ctx.supabase.from('culto_schedules').delete().eq('id', id)
    if (deleteError) return { success: false, error: deleteError.message }

    let cultosEliminados = 0
    if (eliminarCultosFuturos) {
        const hoy = hoyISO()
        const horizonte = await horizonteCultos(ctx.supabase, actual.sede_id)
        if (horizonte && horizonte >= hoy) {
            const fechas = fechasFuturasDelDia(actual.day_of_week, horizonte)
            if (fechas.length > 0) {
                const { data: eliminados, error: cultosError } = await ctx.supabase
                    .from('cultos')
                    .delete()
                    .eq('sede_id', actual.sede_id)
                    .eq('estado', 'planeado')
                    .eq('hora_inicio', (actual.default_time as string).slice(0, 5))
                    .gte('fecha', hoy)
                    .in('fecha', fechas)
                    .select('id')
                if (cultosError) return { success: false, error: cultosError.message }
                cultosEliminados = eliminados?.length ?? 0
            }
        }
    }

    await logMovimiento(
        ctx.supabase,
        ctx.userId,
        'admin_horarios',
        `Horario ${DIAS_LARGO_ES[actual.day_of_week]} ${(actual.default_time as string).slice(0, 5)} eliminado (${cultosEliminados} cultos retirados)`,
        actual.sede_id,
    )
    revalidatePath('/dashboard/admin/horarios')
    revalidatePath('/dashboard/cultos')
    return { success: true, data: { cultosEliminados } }
}
