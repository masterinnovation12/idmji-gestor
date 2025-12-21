const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSchema() {
    console.log('Fetching one row from "cultos"...');
    const { data, error } = await supabase
        .from('cultos')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('Table is empty or no data returned. Trying to insert a dummy to check schema error if possible or just assuming standard.');
        // If empty, we can't easily see columns via select *. 
        // We might have to rely on previous context or just try standard columns: 
        // id, fecha, hora, tipo?
    }
}

checkSchema();
