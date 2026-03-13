/**
 * Script para crear el usuario de sonido en Supabase.
 * Ejecutar: npx tsx scripts/create-sonido-user.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dcjqjsmyydqpsmxbkhya.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanFqc215eWRxcHNteGJraHlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc3NDcxNSwiZXhwIjoyMDgwMzUwNzE1fQ.ZsO4uTR-dW7KMtI553zLUyQam1hRcAa5QJXRzox3qMo'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
    const userId = '152755d6-45a9-4219-bbb7-fdbdefe3b0d7'
    const email = 'sonido@idmjisabadell.org'

    // Comprobar qué roles existen en el enum
    const { data: roles } = await admin.from('profiles').select('rol').limit(20)
    const existingRoles = new Set(roles?.map((r: any) => r.rol) || [])
    console.log('Roles existentes en DB:', [...existingRoles])

    // Intentar insertar con SONIDO usando la API de gestión HTTP
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/add_user_role_sonido`, {
        method: 'POST',
        headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
        }
    })
    console.log('RPC status:', response.status)

    // Intentar con diferentes valores de rol según lo que exista
    const rolesToTry = ['SONIDO', 'USER', 'MIEMBRO', 'EDITOR']
    let usedRol = 'MIEMBRO'

    for (const rol of rolesToTry) {
        const { error } = await admin.from('profiles').upsert({
            id: userId,
            nombre: 'Sonido',
            apellidos: 'IDMJI',
            email,
            rol,
            pulpito: false,
        })
        if (!error) {
            usedRol = rol
            console.log(`✅ Perfil creado con rol: ${rol}`)
            break
        } else {
            console.log(`❌ ${rol} falló: ${error.message}`)
        }
    }

    console.log(`\nUsuario creado:`)
    console.log(`  email: ${email}`)
    console.log(`  password: idmji2024`)
    console.log(`  id: ${userId}`)
    console.log(`  rol en DB: ${usedRol}`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
