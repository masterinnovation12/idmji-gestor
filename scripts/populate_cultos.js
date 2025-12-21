const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function populateCulto() {
    console.log('Populating worship service for today...');

    // 1. Get a valid culto_type
    const { data: types, error: typesError } = await supabase
        .from('culto_types')
        .select('id, nombre')
        .limit(1);

    if (typesError || !types || types.length === 0) {
        console.error('Error fetching culto types:', typesError);
        return;
    }

    const typeId = types[0].id;
    console.log(`Using culto type: ${types[0].nombre} (${typeId})`);

    // 2. Define today's date
    // The user environment says current time is 2025-12-21
    const today = '2025-12-21';
    const time = '10:00'; // 10:00 AM

    // 3. Insert into cultos
    const { data, error } = await supabase
        .from('cultos')
        .insert({
            fecha: today,
            hora_inicio: time,
            tipo_culto_id: typeId,
            estado: 'planeado'
        })
        .select();

    if (error) {
        console.error('Error inserting culto:', error);
    } else {
        console.log('Successfully inserted culto:', data);
    }
}

populateCulto();
