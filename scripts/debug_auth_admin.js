
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We need the SERVICE ROLE KEY for admin tasks like listing users
// I will try to read it from process.env, assuming it's in .env.local as SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Faltan variables. Asegúrate de que SUPABASE_SERVICE_ROLE_KEY esté en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function debugAuth() {
    console.log('🔍 Verificando estado del proyecto Supabase...');

    // 1. Try to list users (tests Admin API and DB connection)
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Error crítico accediendo a Auth Admin:', error.message);
        console.error('Status:', error.status);
        return;
    }

    console.log(`✅ Conexión exitosa via Admin API.`);
    console.log(`Total usuarios encontrados: ${users.users.length}`);

    // 2. Check specifically for jeffrey@idmji.test
    const jeffrey = users.users.find(u => u.email === 'jeffrey@idmji.test');

    if (jeffrey) {
        console.log('\n👤 Usuario Jeffrey encontrado:');
        console.log('ID:', jeffrey.id);
        console.log('Email Confirmed:', jeffrey.email_confirmed_at ? 'Sí' : 'No');
        console.log('Last Sign In:', jeffrey.last_sign_in_at);
        console.log('Banned:', jeffrey.banned_until ? 'Sí' : 'No');

        // 3. Try to update password to ensure it is what we think it is
        console.log('\n🔄 Intentando restablecer contraseña a "idmji2024" para asegurar acceso...');
        const { error: updateError } = await supabase.auth.admin.updateUser(jeffrey.id, {
            password: 'idmji2024',
            email_confirm: true
        });

        if (updateError) {
            console.error('❌ Error restableciendo contraseña:', updateError.message);
        } else {
            console.log('✅ Contraseña restablecida correctamente.');
        }

    } else {
        console.log('\n❌ El usuario jeffrey@idmji.test NO existe en la base de datos.');
    }

}

debugAuth();
