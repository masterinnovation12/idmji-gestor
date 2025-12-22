/**
 * Script para limpiar usuarios de prueba
 * 
 * Este script elimina todos los usuarios que no pertenecen al dominio @idmjisabadell.org
 * Ejecutar con: node scripts/cleanup_users.js
 * 
 * @author Antigravity AI
 * @date 2024-12-21
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const VALID_DOMAIN = '@idmjisabadell.org';

async function cleanupUsers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Faltan credenciales de Supabase. Verifica .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log('🔍 Obteniendo lista de usuarios...\n');

    // Get all users from auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('❌ Error al listar usuarios:', listError.message);
        process.exit(1);
    }

    console.log(`📊 Total de usuarios encontrados: ${users.length}\n`);

    // Filter users to delete (those not from valid domain)
    const usersToDelete = users.filter(user => {
        const email = user.email || '';
        return !email.endsWith(VALID_DOMAIN);
    });

    const usersToKeep = users.filter(user => {
        const email = user.email || '';
        return email.endsWith(VALID_DOMAIN);
    });

    console.log('✅ Usuarios a MANTENER (dominio válido):');
    usersToKeep.forEach(user => {
        console.log(`   - ${user.email}`);
    });

    console.log('\n❗ Usuarios a ELIMINAR:');
    usersToDelete.forEach(user => {
        console.log(`   - ${user.email}`);
    });

    if (usersToDelete.length === 0) {
        console.log('\n✨ No hay usuarios para eliminar. Todo limpio!');
        return;
    }

    console.log(`\n⚠️  Se eliminarán ${usersToDelete.length} usuarios...`);

    // Delete each user
    let deleted = 0;
    let errors = 0;

    for (const user of usersToDelete) {
        try {
            // First delete any avatar from storage
            const avatarPath = `${user.id}/`;
            await supabase.storage.from('avatars').remove([avatarPath]).catch(() => { });

            // Delete the auth user (profile should cascade via trigger)
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

            if (deleteError) {
                console.error(`   ❌ Error eliminando ${user.email}: ${deleteError.message}`);
                errors++;
            } else {
                console.log(`   ✓ Eliminado: ${user.email}`);
                deleted++;
            }
        } catch (err) {
            console.error(`   ❌ Error inesperado con ${user.email}:`, err.message);
            errors++;
        }
    }

    console.log('\n📋 Resumen:');
    console.log(`   ✓ Usuarios eliminados: ${deleted}`);
    console.log(`   ✗ Errores: ${errors}`);
    console.log(`   📧 Usuarios válidos restantes: ${usersToKeep.length}`);
}

cleanupUsers().catch(console.error);
