/**
 * Núcleo de generación del plano (Labor ofrenda), sin auth ni revalidate.
 *
 * Vive fuera de `planoGenerateActions.ts` («use server» solo admite exports
 * async) para que la misma lógica pueda ejecutarse desde un script de QA
 * contra la BD real sin reimplementarla — un simulador paralelo acabaría
 * divergiendo del código que corre en producción.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanoRol } from './planoTypes'
import {
    asignarPlanoServicio,
    construirHistorialParaServicio,
    type AsignarPlanoServicioOpts,
    type PlanoHistorialUso,
    type PlanoParejaEngine,
    type PlanoPersonaEngine,
    validarPoolSuficiente,
} from '@/lib/utils/planoEngine'
import type { DiaTipo } from '@/lib/utils/ofrendaEngine'
import { readPlanoPersonaRow } from './planoPersonaDb'
import {
    PLANO_HISTORIAL_DESDE,
    aplicarAsignacionesARolesSesion,
    clonarRolesPorTurno,
    construirRolesPorTurno,
    type PlanoRoleCounts,
    type PlanoTurnoHistorial,
} from './planoHistorial'

export type PlanoGenerateScope = 'day' | 'week' | 'month'
export type PlanoGenerateMode = 'generar' | 'regenerar' | 'rellenar'

export interface PlanoGenerateOptions {
    anio: number
    mes: number
    alcance: PlanoGenerateScope
    semanaIso?: number
    servicioId?: string
    modo: PlanoGenerateMode
}

export type PlanoGenerateResult =
    | { ok: true; asignados: number }
    | { ok: false; error: string }

async function loadPersonasEngine(
    supabase: SupabaseClient,
    sedeId: string | null,
): Promise<PlanoPersonaEngine[]> {
    let query = supabase.from('ofrenda_plano_personas').select('*')
    if (sedeId) query = query.eq('sede_id', sedeId)
    const { data } = await query
    return (data ?? []).map(row => {
        const p = readPlanoPersonaRow(row)
        return {
            id: p.id,
            nombre: p.nombre,
            activo: p.activo,
            capacidad: p.capacidad,
            puede_jueves: p.puede_jueves,
            puede_domingo_manana: p.puede_domingo_manana,
            puede_domingo_tarde: p.puede_domingo_tarde,
            genero: p.genero,
            prioridad_ofrendario: p.prioridad_ofrendario,
        }
    })
}

async function loadParejasEngine(
    supabase: SupabaseClient,
    sedeId: string | null,
): Promise<PlanoParejaEngine[]> {
    let query = supabase.from('ofrenda_plano_parejas').select('mujer_persona_id, hombre_persona_id')
    if (sedeId) query = query.eq('sede_id', sedeId)
    const { data } = await query
    return (data ?? []).map(r => ({
        mujerId: r.mujer_persona_id as string,
        hombreId: r.hombre_persona_id as string,
    }))
}

function sacosForDia(
    plan: { sacos_jueves: number; sacos_domingo: number; sacos_domingo_tarde: number },
    diaTipo: DiaTipo,
): number {
    if (diaTipo === 'jueves') return plan.sacos_jueves
    if (diaTipo === 'domingo') return plan.sacos_domingo
    return plan.sacos_domingo_tarde
}

/**
 * Carga histórico O/A por turno (jueves / domingo M / domingo T) desde
 * PLANO_HISTORIAL_DESDE. La UI Personas sigue usando el total global.
 */
async function cargarRolesHistoricoPorTurno(
    supabase: SupabaseClient,
    sedeId: string | null,
): Promise<Map<PlanoTurnoHistorial, Map<string, PlanoRoleCounts>>> {
    let svcQuery = supabase
        .from('ofrenda_servicios')
        .select('id, dia_tipo, plan:ofrenda_planes!inner(sede_id)')
        .gte('fecha', PLANO_HISTORIAL_DESDE)
    if (sedeId) svcQuery = svcQuery.eq('plan.sede_id', sedeId)
    const [{ data: svcRows }, { data: asig }] = await Promise.all([
        svcQuery,
        supabase.from('ofrenda_plano_asignaciones').select('persona_id, rol, servicio_id'),
    ])
    return construirRolesPorTurno(asig ?? [], svcRows ?? [])
}

/** Desplaza una fecha 'YYYY-MM-DD' en días (UTC). */
function fechaMasDias(fecha: string, dias: number): string {
    const d = new Date(`${fecha}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + dias)
    return d.toISOString().slice(0, 10)
}

/**
 * Construye la memoria de rotación de un servicio: histórico O/A del **mismo
 * turno** + hasta 3 servicios vecinos ±3 (mismo dia_tipo) + cultos de la misma
 * semana en otros turnos (±3 días). Los vecinos del turno aportan recencia y
 * repetición de pares; los de la misma semana penalizan salir dos veces en la
 * misma semana; los roles O/A equilibran solo dentro del turno.
 *
 * El más reciente de los servicios anteriores del turno se marca aparte
 * (`servicioAnteriorId`): es el que el motor veta en la capa 1, para que un
 * domingo mañana no repita a la gente del domingo mañana pasado.
 */
async function historialDesdeVecinos(
    supabase: SupabaseClient,
    servicio: { fecha: string; dia_tipo: string },
    rolesAcumulado: ReadonlyMap<string, PlanoRoleCounts>,
    sedeId: string | null,
): Promise<PlanoHistorialUso> {
    const desdeSemana = fechaMasDias(servicio.fecha, -3)
    const hastaSemana = fechaMasDias(servicio.fecha, 3)

    let prevQ = supabase
        .from('ofrenda_servicios')
        .select('id, plan:ofrenda_planes!inner(sede_id)')
        .eq('dia_tipo', servicio.dia_tipo)
        .lt('fecha', servicio.fecha)
        .gte('fecha', PLANO_HISTORIAL_DESDE)
        .order('fecha', { ascending: false })
        .limit(3)
    let nextQ = supabase
        .from('ofrenda_servicios')
        .select('id, plan:ofrenda_planes!inner(sede_id)')
        .eq('dia_tipo', servicio.dia_tipo)
        .gt('fecha', servicio.fecha)
        .gte('fecha', PLANO_HISTORIAL_DESDE)
        .order('fecha', { ascending: true })
        .limit(3)
    let semanaQ = supabase
        .from('ofrenda_servicios')
        .select('id, plan:ofrenda_planes!inner(sede_id)')
        .neq('dia_tipo', servicio.dia_tipo)
        .gte('fecha', desdeSemana < PLANO_HISTORIAL_DESDE ? PLANO_HISTORIAL_DESDE : desdeSemana)
        .lte('fecha', hastaSemana)
    if (sedeId) {
        prevQ = prevQ.eq('plan.sede_id', sedeId)
        nextQ = nextQ.eq('plan.sede_id', sedeId)
        semanaQ = semanaQ.eq('plan.sede_id', sedeId)
    }

    const [prev, next, semana] = await Promise.all([prevQ, nextQ, semanaQ])

    // `prevQ` viene ordenado por fecha descendente → el primero es el servicio
    // inmediatamente anterior de este mismo turno.
    const servicioAnteriorId = ((prev.data ?? [])[0]?.id as string | undefined) ?? null
    const idsTurno = [...(prev.data ?? []), ...(next.data ?? [])].map(s => s.id as string)
    const idsSemana = (semana.data ?? []).map(s => s.id as string)
    if (idsTurno.length === 0 && idsSemana.length === 0) {
        return construirHistorialParaServicio(rolesAcumulado, [])
    }

    const cargarAsig = async (ids: string[]) => {
        if (ids.length === 0) return []
        const { data } = await supabase
            .from('ofrenda_plano_asignaciones')
            .select('persona_id, rol, servicio_id, bloque')
            .in('servicio_id', ids)
        return data ?? []
    }
    const [asigTurno, asigSemana] = await Promise.all([cargarAsig(idsTurno), cargarAsig(idsSemana)])

    return construirHistorialParaServicio(rolesAcumulado, asigTurno, asigSemana, servicioAnteriorId)
}

/** Resuelve los servicios objetivo según el alcance (día / semana / mes). */
export function resolverServiciosObjetivo<T extends { id: string; semana_iso: number }>(
    servicios: T[],
    opts: Pick<PlanoGenerateOptions, 'alcance' | 'semanaIso' | 'servicioId'>,
): T[] | null {
    if (opts.alcance === 'week' && opts.semanaIso != null) {
        return servicios.filter(s => s.semana_iso === opts.semanaIso)
    }
    if (opts.alcance === 'day') {
        if (!opts.servicioId) return null
        const target = servicios.filter(s => s.id === opts.servicioId)
        return target.length ? target : null
    }
    return servicios
}

/**
 * Elimina las asignaciones del plano para el alcance seleccionado
 * (día, semana o mes). No toca el plan general ni sus servicios.
 */
export async function ejecutarEliminacionPlano(
    supabase: SupabaseClient,
    sedeId: string | null,
    opts: Omit<PlanoGenerateOptions, 'modo'>,
): Promise<{ ok: true; eliminados: number } | { ok: false; error: string }> {
    let planQuery = supabase
        .from('ofrenda_planes')
        .select('id')
        .eq('anio', opts.anio)
        .eq('mes', opts.mes)
    if (sedeId) planQuery = planQuery.eq('sede_id', sedeId)
    const { data: planRow } = await planQuery.maybeSingle()
    if (!planRow) return { ok: false, error: 'NO_PLAN' }

    const { data: servicios } = await supabase
        .from('ofrenda_servicios')
        .select('id, semana_iso')
        .eq('plan_id', planRow.id)
    if (!servicios?.length) return { ok: false, error: 'NO_SERVICIOS' }

    const target = resolverServiciosObjetivo(servicios, opts)
    if (!target) return { ok: false, error: 'NO_SERVICIO' }

    const ids = target.map(s => s.id)
    const { error, count } = await supabase
        .from('ofrenda_plano_asignaciones')
        .delete({ count: 'exact' })
        .in('servicio_id', ids)
    if (error) return { ok: false, error: error.message }

    return { ok: true, eliminados: count ?? 0 }
}

export async function ejecutarGeneracionPlano(
    supabase: SupabaseClient,
    sedeId: string | null,
    opts: PlanoGenerateOptions,
): Promise<PlanoGenerateResult> {
    let planQuery = supabase
        .from('ofrenda_planes')
        .select('id, sacos_jueves, sacos_domingo, sacos_domingo_tarde')
        .eq('anio', opts.anio)
        .eq('mes', opts.mes)
    if (sedeId) planQuery = planQuery.eq('sede_id', sedeId)
    const { data: planRow } = await planQuery.maybeSingle()

    if (!planRow) return { ok: false, error: 'NO_PLAN' }

    const { data: servicios } = await supabase
        .from('ofrenda_servicios')
        .select('id, fecha, dia_tipo, semana_iso')
        .eq('plan_id', planRow.id)
        .order('posicion')

    if (!servicios?.length) return { ok: false, error: 'NO_SERVICIOS' }

    const target = resolverServiciosObjetivo(servicios, opts)
    if (!target) return { ok: false, error: 'NO_SERVICIO' }

    const personas = await loadPersonasEngine(supabase, sedeId)
    const parejas = await loadParejasEngine(supabase, sedeId)

    for (const s of target) {
        const dia = s.dia_tipo as DiaTipo
        const sacos = sacosForDia(planRow, dia)
        if (!validarPoolSuficiente(personas, dia, sacos)) {
            return { ok: false, error: `POOL_INSUFICIENTE:${dia}` }
        }
    }

    // Se borra TODO el alcance ANTES de leer el histórico: si no, las asignaciones
    // que estamos sustituyendo siguen contando y se suman a las nuevas (regenerar
    // un mes lo contaba dos veces y falseaba la equidad de esa misma corrida).
    if (opts.modo === 'regenerar' || opts.modo === 'generar') {
        const { error: delErr } = await supabase
            .from('ofrenda_plano_asignaciones')
            .delete()
            .in('servicio_id', target.map(s => s.id))
        if (delErr) return { ok: false, error: delErr.message }
    }

    let total = 0

    const rolesSesionPorTurno = clonarRolesPorTurno(await cargarRolesHistoricoPorTurno(supabase, sedeId))

    for (const srv of target) {
        const dia = srv.dia_tipo as DiaTipo
        const turno = dia as PlanoTurnoHistorial
        const sacos = sacosForDia(planRow, dia)

        // «Rellenar» respeta lo que ya hay y completa solo los sacos vacíos:
        // antes generaba un juego completo sin borrar → bloques duplicados.
        const asignarOpts: AsignarPlanoServicioOpts = {}
        if (opts.modo === 'rellenar') {
            const { data: existentes } = await supabase
                .from('ofrenda_plano_asignaciones')
                .select('bloque, persona_id')
                .eq('servicio_id', srv.id)
            const bloquesOcupados = [...new Set((existentes ?? []).map(r => r.bloque as number))]
            if (bloquesOcupados.length >= sacos) continue
            asignarOpts.bloquesOcupados = bloquesOcupados
            asignarOpts.yaAsignados = (existentes ?? [])
                .map(r => r.persona_id as string | null)
                .filter((id): id is string => !!id)
        }

        const rolesTurno = rolesSesionPorTurno.get(turno) ?? new Map<string, PlanoRoleCounts>()
        const historial = await historialDesdeVecinos(supabase, srv, rolesTurno, sedeId)
        const borradores = asignarPlanoServicio(dia, sacos, personas, parejas, historial, asignarOpts)
        if (!borradores.length) continue

        const rows = borradores.map(b => ({
            servicio_id: srv.id,
            bloque: b.bloque,
            rol: b.rol as PlanoRol,
            persona_id: b.persona_id,
            nombre_snapshot: b.nombre_snapshot,
        }))

        const { error } = await supabase.from('ofrenda_plano_asignaciones').insert(rows)
        if (error) return { ok: false, error: error.message }
        aplicarAsignacionesARolesSesion(rolesTurno, rows)
        rolesSesionPorTurno.set(turno, rolesTurno)
        total += rows.length
    }

    return { ok: true, asignados: total }
}
