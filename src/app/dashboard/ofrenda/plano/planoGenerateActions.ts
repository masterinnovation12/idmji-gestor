'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PlanoRol } from './planoTypes'
import {
    asignarPlanoServicio,
    crearHistorialVacio,
    type PlanoParejaEngine,
    type PlanoPersonaEngine,
    validarPoolSuficiente,
} from '@/lib/utils/planoEngine'
import type { DiaTipo } from '@/lib/utils/ofrendaEngine'
import { requireEditor } from './planoAuth'
import { readPlanoPersonaRow } from './planoPersonaDb'

export type PlanoGenerateScope = 'week' | 'month'
export type PlanoGenerateMode = 'generar' | 'regenerar' | 'rellenar'

export interface PlanoGenerateOptions {
    anio: number
    mes: number
    alcance: PlanoGenerateScope
    semanaIso?: number
    modo: PlanoGenerateMode
}

async function loadPersonasEngine(supabase: Awaited<ReturnType<typeof createClient>>): Promise<PlanoPersonaEngine[]> {
    const { data } = await supabase.from('ofrenda_plano_personas').select('*')
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

async function loadParejasEngine(supabase: Awaited<ReturnType<typeof createClient>>): Promise<PlanoParejaEngine[]> {
    const { data } = await supabase.from('ofrenda_plano_parejas').select('mujer_persona_id, hombre_persona_id')
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

export async function generarPlanoLabor(
    opts: PlanoGenerateOptions,
): Promise<{ ok: true; asignados: number } | { ok: false; error: string }> {
    const { error: authError, supabase } = await requireEditor()
    if (authError || !supabase) return { ok: false, error: authError ?? 'no_permission' }

    const { data: planRow } = await supabase
        .from('ofrenda_planes')
        .select('id, sacos_jueves, sacos_domingo, sacos_domingo_tarde')
        .eq('anio', opts.anio)
        .eq('mes', opts.mes)
        .maybeSingle()

    if (!planRow) return { ok: false, error: 'NO_PLAN' }

    const { data: servicios } = await supabase
        .from('ofrenda_servicios')
        .select('id, fecha, dia_tipo, semana_iso')
        .eq('plan_id', planRow.id)
        .order('posicion')

    if (!servicios?.length) return { ok: false, error: 'NO_SERVICIOS' }

    let target = servicios
    if (opts.alcance === 'week' && opts.semanaIso != null) {
        target = servicios.filter(s => s.semana_iso === opts.semanaIso)
    }

    const personas = await loadPersonasEngine(supabase)
    const parejas = await loadParejasEngine(supabase)
    const historial = crearHistorialVacio()

    for (const s of target) {
        const dia = s.dia_tipo as DiaTipo
        const sacos = sacosForDia(planRow, dia)
        if (!validarPoolSuficiente(personas, dia, sacos)) {
            return { ok: false, error: `POOL_INSUFICIENTE:${dia}` }
        }
    }

    let total = 0

    for (const srv of target) {
        const dia = srv.dia_tipo as DiaTipo
        const sacos = sacosForDia(planRow, dia)

        if (opts.modo === 'rellenar') {
            const { count } = await supabase
                .from('ofrenda_plano_asignaciones')
                .select('*', { count: 'exact', head: true })
                .eq('servicio_id', srv.id)
            if ((count ?? 0) >= sacos * 2) continue
        } else if (opts.modo === 'regenerar' || opts.modo === 'generar') {
            await supabase.from('ofrenda_plano_asignaciones').delete().eq('servicio_id', srv.id)
        }

        const borradores = asignarPlanoServicio(dia, sacos, personas, parejas, historial)
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
        total += rows.length
    }

    revalidatePath('/dashboard/ofrenda')
    return { ok: true, asignados: total }
}
