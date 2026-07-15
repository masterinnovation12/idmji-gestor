'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import { logMovimiento } from '@/lib/audit/logMovimiento'
import type { ActionResponse, Sede } from '@/types/database'

/**
 * Gestión de personas por sede desde administración (solo ADMIN):
 * hermanos de púlpito (perfiles), miembros de labor general y personas del
 * plano de ofrenda. Permite añadir, renombrar y activar/desactivar sin salir
 * del panel, para cualquier sede.
 */

export interface PersonaPulpito {
    id: string
    nombre: string
    apellidos: string
    email: string | null
    rol: string
    pulpito: boolean
}

export interface PersonaLabor {
    id: string
    nombre: string
    grupo: 1 | 2 | 3
    orden: number
    activo: boolean
}

export interface PersonaPlano {
    id: string
    nombre: string
    capacidad: string
    genero: string | null
    activo: boolean
}

export interface PersonasSede {
    pulpito: PersonaPulpito[]
    labor: PersonaLabor[]
    plano: PersonaPlano[]
}

function normalizarNombre(nombre: string): string {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

export async function getPersonasBootstrap(): Promise<
    ActionResponse<Pick<Sede, 'id' | 'nombre' | 'slug' | 'activo' | 'es_principal'>[]>
> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data, error: qError } = await ctx.supabase
        .from('sedes')
        .select('id, nombre, slug, activo, es_principal')
        .order('es_principal', { ascending: false })
        .order('nombre')
    if (qError) return { success: false, error: qError.message }
    return { success: true, data: data ?? [] }
}

export async function getPersonasSede(sedeId: string): Promise<ActionResponse<PersonasSede>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const [perfiles, labor, plano] = await Promise.all([
        ctx.supabase
            .from('profiles')
            .select('id, nombre, apellidos, email, rol, pulpito')
            .eq('sede_id', sedeId)
            .order('nombre'),
        ctx.supabase
            .from('ofrenda_miembros')
            .select('id, nombre, grupo, orden, activo')
            .eq('sede_id', sedeId)
            .order('grupo')
            .order('orden'),
        ctx.supabase
            .from('ofrenda_plano_personas')
            .select('id, nombre, capacidad, genero, activo')
            .eq('sede_id', sedeId)
            .order('nombre'),
    ])

    if (perfiles.error) return { success: false, error: perfiles.error.message }
    if (labor.error) return { success: false, error: labor.error.message }
    if (plano.error) return { success: false, error: plano.error.message }

    return {
        success: true,
        data: {
            pulpito: (perfiles.data ?? []).map(p => ({
                id: p.id,
                nombre: p.nombre ?? '',
                apellidos: p.apellidos ?? '',
                email: p.email ?? null,
                rol: p.rol ?? 'MIEMBRO',
                pulpito: !!p.pulpito,
            })),
            labor: (labor.data ?? []) as PersonaLabor[],
            plano: (plano.data ?? []) as PersonaPlano[],
        },
    }
}

const perfilSchema = z.object({
    id: z.string().uuid(),
    nombre: z.string().trim().min(1).max(80),
    apellidos: z.string().trim().min(1).max(120),
    pulpito: z.boolean(),
})

/** Renombra un perfil (púlpito) desde admin; sincroniza metadatos de Auth. */
export async function updatePersonaPulpito(input: {
    id: string
    nombre: string
    apellidos: string
    pulpito: boolean
    sedeId: string
}): Promise<ActionResponse<void>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const parsed = perfilSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Datos inválidos' }

    const admin = createAdminClient()
    const { error: updateError } = await admin
        .from('profiles')
        .update({ nombre: parsed.data.nombre, apellidos: parsed.data.apellidos, pulpito: parsed.data.pulpito })
        .eq('id', parsed.data.id)
    if (updateError) return { success: false, error: updateError.message }

    await admin.auth.admin.updateUserById(parsed.data.id, {
        user_metadata: { nombre: parsed.data.nombre, apellidos: parsed.data.apellidos },
    })

    await logMovimiento(
        ctx.supabase,
        ctx.userId,
        'admin_personas',
        `Perfil «${parsed.data.nombre} ${parsed.data.apellidos}» actualizado desde admin`,
        input.sedeId,
    )
    revalidatePath('/dashboard/admin/personas')
    return { success: true }
}

const laborSchema = z.object({
    id: z.string().uuid().optional(),
    sedeId: z.string().uuid(),
    nombre: z.string().trim().min(1).max(80),
    grupo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    activo: z.boolean(),
})

/** Crea o actualiza un miembro de labor general de cualquier sede. */
export async function savePersonaLabor(input: {
    id?: string
    sedeId: string
    nombre: string
    grupo: 1 | 2 | 3
    activo: boolean
}): Promise<ActionResponse<void>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const parsed = laborSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Datos inválidos' }

    if (parsed.data.id) {
        const { error: updateError } = await ctx.supabase
            .from('ofrenda_miembros')
            .update({ nombre: parsed.data.nombre, grupo: parsed.data.grupo, activo: parsed.data.activo })
            .eq('id', parsed.data.id)
        if (updateError) return { success: false, error: updateError.message }
    } else {
        const { data: last } = await ctx.supabase
            .from('ofrenda_miembros')
            .select('orden')
            .eq('sede_id', parsed.data.sedeId)
            .eq('grupo', parsed.data.grupo)
            .order('orden', { ascending: false })
            .limit(1)
            .maybeSingle()
        const { error: insertError } = await ctx.supabase.from('ofrenda_miembros').insert({
            sede_id: parsed.data.sedeId,
            nombre: parsed.data.nombre,
            grupo: parsed.data.grupo,
            orden: (last?.orden ?? 0) + 1,
            activo: parsed.data.activo,
            puede_jueves: true,
            puede_domingo_manana: true,
            puede_domingo_tarde: true,
        })
        if (insertError) return { success: false, error: insertError.message }
    }

    await logMovimiento(
        ctx.supabase,
        ctx.userId,
        'admin_personas',
        `Miembro de labor «${parsed.data.nombre}» ${parsed.data.id ? 'actualizado' : 'creado'} desde admin`,
        parsed.data.sedeId,
    )
    revalidatePath('/dashboard/admin/personas')
    revalidatePath('/dashboard/ofrenda')
    return { success: true }
}

const planoSchema = z.object({
    id: z.string().uuid().optional(),
    sedeId: z.string().uuid(),
    nombre: z.string().trim().min(1).max(80),
    capacidad: z.enum(['ofrendario', 'apoyo', 'ambos']),
    activo: z.boolean(),
})

/** Crea o actualiza una persona del plano de ofrenda de cualquier sede. */
export async function savePersonaPlano(input: {
    id?: string
    sedeId: string
    nombre: string
    capacidad: 'ofrendario' | 'apoyo' | 'ambos'
    activo: boolean
}): Promise<ActionResponse<void>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const parsed = planoSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: 'Datos inválidos' }

    const payload = {
        nombre: parsed.data.nombre,
        nombre_normalizado: normalizarNombre(parsed.data.nombre),
        capacidad: parsed.data.capacidad,
        activo: parsed.data.activo,
    }

    if (parsed.data.id) {
        const { error: updateError } = await ctx.supabase
            .from('ofrenda_plano_personas')
            .update(payload)
            .eq('id', parsed.data.id)
        if (updateError) {
            if (updateError.code === '23505') return { success: false, error: 'DUPLICADA' }
            return { success: false, error: updateError.message }
        }
    } else {
        const { error: insertError } = await ctx.supabase.from('ofrenda_plano_personas').insert({
            ...payload,
            sede_id: parsed.data.sedeId,
            puede_jueves: true,
            puede_domingo_manana: true,
            puede_domingo_tarde: true,
        })
        if (insertError) {
            if (insertError.code === '23505') return { success: false, error: 'DUPLICADA' }
            return { success: false, error: insertError.message }
        }
    }

    await logMovimiento(
        ctx.supabase,
        ctx.userId,
        'admin_personas',
        `Persona del plano «${parsed.data.nombre}» ${parsed.data.id ? 'actualizada' : 'creada'} desde admin`,
        parsed.data.sedeId,
    )
    revalidatePath('/dashboard/admin/personas')
    revalidatePath('/dashboard/ofrenda')
    return { success: true }
}
