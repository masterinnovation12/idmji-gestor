'use server'

import { revalidatePath } from 'next/cache'
import { requireUser, requireAnyPermission } from '@/lib/auth/guards'
import { resolveActiveSedeId } from '@/lib/sede/activeSede'
import type { PermissionKey } from '@/lib/auth/permissions'
import {
    generarPlan,
    generarFechasDelPlan,
    derivarArranqueRotacion,
    mesAnterior,
    type AsignacionPrevia,
    type OfrendaMiembro,
    type SacosConfig,
    type DiaTipo,
} from '@/lib/utils/ofrendaEngine'
import {
    normalizeMiembroDisponibilidad,
    validarDisponibilidadParaGenerar,
} from '@/app/dashboard/ofrenda/ofrendaMemberAvailability'
import {
    getMaxSacosForDiaTipo,
    getSecuenciaMaximo,
    validateSecuenciaSacos,
} from '@/app/dashboard/ofrenda/secuenciaSacosLimits'
import {
    findServicioIndexById,
    propagateSecuenciasFromIndex,
    type SecuenciaApplyScope,
} from '@/app/dashboard/ofrenda/secuenciaPropagation'
import {
    remapPlanoAsignaciones,
    type PlanoAsigSnapshot,
} from '@/app/dashboard/ofrenda/plano/planoRescue'
function clampPunteroSaco(n: number, secuenciaMax: number): number {
    const max = Math.max(1, Math.min(99, secuenciaMax))
    return Math.max(1, Math.min(max, n))
}

export type { SecuenciaApplyScope } from '@/app/dashboard/ofrenda/secuenciaPropagation'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface OfrMiembro {
    id: string
    nombre: string
    /** 1 = realiza la labor · 2 = colaboradores · 3 = solo testimonios. */
    grupo: 1 | 2 | 3
    orden: number
    activo: boolean
    puede_jueves: boolean
    puede_domingo_manana: boolean
    puede_domingo_tarde: boolean
    /** Puesto fijo opcional (coordinador/apoyo por día). Ambos null = sin fijar. */
    fijo_dia_tipo: DiaTipo | null
    fijo_rol: 'realiza' | 'apoyo' | null
    profile_id: string | null
    created_at: string
}

function mapRowToOfrMiembro(row: Record<string, unknown>): OfrMiembro {
    const disp = normalizeMiembroDisponibilidad({
        puede_jueves: row.puede_jueves as boolean | undefined,
        puede_domingo_manana: row.puede_domingo_manana as boolean | undefined,
        puede_domingo_tarde: row.puede_domingo_tarde as boolean | undefined,
    })
    return {
        id: row.id as string,
        nombre: row.nombre as string,
        grupo: row.grupo as 1 | 2 | 3,
        orden: row.orden as number,
        activo: row.activo as boolean,
        ...disp,
        fijo_dia_tipo: (row.fijo_dia_tipo as DiaTipo | null) ?? null,
        fijo_rol: (row.fijo_rol as 'realiza' | 'apoyo' | null) ?? null,
        profile_id: (row.profile_id as string | null) ?? null,
        created_at: row.created_at as string,
    }
}

export interface OfrServicio {
    id: string
    plan_id: string
    fecha: string
    dia_tipo: 'jueves' | 'domingo' | 'domingo_tarde'
    semana_iso: number
    secuencia_desde: number
    secuencia_hasta: number
    secuencia_texto: string
    posicion: number
}

export interface OfrAsignacion {
    id: string
    servicio_id: string
    rol: string
    miembro_id: string | null
    es_override: boolean
    miembro?: { nombre: string; grupo: number } | null
}

export interface OfrPlan {
    id: string
    anio: number
    mes: number
    secuencia_puntero: number
    secuencia_puntero_fin: number
    sacos_jueves: number
    sacos_domingo: number
    sacos_domingo_tarde: number
    secuencia_maximo: number
    created_at: string
    updated_at: string
}

export interface PlanCompleto {
    plan: OfrPlan
    servicios: OfrServicio[]
    asignaciones: OfrAsignacion[]
    miembros: OfrMiembro[]
}

// ─── Auth guards (permisos granulares + sede activa) ─────────────────────────

type LaborGuard =
    | { error: string; supabase: null; userId: null; sedeId: null }
    | { error: null; supabase: SupabaseClient; userId: string; sedeId: string | null }

/** Escritura: exige alguno de los permisos y resuelve la sede efectiva. */
async function requireLabor(perms: readonly PermissionKey[]): Promise<LaborGuard> {
    const { ctx, error } = await requireAnyPermission(perms)
    if (error || !ctx) return { error: error ?? 'Sin permisos', supabase: null, userId: null, sedeId: null }
    const sedeId = await resolveActiveSedeId(ctx)
    return { error: null, supabase: ctx.supabase, userId: ctx.userId, sedeId }
}

/** Lectura: usuario autenticado + sede efectiva (RLS refuerza el aislamiento). */
async function scopedRead(): Promise<LaborGuard> {
    const { ctx, error } = await requireUser()
    if (error || !ctx) return { error: error ?? 'No autenticado', supabase: null, userId: null, sedeId: null }
    const sedeId = await resolveActiveSedeId(ctx)
    return { error: null, supabase: ctx.supabase, userId: ctx.userId, sedeId }
}

const PERMISOS_MIEMBROS = ['hermanos.gestionar', 'laborGeneral.gestionar'] as const
const PERMISOS_PLAN = ['laborGeneral.gestionar'] as const

// ─── Miembros ─────────────────────────────────────────────────────────────────

export async function getMiembros(): Promise<{ data?: OfrMiembro[]; error?: string }> {
    const { error: authError, supabase, sedeId } = await scopedRead()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    let query = supabase
        .from('ofrenda_miembros')
        .select('*')
        .order('grupo')
        .order('orden')
    if (sedeId) query = query.eq('sede_id', sedeId)

    const { data, error } = await query
    if (error) return { error: error.message }
    return { data: (data ?? []).map(row => mapRowToOfrMiembro(row as Record<string, unknown>)) }
}

export async function upsertMiembro(
    miembro: Partial<OfrMiembro> & { nombre: string; grupo: 1 | 2 | 3 }
): Promise<{ data?: OfrMiembro; error?: string }> {
    const { error: authError, supabase, sedeId } = await requireLabor(PERMISOS_MIEMBROS)
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const disp = normalizeMiembroDisponibilidad(miembro)

    const { data, error } = await supabase
        .from('ofrenda_miembros')
        .upsert({
            ...(miembro.id ? { id: miembro.id } : {}),
            nombre: miembro.nombre.trim(),
            grupo: miembro.grupo,
            orden: miembro.orden ?? 0,
            activo: miembro.activo ?? true,
            ...disp,
            profile_id: miembro.profile_id ?? null,
            ...(sedeId ? { sede_id: sedeId } : {}),
        })
        .select()
        .single()

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return { data: mapRowToOfrMiembro(data as Record<string, unknown>) }
}

export async function deleteMiembro(id: string): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireLabor(PERMISOS_MIEMBROS)
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const { error } = await supabase.from('ofrenda_miembros').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

export async function reordenarMiembros(
    items: { id: string; orden: number }[]
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireLabor(PERMISOS_MIEMBROS)
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const updates = items.map(({ id, orden }) =>
        supabase.from('ofrenda_miembros').update({ orden }).eq('id', id)
    )

    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed?.error) return { error: failed.error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

/** Importar hermanos del sistema como miembros de ofrenda. */
export async function syncHermanos(
    profileIds: string[],
    grupo: 1 | 2 | 3
): Promise<{ importados: number; error?: string }> {
    const { error: authError, supabase, sedeId } = await requireLabor(PERMISOS_MIEMBROS)
    if (authError || !supabase) return { importados: 0, error: authError ?? 'Error' }

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, nombre, apellidos')
        .in('id', profileIds)

    if (error || !profiles) return { importados: 0, error: error?.message }

    let importados = 0
    for (const p of profiles) {
        const nombre = [p.nombre, p.apellidos].filter(Boolean).join(' ')
        const { error: upsertErr } = await supabase.from('ofrenda_miembros').upsert({
            nombre,
            grupo,
            activo: true,
            puede_jueves: true,
            puede_domingo_manana: true,
            puede_domingo_tarde: true,
            profile_id: p.id,
            ...(sedeId ? { sede_id: sedeId } : {}),
        }, { onConflict: 'profile_id' })
        if (!upsertErr) importados++
    }

    revalidatePath('/dashboard/ofrenda')
    return { importados }
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export async function getPlan(anio: number, mes: number): Promise<{ data?: PlanCompleto; error?: string }> {
    const { error: authError, supabase, sedeId } = await scopedRead()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    // 1. Plan (incluye columnas de sacos configurables)
    let planQuery = supabase
        .from('ofrenda_planes')
        .select('*')
        .eq('anio', anio)
        .eq('mes', mes)
    if (sedeId) planQuery = planQuery.eq('sede_id', sedeId)
    const { data: plan, error: planErr } = await planQuery.maybeSingle()

    if (planErr) return { error: planErr.message }
    if (!plan) return {}  // plan no existe todavía

    // 2. Servicios ordenados por posición
    const { data: servicios, error: srvErr } = await supabase
        .from('ofrenda_servicios')
        .select('*')
        .eq('plan_id', plan.id)
        .order('posicion')

    if (srvErr) return { error: srvErr.message }

    // 3. Asignaciones con nombre de miembro
    const srvIds = (servicios ?? []).map(s => s.id)
    const { data: asignaciones, error: asigErr } = srvIds.length
        ? await supabase
            .from('ofrenda_asignaciones')
            .select('*, miembro:ofrenda_miembros(nombre, grupo)')
            .in('servicio_id', srvIds)
        : { data: [], error: null }

    if (asigErr) return { error: asigErr.message }

    // 4. Miembros
    let miembrosQuery = supabase
        .from('ofrenda_miembros')
        .select('*')
        .order('grupo')
        .order('orden')
    if (sedeId) miembrosQuery = miembrosQuery.eq('sede_id', sedeId)
    const { data: miembros } = await miembrosQuery

    return {
        data: {
            plan: plan as OfrPlan,
            servicios: (servicios ?? []) as OfrServicio[],
            asignaciones: (asignaciones ?? []) as OfrAsignacion[],
            miembros: (miembros ?? []).map(m => mapRowToOfrMiembro(m as Record<string, unknown>)),
        }
    }
}

// ─── Helpers privados para generarORegenerarPlan ──────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>

async function fetchMiembrosActivos(supabase: SupabaseClient, sedeId: string | null): Promise<OfrendaMiembro[]> {
    let query = supabase
        .from('ofrenda_miembros')
        .select('*')
        .eq('activo', true)
        .order('grupo')
        .order('orden')
    if (sedeId) query = query.eq('sede_id', sedeId)
    const { data } = await query
    return (data ?? []).map(m => {
        const row = m as Record<string, unknown>
        const base = mapRowToOfrMiembro(row)
        return {
            ...base,
            fijoDiaTipo: base.fijo_dia_tipo,
            fijoRol: base.fijo_rol,
        } as OfrendaMiembro
    })
}

/** Marca/limpia el puesto fijo (coordinador/apoyo por día) de un miembro de Grupo 1. */
export async function setMiembroFijo(
    miembroId: string,
    fijoDiaTipo: DiaTipo | null,
    fijoRol: 'realiza' | 'apoyo' | null,
): Promise<{ error?: string }> {
    const { error: authError, supabase, sedeId } = await requireLabor(PERMISOS_PLAN)
    if (authError || !supabase) return { error: authError ?? 'Error' }

    // Ambos o ninguno: no se permite un fijo a medias.
    const dia = fijoDiaTipo && fijoRol ? fijoDiaTipo : null
    const rol = fijoDiaTipo && fijoRol ? fijoRol : null

    // Un mismo (día, rol) solo puede tener un titular: liberar al anterior (misma sede).
    if (dia && rol) {
        let release = supabase
            .from('ofrenda_miembros')
            .update({ fijo_dia_tipo: null, fijo_rol: null })
            .eq('fijo_dia_tipo', dia)
            .eq('fijo_rol', rol)
        if (sedeId) release = release.eq('sede_id', sedeId)
        await release
    }

    const { error } = await supabase
        .from('ofrenda_miembros')
        .update({ fijo_dia_tipo: dia, fijo_rol: rol })
        .eq('id', miembroId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

async function resolvePunteroInicio(
    supabase: SupabaseClient,
    planExistente: { secuencia_puntero?: number } | null,
    punteroManual: number | undefined,
    anio: number,
    mes: number,
    sedeId: string | null
): Promise<number> {
    if (punteroManual) return punteroManual
    if (planExistente?.secuencia_puntero) return planExistente.secuencia_puntero
    const mesAnt  = mes === 1 ? 12 : mes - 1
    const anioAnt = mes === 1 ? anio - 1 : anio
    let query = supabase
        .from('ofrenda_planes')
        .select('secuencia_puntero_fin')
        .eq('anio', anioAnt)
        .eq('mes', mesAnt)
    if (sedeId) query = query.eq('sede_id', sedeId)
    const { data } = await query.maybeSingle()
    return data?.secuencia_puntero_fin ?? 1
}

/**
 * Carga las asignaciones del plan del MES ANTERIOR (misma sede) para que la
 * rotación G1/G2/testimonios continúe donde se quedó en vez de reiniciarse.
 */
async function loadAsignacionesMesAnterior(
    supabase: SupabaseClient,
    anio: number,
    mes: number,
    sedeId: string | null,
): Promise<AsignacionPrevia[]> {
    const ant = mesAnterior(anio, mes)
    let planQuery = supabase
        .from('ofrenda_planes')
        .select('id')
        .eq('anio', ant.anio)
        .eq('mes', ant.mes)
    if (sedeId) planQuery = planQuery.eq('sede_id', sedeId)
    const { data: plan } = await planQuery.maybeSingle()
    if (!plan) return []

    const { data: srvs } = await supabase
        .from('ofrenda_servicios')
        .select('id, fecha, dia_tipo')
        .eq('plan_id', plan.id)
    if (!srvs?.length) return []

    const { data: asigs } = await supabase
        .from('ofrenda_asignaciones')
        .select('servicio_id, rol, miembro_id')
        .in('servicio_id', srvs.map(s => s.id))

    const byId = new Map(srvs.map(s => [s.id, s]))
    return (asigs ?? []).flatMap(a => {
        const srv = byId.get(a.servicio_id)
        if (!srv || !a.miembro_id) return []
        return [{
            servicioFecha: srv.fecha as string,
            servicioTipo: srv.dia_tipo as DiaTipo,
            rol: a.rol as AsignacionPrevia['rol'],
            miembroId: a.miembro_id as string,
        }]
    })
}

async function loadOverrides(
    supabase: SupabaseClient,
    planExistente: { id: string } | null,
    regenerarGrupo: 1 | 2 | null | undefined
): Promise<Record<string, string>> {
    const map: Record<string, string> = {}
    if (!planExistente || regenerarGrupo === null) return map
    const { data: srvs } = await supabase
        .from('ofrenda_servicios')
        .select('id, fecha, dia_tipo')
        .eq('plan_id', planExistente.id)
    if (!srvs?.length) return map
    const { data: asigs } = await supabase
        .from('ofrenda_asignaciones')
        .select('servicio_id, rol, miembro_id')
        .in('servicio_id', srvs.map(s => s.id))
        .eq('es_override', true)
    const byId = Object.fromEntries(srvs.map(s => [s.id, { fecha: s.fecha, tipo: s.dia_tipo }]))
    for (const asig of asigs ?? []) {
        if (!asig.miembro_id) continue
        const srv = byId[asig.servicio_id]
        if (srv) map[`${srv.fecha}:${srv.tipo}:${asig.rol}`] = asig.miembro_id
    }
    return map
}

async function snapshotPlanoAsignaciones(
    supabase: SupabaseClient,
    planId: string,
): Promise<PlanoAsigSnapshot[]> {
    const { data: srvs } = await supabase
        .from('ofrenda_servicios')
        .select('id, fecha, dia_tipo')
        .eq('plan_id', planId)
    if (!srvs?.length) return []

    const byId = new Map(srvs.map(s => [s.id, `${s.fecha}:${s.dia_tipo}`]))
    const { data: asigs } = await supabase
        .from('ofrenda_plano_asignaciones')
        .select('servicio_id, bloque, rol, persona_id, nombre_snapshot')
        .in('servicio_id', srvs.map(s => s.id))

    return (asigs ?? []).flatMap(a => {
        const key = byId.get(a.servicio_id as string)
        if (!key) return []
        return [{
            key,
            bloque: a.bloque as number,
            rol: a.rol as string,
            persona_id: (a.persona_id as string | null) ?? null,
            nombre_snapshot: (a.nombre_snapshot as string | null) ?? null,
        }]
    })
}

async function persistirServicios(
    supabase: SupabaseClient,
    planId: string,
    planCalc: import('@/lib/utils/ofrendaEngine').PlanCalculado,
    overridesMap: Record<string, string>
): Promise<{ error?: string }> {
    // Rescatar asignaciones del plano ANTES de borrar los servicios (CASCADE).
    const planoSnapshot = await snapshotPlanoAsignaciones(supabase, planId)

    await supabase.from('ofrenda_servicios').delete().eq('plan_id', planId)

    const { data: inserted, error: srvErr } = await supabase
        .from('ofrenda_servicios')
        .insert(planCalc.servicios.map(s => ({
            plan_id: planId, fecha: s.fecha, dia_tipo: s.diaTipo,
            semana_iso: s.semanaIso, secuencia_desde: s.secuenciaDesde,
            secuencia_hasta: s.secuenciaHasta, secuencia_texto: s.secuenciaTexto,
            posicion: s.posicion,
        })))
        .select()

    if (srvErr) return { error: srvErr.message }

    const srvMap = Object.fromEntries(
        (inserted ?? []).map(s => [`${s.fecha}:${s.dia_tipo}`, s.id])
    )

    // Reinsertar las asignaciones del plano apuntando al nuevo servicio_id.
    const planoRestore = remapPlanoAsignaciones(planoSnapshot, srvMap)
    if (planoRestore.length > 0) {
        const { error: planoErr } = await supabase
            .from('ofrenda_plano_asignaciones')
            .insert(planoRestore)
        if (planoErr) return { error: planoErr.message }
    }

    const asigInsert = planCalc.asignaciones.map(a => ({
        servicio_id: srvMap[`${a.servicioFecha}:${a.servicioTipo}`],
        rol: a.rol,
        miembro_id: a.miembroId,
        es_override: !!overridesMap[`${a.servicioFecha}:${a.servicioTipo}:${a.rol}`],
    })).filter(a => a.servicio_id)

    if (asigInsert.length > 0) {
        const { error: asigErr } = await supabase.from('ofrenda_asignaciones').insert(asigInsert)
        if (asigErr) return { error: asigErr.message }
    }
    return {}
}

/**
 * Genera o regenera el plan de un mes.
 * Si ya existe, solo regenera el grupo indicado respetando overrides.
 */
export async function generarORegenerarPlan(
    anio: number,
    mes: number,
    punteroManual?: number,
    regenerarGrupo?: 1 | 2 | null,
    sacosOverride?: Partial<SacosConfig>
): Promise<{ error?: string; problemas?: import('./ofrendaMemberAvailability').ValidacionGeneracionTurno[] }> {
    const { error: authError, supabase, userId, sedeId } = await requireLabor(PERMISOS_PLAN)
    if (authError || !supabase || !userId) return { error: authError ?? 'Error' }

    const miembros = await fetchMiembrosActivos(supabase, sedeId)

    const fechasPlan = generarFechasDelPlan(anio, mes)
    const validacion = validarDisponibilidadParaGenerar(
        fechasPlan,
        miembros,
        regenerarGrupo ?? null,
    )
    if (!validacion.ok) {
        return {
            error: 'DISPONIBILIDAD_INSUFICIENTE',
            problemas: validacion.problemas,
        }
    }

    let planExistenteQuery = supabase
        .from('ofrenda_planes')
        .select('id, secuencia_puntero, sacos_jueves, sacos_domingo, sacos_domingo_tarde, secuencia_maximo')
        .eq('anio', anio).eq('mes', mes)
    if (sedeId) planExistenteQuery = planExistenteQuery.eq('sede_id', sedeId)
    const { data: planExistente } = await planExistenteQuery.maybeSingle()

    const punteroInicio = await resolvePunteroInicio(supabase, planExistente, punteroManual, anio, mes, sedeId)

    const sacosConfig: SacosConfig = {
        jueves:       sacosOverride?.jueves       ?? planExistente?.sacos_jueves        ?? 4,
        domingo:      sacosOverride?.domingo      ?? planExistente?.sacos_domingo       ?? 8,
        domingoTarde: sacosOverride?.domingoTarde ?? planExistente?.sacos_domingo_tarde ?? 4,
        secuenciaMax: sacosOverride?.secuenciaMax ?? planExistente?.secuencia_maximo    ?? 20,
    }

    const overridesMap = await loadOverrides(supabase, planExistente, regenerarGrupo)
    const previas = await loadAsignacionesMesAnterior(supabase, anio, mes, sedeId)
    const arranque = derivarArranqueRotacion(previas, miembros)
    const planCalc = generarPlan(anio, mes, punteroInicio, miembros, overridesMap, regenerarGrupo ?? null, sacosConfig, arranque)

    const secuenciaMax = sacosConfig.secuenciaMax ?? 20

    const { data: plan, error: planErr } = await supabase
        .from('ofrenda_planes')
        .upsert({
            ...(planExistente?.id ? { id: planExistente.id } : {}),
            anio, mes,
            secuencia_puntero:     clampPunteroSaco(punteroInicio, secuenciaMax),
            secuencia_puntero_fin: clampPunteroSaco(planCalc.punteroFin, secuenciaMax),
            sacos_jueves:          sacosConfig.jueves,
            sacos_domingo:         sacosConfig.domingo,
            sacos_domingo_tarde:   sacosConfig.domingoTarde,
            secuencia_maximo:      secuenciaMax,
            created_by: userId,
            ...(sedeId ? { sede_id: sedeId } : {}),
        }, { onConflict: 'sede_id,anio,mes' })
        .select().single()

    if (planErr || !plan) return { error: planErr?.message ?? 'Error al crear plan' }

    const result = await persistirServicios(supabase, plan.id, planCalc, overridesMap)
    if (result.error) return result

    revalidatePath('/dashboard/ofrenda')
    return {}
}

/**
 * Actualiza una asignación individual (override manual desde la celda).
 */
export async function updateAsignacion(
    servicioId: string,
    rol: string,
    miembroId: string | null
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireLabor(PERMISOS_PLAN)
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const { error } = await supabase
        .from('ofrenda_asignaciones')
        .upsert({
            servicio_id: servicioId,
            rol,
            miembro_id: miembroId,
            es_override: true,
        }, { onConflict: 'servicio_id,rol' })

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

/**
 * Actualiza la secuencia de sacos de un servicio manualmente.
 */
export async function updateSecuenciaServicio(
    servicioId: string,
    secuenciaDesde: number,
    secuenciaHasta: number,
    scope: SecuenciaApplyScope = 'single',
): Promise<{
    error?: string
    code?: 'limit' | 'too_few' | 'too_many' | 'bounds'
    updatedCount?: number
}> {
    const { error: authError, supabase } = await requireLabor(PERMISOS_PLAN)
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const { data: servicio, error: srvErr } = await supabase
        .from('ofrenda_servicios')
        .select('dia_tipo, plan_id, posicion')
        .eq('id', servicioId)
        .single()

    if (srvErr || !servicio) {
        return { error: srvErr?.message ?? 'Servicio no encontrado' }
    }

    const { data: plan, error: planErr } = await supabase
        .from('ofrenda_planes')
        .select('sacos_jueves, sacos_domingo, sacos_domingo_tarde, secuencia_maximo')
        .eq('id', servicio.plan_id)
        .single()

    if (planErr || !plan) {
        return { error: planErr?.message ?? 'Plan no encontrado' }
    }

    const planConfig = {
        sacos_jueves: plan.sacos_jueves,
        sacos_domingo: plan.sacos_domingo,
        sacos_domingo_tarde: plan.sacos_domingo_tarde,
        secuencia_maximo: getSecuenciaMaximo(plan),
    }
    const cicloMax = planConfig.secuencia_maximo

    const maxSacos = getMaxSacosForDiaTipo(servicio.dia_tipo as DiaTipo, planConfig)
    const validation = validateSecuenciaSacos(
        secuenciaDesde,
        secuenciaHasta,
        maxSacos,
        cicloMax,
    )
    if (!validation.ok) {
        if (validation.reason === 'bounds') {
            return {
                error: `Rango de sacos entre 1 y ${cicloMax}.`,
                code: 'bounds',
            }
        }
        if (validation.reason === 'too_few') {
            return {
                error: `Deben ser exactamente ${maxSacos} sacos; el rango solo incluye ${validation.count}.`,
                code: 'too_few',
            }
        }
        return {
            error: `Deben ser exactamente ${maxSacos} sacos; el rango incluye ${validation.count}.`,
            code: 'too_many',
        }
    }

    if (scope === 'single') {
        const texto = `${String(secuenciaDesde).padStart(2, '0')} al ${String(secuenciaHasta).padStart(2, '0')}`
        const { error } = await supabase
            .from('ofrenda_servicios')
            .update({
                secuencia_desde: secuenciaDesde,
                secuencia_hasta: secuenciaHasta,
                secuencia_texto: texto,
            })
            .eq('id', servicioId)

        if (error) return { error: error.message }
        revalidatePath('/dashboard/ofrenda')
        return { updatedCount: 1 }
    }

    const { data: todosServicios, error: listErr } = await supabase
        .from('ofrenda_servicios')
        .select('id, dia_tipo, posicion')
        .eq('plan_id', servicio.plan_id)
        .order('posicion')

    if (listErr || !todosServicios?.length) {
        return { error: listErr?.message ?? 'No hay servicios en el plan' }
    }

    const startIndex = findServicioIndexById(todosServicios, servicioId)
    if (startIndex < 0) {
        return { error: 'Servicio no encontrado en el plan' }
    }

    const { updates, punteroFin } = propagateSecuenciasFromIndex(
        todosServicios,
        startIndex,
        secuenciaDesde,
        secuenciaHasta,
        planConfig,
    )

    for (const row of updates) {
        const pasos = getMaxSacosForDiaTipo(
            todosServicios.find((s) => s.id === row.id)!.dia_tipo as DiaTipo,
            planConfig,
        )
        const v = validateSecuenciaSacos(
            row.secuencia_desde,
            row.secuencia_hasta,
            pasos,
            cicloMax,
        )
        if (!v.ok) {
            return {
                error: 'La propagación generó una secuencia inválida.',
                code: v.reason === 'bounds' ? 'bounds' : v.reason,
            }
        }
    }

    for (const row of updates) {
        const { error } = await supabase
            .from('ofrenda_servicios')
            .update({
                secuencia_desde: row.secuencia_desde,
                secuencia_hasta: row.secuencia_hasta,
                secuencia_texto: row.secuencia_texto,
            })
            .eq('id', row.id)
        if (error) return { error: error.message }
    }

    const { error: punteroErr } = await supabase
        .from('ofrenda_planes')
        .update({ secuencia_puntero_fin: punteroFin })
        .eq('id', servicio.plan_id)

    if (punteroErr) return { error: punteroErr.message }

    revalidatePath('/dashboard/ofrenda')
    return { updatedCount: updates.length }
}

/**
 * Actualiza la configuración de sacos de un plan y regenera automáticamente.
 */
export async function updateSacosConfig(
    planId: string,
    sacosJueves: number,
    sacosDomingo: number,
    sacosDomingoTarde: number,
    secuenciaMaximo: number,
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireLabor(PERMISOS_PLAN)
    if (authError || !supabase) return { error: authError ?? 'Error' }

    // Obtener anio/mes del plan para regenerar
    const { data: planData, error: fetchErr } = await supabase
        .from('ofrenda_planes')
        .select('anio, mes')
        .eq('id', planId)
        .single()

    if (fetchErr || !planData) return { error: fetchErr?.message ?? 'Plan no encontrado' }

    // Actualizar config y regenerar con los nuevos sacos
    return generarORegenerarPlan(
        planData.anio,
        planData.mes,
        undefined,
        null,
        {
            jueves: sacosJueves,
            domingo: sacosDomingo,
            domingoTarde: sacosDomingoTarde,
            secuenciaMax: secuenciaMaximo,
        }
    )
}

/**
 * Devuelve lista de planes disponibles (para el historial de meses).
 */
/**
 * Elimina el plan de un mes (servicios y asignaciones en cascada).
 */
export async function eliminarPlan(anio: number, mes: number): Promise<{ error?: string }> {
    const { error: authError, supabase, sedeId } = await requireLabor(PERMISOS_PLAN)
    if (authError || !supabase) return { error: authError ?? 'Error' }

    let query = supabase
        .from('ofrenda_planes')
        .delete()
        .eq('anio', anio)
        .eq('mes', mes)
    if (sedeId) query = query.eq('sede_id', sedeId)
    const { error } = await query

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

export async function getPlanesList(): Promise<{ data?: { anio: number; mes: number }[]; error?: string }> {
    const { error: authError, supabase, sedeId } = await scopedRead()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    let query = supabase
        .from('ofrenda_planes')
        .select('anio, mes')
        .order('anio', { ascending: false })
        .order('mes', { ascending: false })
    if (sedeId) query = query.eq('sede_id', sedeId)
    const { data, error } = await query

    if (error) return { error: error.message }
    return { data: data as { anio: number; mes: number }[] }
}
