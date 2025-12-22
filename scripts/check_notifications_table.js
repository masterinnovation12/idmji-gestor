// Script de verificación y migración de notificaciones
// Ejecutar con: node scripts/check_notifications_table.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Error: Faltan las credenciales en .env.local');
        console.log('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('🔍 Verificando tabla user_subscriptions...');

    // Intentar seleccionar de la tabla para ver si existe
    const { error } = await supabase.from('user_subscriptions').select('id').limit(1);

    if (error) {
        // El código '42P01' es "undefined_table" en Postgres
        if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.log('⚠️ La tabla NO existe. Creándola ahora...');
            await createTable(supabase);
        } else {
            console.error('❌ Error inesperado al consultar:', error.message);
        }
    } else {
        console.log('✅ La tabla user_subscriptions YA EXISTE. No es necesario hacer nada.');
    }
}

async function createTable(supabase) {
    const sql = `
    CREATE TABLE IF NOT EXISTS user_subscriptions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        endpoint text NOT NULL UNIQUE,
        p256dh text NOT NULL,
        auth text NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

    ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'Users can manage own subscriptions'
        ) THEN
            CREATE POLICY "Users can manage own subscriptions" ON user_subscriptions
                FOR ALL USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'Service role has full access'
        ) THEN
            CREATE POLICY "Service role has full access" ON user_subscriptions
                FOR ALL USING (auth.jwt()->>'role' = 'service_role');
        END IF;
    END
    $$;
    `;

    // Usamos rpc si existe una función para ejecutar SQL, o intentamos crearla si tenemos permisos,
    // pero como suele ser restringido, usaremos la API de Postgres si es posible o avisaremos al usuario.
    // NOTA: Supabase-js estándar no permite ejecutar CREATE TABLE directamente desde el cliente
    // a menos que tengamos una función RPC 'exec_sql' o similar habilitada.

    // Intentamos llamar a una función RPC común si existe, si no, mostramos el SQL para el usuario.

    try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
            console.log('\n⚠️ No se pudo crear la tabla automáticamente (falta función exec_sql).');
            console.log('📋 Ejecuta este SQL en el Editor de Supabase:');
            console.log(sql);
        } else {
            console.log('✅ Tabla creada exitosamente vía RPC.');
        }
    } catch (e) {
        console.log('\n⚠️ No se pudo crear la tabla automáticamente.');
        console.log('📋 Por favor, ve al Dashboard de Supabase > SQL Editor y ejecuta:');
        console.log('----------------------------------------------------');
        console.log(sql);
        console.log('----------------------------------------------------');
    }
}

main().catch(console.error);
