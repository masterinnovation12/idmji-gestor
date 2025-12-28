const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function randomizeDecember() {
    console.log('Starting Randomization for December 2025...');

    // 1. Fetch Users
    const { data: users, error: userError } = await supabase
        .from('perfiles')
        .select('id')
        .in('role', ['admin', 'editor', 'viewer', 'user']); // Assuming roles

    if (userError || !users || users.length === 0) {
        console.error('Error fetching users:', userError);
        return;
    }
    console.log(`Found ${users.length} users to assign.`);

    // 2. Fetch December Cultos
    const { data: cultos, error: cultosError } = await supabase
        .from('cultos')
        .select('id, fecha')
        .gte('fecha', '2025-12-01')
        .lte('fecha', '2025-12-31');

    if (cultosError) {
        console.error('Error fetching cultos:', cultosError);
        return;
    }
    console.log(`Found ${cultos.length} cultos in December.`);

    // Bible Books for randomization
    const books = ['Mateo', 'Marcos', 'Lucas', 'Juan', 'Hechos', 'Romanos', 'Salmos', 'Proverbios', 'Génesis', 'Éxodo'];

    // 3. Loop and Update
    for (const culto of cultos) {
        // Random IDs
        const getRandomUser = () => users[Math.floor(Math.random() * users.length)].id;

        const introId = getRandomUser();
        const ensenanzaId = getRandomUser();
        const testimoniosId = getRandomUser();
        const finalId = getRandomUser();

        console.log(`Updating Culto ${culto.fecha} (${culto.id})...`);

        // Update Assignments
        const { error: updateError } = await supabase
            .from('cultos')
            .update({
                usuario_intro_id: introId,
                usuario_ensenanza_id: ensenanzaId,
                usuario_testimonios_id: testimoniosId,
                usuario_finalizacion_id: finalId,
                estado: 'completado' // Mark as complete to show green check
            })
            .eq('id', culto.id);

        if (updateError) console.error(`Failed to update culto ${culto.id}:`, updateError);

        // Update/Insert Reading Record
        const readerId = getRandomUser();
        const book = books[Math.floor(Math.random() * books.length)];
        const chapter = Math.floor(Math.random() * 20) + 1;
        const verses = `1-${Math.floor(Math.random() * 10) + 5}`;

        // Check if reading exists
        const { data: readings } = await supabase
            .from('historial_lecturas')
            .select('id')
            .eq('culto_id', culto.id);

        if (readings && readings.length > 0) {
            // Update existing
            await supabase
                .from('historial_lecturas')
                .update({
                    usuario_id: readerId,
                    libro: book,
                    capitulo: chapter,
                    versiculos: verses
                })
                .eq('id', readings[0].id);
        } else {
            // Insert new
            await supabase
                .from('historial_lecturas')
                .insert({
                    culto_id: culto.id,
                    usuario_id: readerId,
                    libro: book,
                    capitulo: chapter,
                    versiculos: verses,
                    creado_por: readerId
                });
        }
    }

    console.log('✅ December randomization complete!');
}

randomizeDecember();
