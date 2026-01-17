const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCoros() {
    const { count } = await supabase.from('coros').select('*', { count: 'exact', head: true });
    console.log(`Total coros: ${count}`);
    
    const { data: firstTen } = await supabase.from('coros').select('id, numero, titulo').order('id', { ascending: true }).limit(10);
    console.log('Primeros 10:', firstTen);

    const { data: lastTen } = await supabase.from('coros').select('id, numero, titulo').order('id', { descending: true }).limit(10);
    console.log('Últimos 10:', lastTen);
}

checkCoros();
