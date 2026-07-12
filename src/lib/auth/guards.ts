import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { can, canAny, type PermissionKey, type PermisosOverrides } from '@/lib/auth/permissions'

/**
 * Guards de autorización para server actions. Sustituyen a los
 * requireEditor/requireAdmin/isAdmin duplicados por módulo.
 *
 * Capas de defensa: RLS (aislamiento por sede + gate grueso por permiso) +
 * estos guards (permiso fino por acción) + UI (ocultar controles).
 */

export interface SessionProfile {
    id: string
    rol: string | null
    permisos: PermisosOverrides
    sede_id: string | null
}

export interface SessionContext {
    supabase: SupabaseClient
    userId: string
    profile: SessionProfile
}

export type GuardResult =
    | { ctx: SessionContext; error: null }
    | { ctx: null; error: string }

/** Usuario autenticado con su perfil (rol, permisos, sede). */
export async function requireUser(): Promise<GuardResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ctx: null, error: 'No autenticado' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, rol, permisos, sede_id')
        .eq('id', user.id)
        .single()

    if (!profile) return { ctx: null, error: 'Perfil no encontrado' }

    return {
        error: null,
        ctx: {
            supabase,
            userId: user.id,
            profile: {
                id: profile.id,
                rol: profile.rol ?? null,
                permisos: (profile.permisos ?? {}) as PermisosOverrides,
                sede_id: (profile.sede_id as string | null) ?? null,
            },
        },
    }
}

/** Solo ADMIN. */
export async function requireAdmin(): Promise<GuardResult> {
    const res = await requireUser()
    if (res.error !== null) return res
    if (res.ctx.profile.rol !== 'ADMIN') return { ctx: null, error: 'Sin permisos' }
    return res
}

/** Usuario con el permiso granular indicado (ADMIN siempre pasa). */
export async function requirePermission(perm: PermissionKey): Promise<GuardResult> {
    const res = await requireUser()
    if (res.error !== null) return res
    if (!can(res.ctx.profile, perm)) return { ctx: null, error: 'Sin permisos' }
    return res
}

/** Usuario con al menos uno de los permisos indicados. */
export async function requireAnyPermission(perms: readonly PermissionKey[]): Promise<GuardResult> {
    const res = await requireUser()
    if (res.error !== null) return res
    if (!canAny(res.ctx.profile, perms)) return { ctx: null, error: 'Sin permisos' }
    return res
}
