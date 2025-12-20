/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require('pg');

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
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'culto_types'
    `);
        const cols = res.rows.map(r => r.column_name);
        console.log('Columns:', cols);
        console.log('Has ensenanza:', cols.includes('tiene_ensenanza'));
        console.log('Has testimonios:', cols.includes('tiene_testimonios'));
    } catch (err) {
        console.log(err);
    } finally {
        await client.end();
    }
}
run();
