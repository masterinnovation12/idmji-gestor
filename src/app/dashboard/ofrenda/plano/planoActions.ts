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
    PlanoLayoutComun,
    PlanoModo,
    PlanoPosicion,
    PlanoRol,
    PlanoVista,
    PlanoVistaResuelta,
} from './planoTypes'

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface PlanoPersona {
    id: string
    nombre: string
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

// ─── Auth ───────────────────────────────────────────────────────────────────

async function requireEditor() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado', supabase: null, userId: null }

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    if (!profile || !['ADMIN', 'EDITOR'].includes(profile.rol)) {
        return { error: 'Sin permisos', supabase: null, userId: null }
    }
    return { error: null, supabase, userId: user.id }
}

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
        .select('id, nombre')
        .eq('activo', true)
        .ilike('nombre_normalizado', `%${q}%`)
        .order('nombre')
        .limit(8)

    if (error) return { error: error.message }
    return { data: (data ?? []) as PlanoPersona[] }
}

export async function createPlanoPersona(
    nombre: string,
): Promise<{ data?: PlanoPersona; error?: string }> {
    const { error: authError, supabase, userId } = await requireEditor()
    if (authError || !supabase) return { error: authError ?? 'Error' }

    const validation = validatePlanoPersonaNombre(nombre)
    if (validation) return { error: validation }

    const trimmed = nombre.trim().replace(/\s+/g, ' ')
    const nombre_normalizado = normalizePlanoPersonaNombre(trimmed)

    const { data, error } = await supabase
        .from('ofrenda_plano_personas')
        .insert({ nombre: trimmed, nombre_normalizado, created_by: userId })
        .select('id, nombre')
        .single()

    if (error) {
        if (error.code === '23505') return { error: 'Esa persona ya existe en la lista' }
        return { error: error.message }
    }

    return { data: data as PlanoPersona }
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
