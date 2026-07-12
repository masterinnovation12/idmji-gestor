/**
 * Helper de servicio para el E2E de sedes y permisos.
 * Usa el service-role de .env.local (solo en local) para preparar y limpiar
 * datos de prueba: sede "E2E Barcelona", su usuario y su culto.
 */

import path from 'path'
import { readFileSync } from 'fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const E2E_SEDE = {
    nombre: 'E2E Barcelona',
    slug: 'e2e-barcelona',
    ciudad: 'Barcelona',
}

export const E2E_BCN_USER = {
    email: 'e2e.barcelona@idmjisabadell.org',
    password: 'E2eBarcelona2026!',
    nombre: 'E2E',
    apellidos: 'Barcelona',
}

function loadLocalEnv(): Record<string, string> {
    const envPath = path.join(process.cwd(), '.env.local')
    const out: Record<string, string> = {}
    for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
        const m = /^([A-Z0-9_]+)=(.*)$/.exec(line)
        if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
    return out
}

export function hasServiceRole(): boolean {
    try {
        const env = loadLocalEnv()
        return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
    } catch {
        return false
    }
}

export function serviceClient(): SupabaseClient {
    const env = loadLocalEnv()
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
    const { data } = await admin.auth.admin.listUsers()
    return data?.users?.find(u => u.email === email)?.id ?? null
}

/** Elimina restos de ejecuciones anteriores: usuario, cultos y sede E2E. */
export async function cleanupE2ESede(): Promise<void> {
    const admin = serviceClient()

    // 1. Usuario de prueba (Auth + profile por cascade)
    const userId = await findAuthUserByEmail(admin, E2E_BCN_USER.email)
    if (userId) {
        await admin.from('profiles').delete().eq('id', userId)
        await admin.auth.admin.deleteUser(userId).catch(() => undefined)
    }

    // 2. Datos operativos de la sede + la propia sede
    const { data: sede } = await admin.from('sedes').select('id').eq('slug', E2E_SEDE.slug).maybeSingle()
    if (sede?.id) {
        await admin.from('cultos').delete().eq('sede_id', sede.id)
        await admin.from('festivos').delete().eq('sede_id', sede.id)
        await admin.from('ofrenda_planes').delete().eq('sede_id', sede.id)
        await admin.from('ofrenda_miembros').delete().eq('sede_id', sede.id)
        await admin.from('ofrenda_plano_parejas').delete().eq('sede_id', sede.id)
        await admin.from('ofrenda_plano_personas').delete().eq('sede_id', sede.id)
        await admin.from('ofrenda_plano_layouts').delete().eq('sede_id', sede.id)
        await admin.from('movimientos').delete().eq('sede_id', sede.id)
        await admin.from('sedes').delete().eq('id', sede.id)
    }
}

export async function getSedeIdBySlug(slug: string): Promise<string | null> {
    const admin = serviceClient()
    const { data } = await admin.from('sedes').select('id').eq('slug', slug).maybeSingle()
    return data?.id ?? null
}

/**
 * Crea el usuario EDITOR de la sede E2E con un permiso recortado:
 * `cultos.editarDetalle: false` (no puede guardar el detalle del día).
 */
export async function createBarcelonaUser(sedeId: string): Promise<string> {
    const admin = serviceClient()

    const { data: created, error } = await admin.auth.admin.createUser({
        email: E2E_BCN_USER.email,
        password: E2E_BCN_USER.password,
        email_confirm: true,
        user_metadata: { nombre: E2E_BCN_USER.nombre, apellidos: E2E_BCN_USER.apellidos },
    })
    if (error || !created.user) throw new Error(`No se pudo crear el usuario E2E: ${error?.message}`)

    const { error: profileError } = await admin.from('profiles').upsert({
        id: created.user.id,
        email: E2E_BCN_USER.email,
        nombre: E2E_BCN_USER.nombre,
        apellidos: E2E_BCN_USER.apellidos,
        rol: 'EDITOR',
        pulpito: false,
        sede_id: sedeId,
        permisos: { 'cultos.editarDetalle': false },
    }, { onConflict: 'id' })
    if (profileError) throw new Error(`No se pudo crear el perfil E2E: ${profileError.message}`)

    return created.user.id
}

/** Crea un culto futuro en la sede E2E y devuelve su id. */
export async function createBarcelonaCulto(sedeId: string): Promise<string> {
    const admin = serviceClient()

    const { data: tipo } = await admin.from('culto_types').select('id').order('orden').limit(1).single()
    if (!tipo?.id) throw new Error('No hay tipos de culto en la BD')

    const fecha = new Date()
    fecha.setDate(fecha.getDate() + 7)
    const fechaStr = fecha.toISOString().slice(0, 10)

    const { data: culto, error } = await admin.from('cultos').insert({
        fecha: fechaStr,
        hora_inicio: '19:00',
        tipo_culto_id: tipo.id,
        estado: 'planeado',
        sede_id: sedeId,
    }).select('id').single()

    if (error || !culto) throw new Error(`No se pudo crear el culto E2E: ${error?.message}`)
    return culto.id
}
