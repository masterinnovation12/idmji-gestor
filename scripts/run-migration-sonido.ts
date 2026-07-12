/**
 * OBSOLETO: el valor 'SONIDO' del enum user_role se añade en la migración
 * 20260711120000_sedes_y_permisos.sql. Se conserva solo como utilidad para
 * crear/reparar el perfil del usuario de sonido.
 *
 * Ejecutar: npx tsx scripts/run-migration-sonido.ts
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 * (nunca hardcodear claves en el repositorio).
 */
import { readFileSync } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnv(): Record<string, string> {
    const out: Record<string, string> = {}
    const content = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split(/\r?\n/)) {
        const m = /^([A-Z0-9_]+)=(.*)$/.exec(line)
        if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
    return out
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
    process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
    const email = 'sonido@idmjisabadell.org'

    const { data } = await admin.auth.admin.listUsers()
    const user = data?.users?.find(u => u.email === email)
    if (!user) {
        console.error(`No existe el usuario ${email} en Auth; créalo primero.`)
        process.exit(1)
    }

    const { error: profileErr } = await admin.from('profiles').upsert({
        id: user.id,
        nombre: 'Sonido',
        apellidos: 'IDMJI',
        email,
        rol: 'SONIDO',
        pulpito: false,
    })

    if (profileErr) {
        console.error('❌ Error al crear perfil:', profileErr)
        process.exit(1)
    }

    console.log(`✅ Perfil SONIDO listo para ${email}`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
