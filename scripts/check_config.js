const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkConfig() {
    const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('key', 'ultimo_coro_id_alabanza')
        .single();
    
    if (error) {
        console.log('Clave no encontrada o error:', error.message);
        return;
    }
    console.log('Puntero actual:', data.value);
}

checkConfig();
