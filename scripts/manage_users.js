
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Faltan variables. Asegúrate de que SUPABASE_SERVICE_ROLE_KEY esté en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const usersToCreate = [
    { email: 'jeffrey@idmjisabadell.org', role: 'ADMIN', name: 'Jeffrey Bolaños' },
    { email: 'carlos@idmjisabadell.org', role: 'ADMIN', name: 'Carlos Sanchez' },
    { email: 'hugo@idmjisabadell.org', role: 'EDITOR', name: 'Hugo Bolaños' },
    { email: 'alejandro@idmjisabadell.org', role: 'EDITOR', name: 'Alejandro Perez' },
    { email: 'sebastian@idmjisabadell.org', role: 'EDITOR', name: 'Sebastian Villegas' },
    { email: 'andres@idmjisabadell.org', role: 'EDITOR', name: 'Andres Zapata' },
    { email: 'rafael@idmjisabadell.org', role: 'EDITOR', name: 'Rafael Quer' },
];

const GENERAL_PASSWORD = 'idmji2024';

async function manageUsers() {
    console.log('🚀 Iniciando creación de usuarios...');

    for (const user of usersToCreate) {
        console.log(`\nProcesando usuario: ${user.email} (${user.role})`);

        // Create User
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: GENERAL_PASSWORD,
            email_confirm: true,
            user_metadata: {
                full_name: user.name,
                role: user.role
            }
        });

        if (createError) {
            console.error(`Error creando usuario: ${createError.message}`);
        } else {
            console.log(`✅ Usuario creado exitosamente: ${newUser.user.id}`);

            // Split name
            const parts = user.name.split(' ');
            const nombre = parts[0];
            const apellidos = parts.slice(1).join(' ');

            // Update 'profiles' table locally
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: newUser.user.id,
                    email: user.email,
                    nombre: nombre,
                    apellidos: apellidos,
                    rol: user.role,
                    updated_at: new Date().toISOString()
                });

            if (profileError) {
                console.warn(`Advertencia al actualizar perfil: ${profileError.message}`);
            } else {
                console.log('Perfil actualizado en base de datos.');
            }
        }
    }
    console.log('\n✨ Proceso finalizado.');
}

manageUsers();
