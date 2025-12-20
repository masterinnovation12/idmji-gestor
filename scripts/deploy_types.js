/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs');
const path = require('path');

const client = new Client({
    host: 'aws-1-eu-west-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.dcjqjsmyydqpsmxbkhya',
    password: 'M@aricela.11',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    console.log('🔌 Connecting...');
    try {
        await client.connect();

        // Absolute path
        const sqlPath = 'c:/Users/jebol/.gemini/antigravity/brain/4924de61-3495-4510-8c36-8ec8c4e204b5/SUPABASE_MIGRATION_CULTOTYPES.sql';

        console.log(`Reading SQL from: ${sqlPath}`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📜 Executing SQL...');
        await client.query(sql);

        console.log('✅ COMPLETE! Columns added and data updated.');

    } catch (err) {
        console.log('❌ FATAL ERROR:', err.message);
    } finally {
        await client.end();
    }
}

runMigration();
