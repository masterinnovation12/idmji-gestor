// Script simple para limpiar usuarios
// Ejecutar con: npx tsx --no-deprecation scripts/cleanup_simple.ts

import 'dotenv/config'

const VALID_DOMAIN = '@idmjisabadell.org';

async function main() {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Faltan credenciales de Supabase');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log('Obteniendo usuarios...');
    const { data } = await supabase.auth.admin.listUsers();

    if (!data?.users) {
        console.log('No se encontraron usuarios');
        return;
    }

    const toDelete = data.users.filter(u => !u.email?.endsWith(VALID_DOMAIN));
    const toKeep = data.users.filter(u => u.email?.endsWith(VALID_DOMAIN));

    console.log('\nUsuarios a mantener:', toKeep.map(u => u.email).join(', '));
    console.log('\nUsuarios a eliminar:', toDelete.map(u => u.email).join(', '));
    console.log(`\nTotal: ${toDelete.length} usuarios a eliminar`);

    for (const user of toDelete) {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
            console.log(`Error eliminando ${user.email}: ${error.message}`);
        } else {
            console.log(`Eliminado: ${user.email}`);
        }
    }

    console.log('\nListo!');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
