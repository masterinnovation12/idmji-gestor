'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PLANO_ASSETS_BASE } from './planoData'
import { buildAllLayoutSeeds, buildLayoutElementos, type PlanoLayoutElementos } from './planoSeed'
import {
    normalizePlanoPersonaNombre,
    validatePlanoPersonaNombre,
} from './planoPersonaNormalize'
import type {
    PlanoCapacidad,
    PlanoLayoutComun,
    PlanoModo,
    PlanoPosicion,
    PlanoRol,
    PlanoVista,
    PlanoVistaResuelta,
} from './planoTypes'
import { requireEditor, type PlanoAuthError } from './planoAuth'
import {
    readPlanoPersonaRow,
    type PlanoPersonaFull,
    type PlanoPersonaTurnosPatch,
} from './planoPersonaDb'
import {
    PLANO_HISTORIAL_DESDE,
    contarRolesPorPersona,
    type AsignacionRolRow,
} from './planoHistorial'

export type { PlanoPersonaFull, PlanoPersonaTurnosPatch }

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface PlanoPersona {
    id: string
    nombre: string
    capacidad: PlanoCapacidad
}

/** Máximo de resultados del buscador del combobox (con ~61 personas, holgado). */
const PLANO_PERSONA_SEARCH_LIMIT = 30

export type PlanoCreatePersonaError = 'too_short' | 'too_long' | 'no_permission' | 'unknown'

export interface PlanoCreatePersonaResult {
    data?: PlanoPersona
    /** true si ya existía: no se crea duplicado, se reutiliza la persona existente. */
    alreadyExisted?: boolean
    errorCode?: PlanoCreatePersonaError
}

function toPlanoPersona(row: Record<string, unknown>): PlanoPersona {
    const p = readPlanoPersonaRow(row)
    return { id: p.id, nombre: p.nombre, capacidad: p.capacidad }
}

export interface PlanoAsignacion {
    bloque: number
    rol: PlanoRol
    persona_id: string | null
    nombre_snapshot: string | null
}

export interface PlanoDataResult {
    data: PlanoVistaResuelta
    asignaciones: PlanoAsignacion[]
}

export type { PlanoAuthError }

// ─── Seed layouts si la migración aún no los tiene ───────────────────────────

async function ensurePlanoLayoutsSeeded(
    supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<void> {
    const { count, error } = await supabase
        .from('ofrenda_plano_layouts')
        .select('*', { count: 'exact', head: true })

    if (error || (count ?? 0) >= 4) return

    const seeds = buildAllLayoutSeeds().map(s => ({
        modo: s.modo,
        vista: s.vista,
        fondo: s.fondo,
        elementos: s.elementos,
    }))

    await supabase
        .from('ofrenda_plano_layouts')
        .upsert(seeds, { onConflict: 'modo,vista' })
}

function elementosToVistaResuelta(
    vista: PlanoVista,
    modo: PlanoModo,
    elementos: PlanoLayoutElementos,
    nombres: Map<string, string>,
): PlanoVistaResuelta {
    const posiciones: PlanoPosicion[] = elementos.posiciones.map(p => ({
        ...p,
        nombre: nombres.get(`${p.bloque}-${p.rol}`) ?? '',
    }))

    const fondoUrl =
        vista === '3d' && elementos.fondoSrc
            ? `${PLANO_ASSETS_BASE}/${elementos.fondoSrc}`
            : null

    return {
        vista,
        modo,
        lienzo: elementos.lienzo,
        layout: elementos.layout as unknown as PlanoLayoutComun,
        bloques: elementos.bloques,
        posiciones,
        fondoUrl,
    }
}

function nombresFromAsignaciones(asignaciones: PlanoAsignacion[]): Map<string, string> {
    const map = new Map<string, string>()
    for (const a of asignaciones) {
        if (a.nombre_snapshot) map.set(`${a.bloque}-${a.rol}`, a.nombre_snapshot)
    }
    return map
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getPlanoData(
    servicioId: string,
    vista: PlanoVista,
    modo: PlanoModo,
): Promise<{ data?: PlanoDataResult; error?: string }> {
    const supabase = await createClient()

    await ensurePlanoLayoutsSeeded(supabase)

    const { data: layoutRow, error: layoutErr } = await supabase
        .from('ofrenda_plano_layouts')
        .select('elementos')
        .eq('modo', modo)
        .eq('vista', vista)
        .maybeSingle()

    if (layoutErr) return { error: layoutErr.message }

    const { data: asigRows, error: asigErr } = await supabase
        .from('ofrenda_plano_asignaciones')
        .select('bloque, rol, persona_id, nombre_snapshot')
        .eq('servicio_id', servicioId)

    if (asigErr) return { error: asigErr.message }

    const asignaciones: PlanoAsignacion[] = (asigRows ?? []).map(r => ({
        bloque: r.bloque as number,
        rol: r.rol as PlanoRol,
        persona_id: (r.persona_id as string | null) ?? null,
        nombre_snapshot: (r.nombre_snapshot as string | null) ?? null,
    }))

    const nombres = nombresFromAsignaciones(asignaciones)

    if (layoutRow?.elementos) {
        const elementos = layoutRow.elementos as unknown as PlanoLayoutElementos
        return {
            data: {
                data: elementosToVistaResuelta(vista, modo, elementos, nombres),
                asignaciones,
            },
        }
    }

    // Fallback embebido si la tabla existe pero aún no hay fila
    const { getPlanoVista } = await import('./planoData')
    const embedded = getPlanoVista(vista, modo)
    const merged: PlanoVistaResuelta = {
        ...embedded,
        posiciones: embedded.posiciones.map(p => ({
            ...p,
            nombre: nombres.get(`${p.bloque}-${p.rol}`) ?? p.nombre ?? '',
        })),
    }
    return { data: { data: merged, asignaciones } }
}

export async function searchPlanoPersonas(
    query: string,
): Promise<{ data?: PlanoPersona[]; error?: string }> {
    const supabase = await createClient()
    const q = normalizePlanoPersonaNombre(query)
    if (q.length < 1) return { data: [] }

    const { data, error } = await supabase
        .from('ofrenda_plano_personas')
        .select('*')
        .eq('activo', true)
        .ilike('nombre_normalizado', `%${q}%`)
        .order('nombre')
        .limit(PLANO_PERSONA_SEARCH_LIMIT)

    if (error) return { error: error.message }
    return { data: (data ?? []).map(toPlanoPersona) }
}

export async function createPlanoPersona(nombre: string): Promise<PlanoCreatePersonaResult> {
    const { error: authError, supabase, userId } = await requireEditor()
    if (authError || !supabase) return { errorCode: 'no_permission' }

    const validation = validatePlanoPersonaNombre(nombre)
    if (validation) return { errorCode: validation }

    const trimmed = nombre.trim().replace(/\s+/g, ' ')
    const nombre_normalizado = normalizePlanoPersonaNombre(trimmed)

    // Sin duplicados: si ya existe, se reutiliza la persona existente.
    const existing = await supabase
        .from('ofrenda_plano_personas')
        .select('*')
        .eq('nombre_normalizado', nombre_normalizado)
        .maybeSingle()
    if (existing.data) {
        return { data: toPlanoPersona(existing.data), alreadyExisted: true }
    }

    const { data, error } = await supabase
        .from('ofrenda_plano_personas')
        .insert({ nombre: trimmed, nombre_normalizado, created_by: userId })
        .select('*')
        .single()

    if (error) {
        // Carrera: otro lo insertó entre el check y el insert → reutilizar.
        if (error.code === '23505') {
            const again = await supabase
                .from('ofrenda_plano_personas')
                .select('*')
                .eq('nombre_normalizado', nombre_normalizado)
                .maybeSingle()
            if (again.data) return { data: toPlanoPersona(again.data), alreadyExisted: true }
        }
        return { errorCode: 'unknown' }
    }

    return { data: toPlanoPersona(data), alreadyExisted: false }
}

/** Cambia la capacidad de una persona (p. ej. a 'ambos' cuando se asigna fuera de su rol de forma permanente). */
export async function setPlanoPersonaCapacidad(
    personaId: string,
    capacidad: PlanoCapacidad,
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const { error } = await supabase
        .from('ofrenda_plano_personas')
        .update({ capacidad })
        .eq('id', personaId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

export async function savePlanoAsignacion(
    servicioId: string,
    bloque: number,
    rol: PlanoRol,
    personaId: string | null,
    nombreSnapshot: string | null,
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    if (!personaId && !nombreSnapshot) {
        const { error } = await supabase
            .from('ofrenda_plano_asignaciones')
            .delete()
            .eq('servicio_id', servicioId)
            .eq('bloque', bloque)
            .eq('rol', rol)
        if (error) return { error: error.message }
    } else {
        if (personaId) {
            const { data: dup } = await supabase
                .from('ofrenda_plano_asignaciones')
                .select('bloque, rol')
                .eq('servicio_id', servicioId)
                .eq('persona_id', personaId)

            const conflicto = (dup ?? []).some(
                row => !(row.bloque === bloque && row.rol === rol),
            )
            if (conflicto) return { error: 'PERSONA_DUPLICADA_SERVICIO' }
        }

        const { error } = await supabase
            .from('ofrenda_plano_asignaciones')
            .upsert(
                {
                    servicio_id: servicioId,
                    bloque,
                    rol,
                    persona_id: personaId,
                    nombre_snapshot: nombreSnapshot,
                },
                { onConflict: 'servicio_id,bloque,rol' },
            )
        if (error) return { error: error.message }
    }

    revalidatePath('/dashboard/ofrenda')
    return {}
}

export async function clearPlanoNombres(
    servicioId: string,
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const { error } = await supabase
        .from('ofrenda_plano_asignaciones')
        .delete()
        .eq('servicio_id', servicioId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

export async function savePlanoLayout(
    vista: PlanoVista,
    modo: PlanoModo,
    elementos: PlanoLayoutElementos,
): Promise<{ error?: string }> {
    const { error: authError, supabase, userId } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    if (elementos.schemaVersion !== 3) {
        return { error: 'Versión de layout no soportada' }
    }

    const fondo = vista === '2d' ? 'svg' : 'jpg'
    const { error } = await supabase
        .from('ofrenda_plano_layouts')
        .upsert(
            {
                modo,
                vista,
                fondo,
                elementos,
                updated_by: userId,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'modo,vista' },
        )

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

export async function resetPlanoLayout(
    vista: PlanoVista,
    modo: PlanoModo,
): Promise<{ error?: string }> {
    const elementos = buildLayoutElementos(vista, modo)
    return savePlanoLayout(vista, modo, elementos)
}

// ─── Gestión del directorio de personas del plano ─────────────────────────────

export type PlanoRenameError = 'too_short' | 'too_long' | 'duplicate'

/** Lista completa del directorio (para la pantalla de gestión). Lectura: autenticado. */
export async function listPlanoPersonas(): Promise<{ data?: PlanoPersonaFull[]; error?: string }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('ofrenda_plano_personas')
        .select('*')
        .order('nombre')
    if (error) return { error: error.message }

    const { data: asig } = await supabase
        .from('ofrenda_plano_asignaciones')
        .select('persona_id, rol, servicio_id')

    const { data: parejas } = await supabase
        .from('ofrenda_plano_parejas')
        .select('mujer_persona_id, hombre_persona_id')

    // Servicios dentro del histórico válido (a partir de PLANO_HISTORIAL_DESDE):
    // el recuento por rol (O/A) solo cuenta estos; el total (para el aviso de
    // borrado) sí considera todas las asignaciones existentes.
    const { data: svcRows } = await supabase
        .from('ofrenda_servicios')
        .select('id')
        .gte('fecha', PLANO_HISTORIAL_DESDE)
    const servicioIdsValidos = new Set((svcRows ?? []).map(s => s.id as string))

    const asigRows = (asig ?? []) as AsignacionRolRow[]

    const counts = new Map<string, number>()
    for (const a of asigRows) {
        if (a.persona_id) counts.set(a.persona_id, (counts.get(a.persona_id) ?? 0) + 1)
    }

    const roleCounts = contarRolesPorPersona(asigRows, servicioIdsValidos)

    const parejaByPerson = new Map<string, { id: string; nombre: string }>()
    const idToNombre = new Map((data ?? []).map(r => [r.id as string, r.nombre as string]))
    for (const par of parejas ?? []) {
        const m = par.mujer_persona_id as string
        const h = par.hombre_persona_id as string
        parejaByPerson.set(m, { id: h, nombre: idToNombre.get(h) ?? '' })
        parejaByPerson.set(h, { id: m, nombre: idToNombre.get(m) ?? '' })
    }

    return {
        data: (data ?? []).map(r => {
            const base = readPlanoPersonaRow(r)
            const par = parejaByPerson.get(base.id)
            return {
                ...base,
                parejaId: par?.id ?? null,
                parejaNombre: par?.nombre ?? null,
                asignaciones: counts.get(base.id) ?? 0,
                asignacionesOfrendario: roleCounts.get(base.id)?.ofrendario ?? 0,
                asignacionesApoyo: roleCounts.get(base.id)?.apoyo ?? 0,
            }
        }),
    }
}

export async function setPlanoPersonaTurnos(
    personaId: string,
    turnos: PlanoPersonaTurnosPatch,
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const { error } = await supabase
        .from('ofrenda_plano_personas')
        .update({
            puede_jueves: turnos.puede_jueves,
            puede_domingo_manana: turnos.puede_domingo_manana,
            puede_domingo_tarde: turnos.puede_domingo_tarde,
        })
        .eq('id', personaId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

export async function setPlanoPersonaPrioridad(
    personaId: string,
    prioridad_ofrendario: boolean,
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const { error } = await supabase
        .from('ofrenda_plano_personas')
        .update({ prioridad_ofrendario })
        .eq('id', personaId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

async function removeParejaForPersona(supabase: NonNullable<Awaited<ReturnType<typeof requireEditor>>['supabase']>, personaId: string) {
    await supabase
        .from('ofrenda_plano_parejas')
        .delete()
        .or(`mujer_persona_id.eq.${personaId},hombre_persona_id.eq.${personaId}`)
}

export async function setPlanoPersonaActivo(
    personaId: string,
    activo: boolean,
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    if (!activo) {
        await removeParejaForPersona(supabase, personaId)
    }

    const { error } = await supabase
        .from('ofrenda_plano_personas')
        .update({ activo })
        .eq('id', personaId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

export async function setPlanoPareja(
    mujerId: string,
    hombreId: string,
): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    await removeParejaForPersona(supabase, mujerId)
    await removeParejaForPersona(supabase, hombreId)

    const { error } = await supabase.from('ofrenda_plano_parejas').insert({
        mujer_persona_id: mujerId,
        hombre_persona_id: hombreId,
    })

    if (error) return { error: error.message }
    revalidatePath('/dashboard/ofrenda')
    return {}
}

export async function removePlanoPareja(personaId: string): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    await removeParejaForPersona(supabase, personaId)
    revalidatePath('/dashboard/ofrenda')
    return {}
}

/** Renombra una persona y sincroniza el nombre mostrado en sus asignaciones. */
export async function renamePlanoPersona(
    personaId: string,
    nombre: string,
): Promise<{ error?: string; errorCode?: PlanoRenameError }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'no_auth' }

    const code = validatePlanoPersonaNombre(nombre)
    if (code) return { errorCode: code }

    const trimmed = nombre.trim().replace(/\s+/g, ' ')
    const nombre_normalizado = normalizePlanoPersonaNombre(trimmed)

    const { data: clash } = await supabase
        .from('ofrenda_plano_personas')
        .select('id')
        .eq('nombre_normalizado', nombre_normalizado)
        .neq('id', personaId)
        .maybeSingle()
    if (clash) return { errorCode: 'duplicate' }

    const { error } = await supabase
        .from('ofrenda_plano_personas')
        .update({ nombre: trimmed, nombre_normalizado })
        .eq('id', personaId)
    if (error) return { error: error.message }

    // Mantener coherente el snapshot guardado en las asignaciones.
    await supabase
        .from('ofrenda_plano_asignaciones')
        .update({ nombre_snapshot: trimmed })
        .eq('persona_id', personaId)

    revalidatePath('/dashboard/ofrenda')
    return {}
}

/** Borra una persona y vacía los huecos que la tuvieran asignada. */
export async function deletePlanoPersona(personaId: string): Promise<{ error?: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'no_auth' }

    await supabase.from('ofrenda_plano_asignaciones').delete().eq('persona_id', personaId)
    const { error } = await supabase.from('ofrenda_plano_personas').delete().eq('id', personaId)
    if (error) return { error: error.message }

    revalidatePath('/dashboard/ofrenda')
    return {}
}
