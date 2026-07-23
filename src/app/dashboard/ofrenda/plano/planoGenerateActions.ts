'use server'

import { revalidatePath } from 'next/cache'
import { requireEditor } from './planoAuth'
import {
    ejecutarEliminacionPlano,
    ejecutarGeneracionPlano,
    type PlanoGenerateOptions,
} from './planoGenerateCore'

export type {
    PlanoGenerateMode,
    PlanoGenerateOptions,
    PlanoGenerateScope,
} from './planoGenerateCore'

/**
 * Elimina las asignaciones del plano para el alcance seleccionado
 * (día, semana o mes). No toca el plan general ni sus servicios.
 */
export async function eliminarPlanoAsignaciones(
    opts: Omit<PlanoGenerateOptions, 'modo'>,
): Promise<{ ok: true; eliminados: number } | { ok: false; error: string }> {
    const { error: authError, supabase, sedeId } = await requireEditor()
    if (authError || !supabase) return { ok: false, error: authError ?? 'no_permission' }

    const result = await ejecutarEliminacionPlano(supabase, sedeId, opts)
    if (result.ok) revalidatePath('/dashboard/ofrenda')
    return result
}

export async function generarPlanoLabor(
    opts: PlanoGenerateOptions,
): Promise<{ ok: true; asignados: number } | { ok: false; error: string }> {
    const { error: authError, supabase, sedeId } = await requireEditor()
    if (authError || !supabase) return { ok: false, error: authError ?? 'no_permission' }

    const result = await ejecutarGeneracionPlano(supabase, sedeId, opts)
    if (result.ok) revalidatePath('/dashboard/ofrenda')
    return result
}
