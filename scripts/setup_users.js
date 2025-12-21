const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const usersToCreate = [
    { email: 'jeffrey@idmjisabadell.org', nombre: 'Jeffrey', apellidos: 'Bolaños', rol: 'admin' },
    { email: 'carlos@idmjisabadell.org', nombre: 'Carlos', apellidos: 'Sanchez', rol: 'admin' },
    { email: 'hugo@idmjisabadell.org', nombre: 'Hugo', apellidos: 'Bolaños', rol: 'editor' },
    { email: 'alejandro@idmjisabadell.org', nombre: 'Alejandro', apellidos: 'Perez', rol: 'editor' },
    { email: 'sebastian@idmjisabadell.org', nombre: 'Sebastian', apellidos: 'Villegas', rol: 'editor' },
    { email: 'andres@idmjisabadell.org', nombre: 'Andres', apellidos: 'Zapata', rol: 'editor' },
    { email: 'rafael@idmjisabadell.org', nombre: 'Rafael', apellidos: 'Quer', rol: 'editor' },
];

const password = 'idmji2024';

async function setupUsers() {
    console.log('Starting user setup (V3 - Single User Lookup)...');

    for (const userData of usersToCreate) {
        console.log(`\nProcessing: ${userData.email}`);

        // 1. Check if user already exists in Auth
        // Note: listUsers often fails if the response is too large or has internal issues, 
        // but getting a single user by email might be safer.
        // Actually, let's just try to create and if it fails with email_exists, we lookup the profile.

        let { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: password,
            email_confirm: true
        });

        if (createError) {
            if (createError.status === 422 || createError.code === 'email_exists') {
                console.log('User already exists in Auth.');
                // We need the ID. Try to get it from the profiles table.
                const { data: profile } = await supabase.from('profiles').select('id').eq('email', userData.email).single();
                if (profile) {
                    user = { id: profile.id };
                    console.log(`Found ID from existing profile: ${user.id}`);
                } else {
                    console.warn(`CRITICAL: User exists in Auth but NO PROFILE found for ${userData.email}.`);
                    // If we can't find it in profiles, and listUsers fails, we are stuck.
                    // BUT we can try reset password to verify or something? No, that's complex.
                    // Let's assume most have profiles or we created them before.
                    continue;
                }
            } else {
                console.error(`Error creating user ${userData.email}:`, createError);
                continue;
            }
        }

        if (user) {
            // 2. Upsert profile
            console.log(`Upserting profile for ${user.id} (${userData.email})...`);
            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: userData.email,
                    nombre: userData.nombre,
                    apellidos: userData.apellidos,
                    rol: userData.rol.toUpperCase() // Ensure uppercase for consistency
                }, { onConflict: 'id' });

            if (upsertError) {
                console.error(`Error upserting profile:`, upsertError);
            } else {
                console.log(`Success! User ${userData.email} is ready.`);
            }
        }
    }
}

setupUsers();
