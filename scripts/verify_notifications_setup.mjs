#!/usr/bin/env node
/**
 * Script de verificación del sistema de notificaciones push.
 * Ejecutar: node scripts/verify_notifications_setup.mjs
 *
 * Comprueba:
 * - Variables VAPID
 * - Tabla user_subscriptions en Supabase
 * - Endpoint de cron (si URL configurada)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.local') })

const checks = { ok: 0, fail: 0, skip: 0 }

function pass(msg) {
  console.log(`  ✅ ${msg}`)
  checks.ok++
}

function fail(msg) {
  console.log(`  ❌ ${msg}`)
  checks.fail++
}

function skip(msg) {
  console.log(`  ⏭️  ${msg}`)
  checks.skip++
}

async function main() {
  console.log('\n🔔 Verificación del sistema de notificaciones push\n')
  console.log('─'.repeat(50))

  // 1. VAPID Keys
  console.log('\n1. Variables VAPID')
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@idmji.org'

  if (vapidPublic && vapidPublic.length >= 50) {
    pass(`NEXT_PUBLIC_VAPID_PUBLIC_KEY configurada (${vapidPublic.length} chars)`)
  } else {
    fail('NEXT_PUBLIC_VAPID_PUBLIC_KEY falta o es inválida (mín. 50 chars)')
  }

  if (vapidPrivate && vapidPrivate.length >= 20) {
    pass('VAPID_PRIVATE_KEY configurada')
  } else {
    fail('VAPID_PRIVATE_KEY falta o es inválida')
  }

  pass(`VAPID_SUBJECT: ${vapidSubject}`)

  // 2. Supabase
  console.log('\n2. Supabase')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    fail('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  } else {
    pass('Credenciales Supabase configuradas')

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id')
        .limit(1)

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          fail('Tabla user_subscriptions NO existe. Ejecuta: node scripts/check_notifications_table.js')
        } else {
          fail(`Error al consultar: ${error.message}`)
        }
      } else {
        pass('Tabla user_subscriptions existe y es accesible')
      }
    } catch (err) {
      fail(`Error de conexión: ${err.message}`)
    }
  }

  // 3. CRON
  console.log('\n3. Cron de recordatorios')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    pass('CRON_SECRET configurado')
  } else {
    skip('CRON_SECRET no configurado (cron no podrá autenticarse)')
  }

  // 4. Resumen
  console.log('\n' + '─'.repeat(50))
  console.log(`\nResumen: ${checks.ok} OK, ${checks.fail} fallos, ${checks.skip} omitidos\n`)

  if (checks.fail > 0) {
    console.log('💡 Para generar VAPID keys: npx web-push generate-vapid-keys')
    console.log('💡 Para crear la tabla: node scripts/check_notifications_table.js\n')
    process.exit(1)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
