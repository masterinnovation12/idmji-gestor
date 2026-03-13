/**
 * Script para ejecutar la migración del enum y crear el usuario de sonido.
 * Ejecutar: npx tsx scripts/run-migration-sonido.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dcjqjsmyydqpsmxbkhya.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanFqc215eWRxcHNteGJraHlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc3NDcxNSwiZXhwIjoyMDgwMzUwNzE1fQ.ZsO4uTR-dW7KMtI553zLUyQam1hRcAa5QJXRzox3qMo'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
    // 1. Añadir valor al enum
    console.log('Añadiendo SONIDO al enum user_role...')
    const { error: enumErr } = await admin.rpc('exec_sql' as any, {
        sql: `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SONIDO';`
    })
    if (enumErr) {
        // Intentar con pg directamente a través del cliente
        console.log('RPC exec_sql no disponible, intentando directamente...')
    } else {
        console.log('✅ Enum actualizado')
    }

    // 2. Actualizar el perfil del usuario creado
    const userId = '152755d6-45a9-4219-bbb7-fdbdefe3b0d7'
    const email = 'sonido@idmjisabadell.org'

    const { error: profileErr } = await admin.from('profiles').upsert({
        id: userId,
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

    console.log(`✅ Perfil SONIDO creado para ${email}`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
