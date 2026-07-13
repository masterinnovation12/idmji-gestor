'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/guards'
import { logMovimiento } from '@/lib/audit/logMovimiento'
import { validateCatalogoItem, type CatalogoItemInput, type CatalogoTipo } from './himnarioValidation'
import type { ActionResponse } from '@/types/database'

export interface CatalogoItem {
    id: number
    numero: number
    titulo: string
    duracion_segundos: number
    /** Nº de cultos que lo usan en su plan (bloquea la eliminación si > 0) */
    usos: number
}

const TABLA: Record<CatalogoTipo, 'himnos' | 'coros'> = { himno: 'himnos', coro: 'coros' }
const FK: Record<CatalogoTipo, 'himno_id' | 'coro_id'> = { himno: 'himno_id', coro: 'coro_id' }

function nombreTipo(tipo: CatalogoTipo): string {
    return tipo === 'himno' ? 'Himno' : 'Coro'
}

/** Catálogo completo con recuento de usos en planes de culto. */
export async function getCatalogo(tipo: CatalogoTipo): Promise<ActionResponse<CatalogoItem[]>> {
    const { ctx, error } = await requirePermission('himnario.gestionar')
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const [items, usos] = await Promise.all([
        ctx.supabase.from(TABLA[tipo]).select('id, numero, titulo, duracion_segundos').order('numero'),
        ctx.supabase.from('plan_himnos_coros').select(FK[tipo]).eq('tipo', tipo).not(FK[tipo], 'is', null),
    ])

    if (items.error) return { success: false, error: items.error.message }

    const conteo = new Map<number, number>()
    for (const row of usos.data ?? []) {
        const id = (row as Record<string, unknown>)[FK[tipo]] as number | null
        if (id != null) conteo.set(id, (conteo.get(id) ?? 0) + 1)
    }

    return {
        success: true,
        data: (items.data ?? []).map(item => ({
            id: item.id as number,
            numero: item.numero as number,
            titulo: (item.titulo as string) ?? '',
            duracion_segundos: (item.duracion_segundos as number) ?? 0,
            usos: conteo.get(item.id as number) ?? 0,
        })),
    }
}

/** Alta de himno/coro en el catálogo. */
export async function createCatalogoItem(
    tipo: CatalogoTipo,
    input: CatalogoItemInput,
): Promise<ActionResponse<void>> {
    const { ctx, error } = await requirePermission('himnario.gestionar')
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const validated = validateCatalogoItem(input)
    if (validated.error || !validated.data) return { success: false, error: validated.error }

    const { error: insertError } = await ctx.supabase.from(TABLA[tipo]).insert(validated.data)
    if (insertError) {
        if (insertError.code === '23505') return { success: false, error: 'NUMERO_DUPLICADO' }
        return { success: false, error: insertError.message }
    }

    await logMovimiento(
        ctx.supabase,
        ctx.userId,
        'admin_himnario',
        `${nombreTipo(tipo)} ${validated.data.numero} «${validated.data.titulo}» añadido al catálogo`,
    )

    revalidatePath('/dashboard/admin/himnario')
    revalidatePath('/dashboard/himnario')
    return { success: true }
}

/** Edición de himno/coro (número, título, duración). */
export async function updateCatalogoItem(
    tipo: CatalogoTipo,
    id: number,
    input: CatalogoItemInput,
): Promise<ActionResponse<void>> {
    const { ctx, error } = await requirePermission('himnario.gestionar')
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const validated = validateCatalogoItem(input)
    if (validated.error || !validated.data) return { success: false, error: validated.error }

    const { error: updateError } = await ctx.supabase
        .from(TABLA[tipo])
        .update(validated.data)
        .eq('id', id)

    if (updateError) {
        if (updateError.code === '23505') return { success: false, error: 'NUMERO_DUPLICADO' }
        return { success: false, error: updateError.message }
    }

    await logMovimiento(
        ctx.supabase,
        ctx.userId,
        'admin_himnario',
        `${nombreTipo(tipo)} ${validated.data.numero} «${validated.data.titulo}» actualizado`,
    )

    revalidatePath('/dashboard/admin/himnario')
    revalidatePath('/dashboard/himnario')
    return { success: true }
}

/**
 * Baja de himno/coro. Se bloquea si algún plan de culto lo usa
 * (integridad histórica: los planes pasados deben seguir siendo legibles).
 */
export async function deleteCatalogoItem(
    tipo: CatalogoTipo,
    id: number,
): Promise<ActionResponse<void>> {
    const { ctx, error } = await requirePermission('himnario.gestionar')
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { count } = await ctx.supabase
        .from('plan_himnos_coros')
        .select('id', { count: 'exact', head: true })
        .eq(FK[tipo], id)

    if ((count ?? 0) > 0) return { success: false, error: 'EN_USO' }

    const { data: item } = await ctx.supabase
        .from(TABLA[tipo])
        .select('numero, titulo')
        .eq('id', id)
        .maybeSingle()

    const { error: deleteError } = await ctx.supabase.from(TABLA[tipo]).delete().eq('id', id)
    if (deleteError) {
        // 23503: FK inesperada (carrera con un plan recién creado)
        if (deleteError.code === '23503') return { success: false, error: 'EN_USO' }
        return { success: false, error: deleteError.message }
    }

    await logMovimiento(
        ctx.supabase,
        ctx.userId,
        'admin_himnario',
        `${nombreTipo(tipo)} ${item?.numero ?? id} «${item?.titulo ?? ''}» eliminado del catálogo`,
    )

    revalidatePath('/dashboard/admin/himnario')
    revalidatePath('/dashboard/himnario')
    return { success: true }
}
