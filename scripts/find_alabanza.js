const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findAlabanza() {
    const { data, error } = await supabase
        .from('cultos')
        .select(`
            id,
            fecha,
            tipo_culto:culto_types!inner(nombre)
        `)
        .eq('tipo_culto.nombre', 'Alabanza')
        .gte('fecha', '2026-01-17')
        .order('fecha', { ascending: true })
        .limit(5);
    
    if (error) {
        console.error(error);
        return;
    }
    console.log('Cultos de Alabanza encontrados:', data);
}

findAlabanza();
