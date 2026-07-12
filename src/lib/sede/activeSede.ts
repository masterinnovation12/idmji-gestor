import { cookies } from 'next/headers'
import type { SessionContext } from '@/lib/auth/guards'

/**
 * Sede activa del ADMIN (cookie). Los usuarios no-admin están siempre
 * limitados a su propia sede (la cookie se ignora y la RLS lo garantiza).
 */
export const ACTIVE_SEDE_COOKIE = 'idmji-sede-activa'

/**
 * Resuelve la sede efectiva para las consultas del usuario actual:
 * - No-ADMIN → siempre su sede asignada.
 * - ADMIN → la sede activa elegida (cookie) si existe y es válida; si no, la suya.
 */
export async function resolveActiveSedeId(ctx: SessionContext): Promise<string | null> {
    if (ctx.profile.rol !== 'ADMIN') return ctx.profile.sede_id

    const cookieStore = await cookies()
    const fromCookie = cookieStore.get(ACTIVE_SEDE_COOKIE)?.value
    if (fromCookie) {
        const { data } = await ctx.supabase
            .from('sedes')
            .select('id')
            .eq('id', fromCookie)
            .maybeSingle()
        if (data?.id) return data.id
    }
    return ctx.profile.sede_id
}
