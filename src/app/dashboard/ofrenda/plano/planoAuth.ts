'use server'

import { requireAnyPermission } from '@/lib/auth/guards'
import { resolveActiveSedeId } from '@/lib/sede/activeSede'

export type PlanoAuthError = 'no_auth' | 'no_permission'

/**
 * Guard del plano del templo: permiso granular `laborPlano.gestionar`
 * (o `hermanos.gestionar` para el directorio de personas).
 * Devuelve además la sede efectiva para scoping de consultas.
 */
export async function requireEditor() {
    const { ctx, error } = await requireAnyPermission(['laborPlano.gestionar', 'hermanos.gestionar'])
    if (error === 'No autenticado') {
        return { error: 'no_auth' as PlanoAuthError, supabase: null, userId: null, sedeId: null }
    }
    if (error || !ctx) {
        return { error: 'no_permission' as PlanoAuthError, supabase: null, userId: null, sedeId: null }
    }
    const sedeId = await resolveActiveSedeId(ctx)
    return { error: null, supabase: ctx.supabase, userId: ctx.userId, sedeId }
}
