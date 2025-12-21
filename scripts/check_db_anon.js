
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
    console.log('Testing DB connection...');

    // 1. Query table 'himnos'
    const { data, error } = await supabase.from('himnos').select('id').limit(1);

    if (error) {
        console.error('❌ DB Error (himnos):', error.message);
        console.error('Details:', error);
    } else {
        console.log('✅ DB Connection (himnos): OK');
    }

    // 2. Query 'app_config'
    const { data: config, error: configError } = await supabase.from('app_config').select('*').limit(1);
    if (configError) {
        console.error('❌ DB Error (app_config):', configError.message);
    } else {
        console.log('✅ DB Connection (app_config): OK');
    }
}

checkDB();
