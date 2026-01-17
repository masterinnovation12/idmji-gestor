const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCultoTypes() {
    const { data } = await supabase.from('culto_types').select('nombre');
    console.log('Tipos de culto:', data);
}

checkCultoTypes();
