'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { requireAdmin, requireUser } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVE_SEDE_COOKIE } from '@/lib/sede/activeSede'
import type { ActionResponse, Sede } from '@/types/database'

export interface SedeConStats extends Sede {
    usuarios: number
    cultos: number
}

const sedeSchema = z.object({
    nombre: z.string().trim().min(2).max(80),
    ciudad: z.string().trim().max(80).optional().or(z.literal('')),
    direccion: z.string().trim().max(160).optional().or(z.literal('')),
    email_dominio: z
        .string()
        .trim()
        .regex(/^@[a-z0-9.-]+\.[a-z]{2,}$/i, 'Dominio inválido')
        .optional()
        .or(z.literal('')),
})

function slugify(nombre: string): string {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/** Lista de sedes con contadores (solo ADMIN). */
export async function getSedes(): Promise<ActionResponse<SedeConStats[]>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data: sedes, error: sedesError } = await ctx.supabase
        .from('sedes')
        .select('*')
        .order('es_principal', { ascending: false })
        .order('nombre')

    if (sedesError) return { success: false, error: sedesError.message }

    const admin = createAdminClient()
    const stats = await Promise.all(
        (sedes ?? []).map(async (sede) => {
            const [usuarios, cultos] = await Promise.all([
                admin.from('profiles').select('id', { count: 'exact', head: true }).eq('sede_id', sede.id),
                admin.from('cultos').select('id', { count: 'exact', head: true }).eq('sede_id', sede.id),
            ])
            return {
                ...(sede as Sede),
                usuarios: usuarios.count ?? 0,
                cultos: cultos.count ?? 0,
            }
        }),
    )

    return { success: true, data: stats }
}

/** Crea una sede nueva (solo ADMIN). */
export async function createSede(input: {
    nombre: string
    ciudad?: string
    direccion?: string
    email_dominio?: string
}): Promise<ActionResponse<Sede>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const parsed = sedeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Datos inválidos' }

    const slug = slugify(parsed.data.nombre)
    if (!slug) return { success: false, error: 'Nombre inválido' }

    const { data, error: insertError } = await ctx.supabase
        .from('sedes')
        .insert({
            nombre: parsed.data.nombre,
            slug,
            ciudad: parsed.data.ciudad || null,
            direccion: parsed.data.direccion || null,
            email_dominio: parsed.data.email_dominio?.toLowerCase() || null,
        })
        .select()
        .single()

    if (insertError) {
        if (insertError.code === '23505') return { success: false, error: 'DUPLICADA' }
        return { success: false, error: insertError.message }
    }

    revalidatePath('/dashboard/admin/sedes')
    return { success: true, data: data as Sede }
}

/** Actualiza datos de una sede (solo ADMIN). */
export async function updateSede(
    id: string,
    input: { nombre: string; ciudad?: string; direccion?: string; email_dominio?: string; activo?: boolean },
): Promise<ActionResponse<Sede>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const parsed = sedeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Datos inválidos' }

    const { data: current } = await ctx.supabase.from('sedes').select('es_principal').eq('id', id).single()
    if (!current) return { success: false, error: 'Sede no encontrada' }

    // La sede principal no puede desactivarse
    if (current.es_principal && input.activo === false) {
        return { success: false, error: 'PRINCIPAL_NO_DESACTIVABLE' }
    }

    const { data, error: updateError } = await ctx.supabase
        .from('sedes')
        .update({
            nombre: parsed.data.nombre,
            ciudad: parsed.data.ciudad || null,
            direccion: parsed.data.direccion || null,
            email_dominio: parsed.data.email_dominio?.toLowerCase() || null,
            ...(typeof input.activo === 'boolean' ? { activo: input.activo } : {}),
        })
        .eq('id', id)
        .select()
        .single()

    if (updateError) return { success: false, error: updateError.message }

    revalidatePath('/dashboard/admin/sedes')
    return { success: true, data: data as Sede }
}

/**
 * Elimina una sede (solo ADMIN). Solo se permite si está vacía:
 * sin usuarios ni datos operativos (los FKs con ON DELETE RESTRICT lo garantizan).
 */
export async function deleteSede(id: string): Promise<ActionResponse<void>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data: sede } = await ctx.supabase.from('sedes').select('es_principal').eq('id', id).single()
    if (!sede) return { success: false, error: 'Sede no encontrada' }
    if (sede.es_principal) return { success: false, error: 'PRINCIPAL_NO_ELIMINABLE' }

    const { error: deleteError } = await ctx.supabase.from('sedes').delete().eq('id', id)
    if (deleteError) {
        // 23503 = restrict: la sede tiene datos asociados
        if (deleteError.code === '23503') return { success: false, error: 'SEDE_CON_DATOS' }
        return { success: false, error: deleteError.message }
    }

    // Si la sede eliminada era la activa del admin, limpiar cookie
    const cookieStore = await cookies()
    if (cookieStore.get(ACTIVE_SEDE_COOKIE)?.value === id) {
        cookieStore.delete(ACTIVE_SEDE_COOKIE)
    }

    revalidatePath('/dashboard/admin/sedes')
    return { success: true }
}

/** Datos para el selector de sede del sidebar (solo ADMIN ve el selector). */
export async function getSedeSwitcherData(): Promise<
    ActionResponse<{ sedes: Pick<Sede, 'id' | 'nombre' | 'slug' | 'activo'>[]; activeSedeId: string | null }>
> {
    const { ctx, error } = await requireUser()
    if (error || !ctx) return { success: false, error: error ?? 'No autenticado' }
    if (ctx.profile.rol !== 'ADMIN') return { success: true, data: { sedes: [], activeSedeId: null } }

    const { data: sedes, error: sedesError } = await ctx.supabase
        .from('sedes')
        .select('id, nombre, slug, activo')
        .order('es_principal', { ascending: false })
        .order('nombre')

    if (sedesError) return { success: false, error: sedesError.message }

    const cookieStore = await cookies()
    const fromCookie = cookieStore.get(ACTIVE_SEDE_COOKIE)?.value
    const valid = (sedes ?? []).some(s => s.id === fromCookie)
    const activeSedeId = valid ? (fromCookie as string) : ctx.profile.sede_id

    return { success: true, data: { sedes: sedes ?? [], activeSedeId } }
}

/** Cambia la sede activa del ADMIN (cookie). */
export async function setActiveSede(sedeId: string): Promise<ActionResponse<void>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data } = await ctx.supabase.from('sedes').select('id').eq('id', sedeId).maybeSingle()
    if (!data) return { success: false, error: 'Sede no encontrada' }

    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_SEDE_COOKIE, sedeId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
    })

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}
