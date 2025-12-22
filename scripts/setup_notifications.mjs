/**
 * Script para crear la tabla user_subscriptions en Supabase
 * Ejecutar con: node scripts/setup_notifications.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env.local') });

async function setupNotifications() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Faltan credenciales de Supabase. Verifica .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('🔔 Configurando sistema de notificaciones push...\n');

    // Leer el SQL de migración
    const sqlPath = resolve(__dirname, 'migrations/001_user_subscriptions.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('📝 Ejecutando migración SQL...');

    // Ejecutar cada statement por separado
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' }).single();
            if (error && !error.message.includes('already exists')) {
                console.log(`⚠️  Warning: ${error.message}`);
            }
        } catch (err) {
            // Ignorar errores de "ya existe"
        }
    }

    // Verificar que la tabla existe
    const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id')
        .limit(1);

    if (error && error.message.includes('does not exist')) {
        console.log('\n⚠️  La tabla no se creó automáticamente.');
        console.log('📋 Por favor, ejecuta el siguiente SQL manualmente en el editor de Supabase:\n');
        console.log('------- COPIAR DESDE AQUÍ -------');
        console.log(sql);
        console.log('------- HASTA AQUÍ -------\n');
        console.log('🔗 Ir a: https://supabase.com/dashboard > SQL Editor');
    } else {
        console.log('✅ Tabla user_subscriptions verificada correctamente');
    }

    // Verificar VAPID keys
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    console.log('\n📋 Estado de VAPID Keys:');
    console.log(`   Public Key: ${vapidPublic ? '✅ Configurada' : '❌ Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY'}`);
    console.log(`   Private Key: ${vapidPrivate ? '✅ Configurada' : '❌ Falta VAPID_PRIVATE_KEY'}`);

    if (!vapidPublic || !vapidPrivate) {
        console.log('\n💡 Para generar VAPID keys, ejecuta:');
        console.log('   npx web-push generate-vapid-keys');
        console.log('\n   Luego añade las keys a tu .env.local:');
        console.log('   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public_key>');
        console.log('   VAPID_PRIVATE_KEY=<private_key>');
    }

    console.log('\n✨ Configuración completada!');
    process.exit(0);
}

setupNotifications().catch(err => {
    console.error(err);
    process.exit(1);
});
