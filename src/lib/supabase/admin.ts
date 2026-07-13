import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service-role (bypassa RLS). SOLO en servidor y solo
 * cuando la operación lo exige (p. ej. un ADMIN editando el perfil de otro
 * usuario, o crear/eliminar usuarios de Auth). Nunca importar desde cliente.
 */
export function createAdminClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        const missing = []
        if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
        if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
        throw new Error(`Falta configuración de Supabase: ${missing.join(', ')}`)
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
