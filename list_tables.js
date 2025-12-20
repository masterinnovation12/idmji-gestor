/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js')

const client = new Client({
    host: 'aws-1-eu-west-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.dcjqjsmyydqpsmxbkhya',
    password: 'M@aricela.11',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    `);

        console.log('--- SUPABASE TABLES ---');
        res.rows.forEach(r => console.log(`- ${r.table_name}`));

    } catch (err) {
        console.log(err);
    } finally {
        await client.end();
    }
}
run();
