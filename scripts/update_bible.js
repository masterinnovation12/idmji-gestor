/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
try {
    const envConfig = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
} catch (e) {
    console.error('Could not read .env.local', e);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function updateBible() {
    const jsonPath = path.resolve(__dirname, 'biblia_full.json');
    const bibleData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log('Updating biblia_estructura...');

    // We update row with id=1 or insert if not exists
    const { error } = await supabase
        .from('biblia_estructura')
        .upsert({
            id: 1,
            estructura_json: bibleData
        });

    if (error) {
        console.error('❌ Error updating bible:', error);
    } else {
        console.log('✅ Bible structure updated successfully!');
    }
}

updateBible();
