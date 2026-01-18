const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function initEnsenanzaPointers() {
    console.log('--- INICIALIZANDO PUNTEROS DE ENSEÑANZA ---');
    
    // 1. Obtener primer himno
    const { data: firstHimno } = await supabase.from('himnos').select('id').order('id', { ascending: true }).limit(1).single();
    // 2. Obtener primer coro
    const { data: firstCoro } = await supabase.from('coros').select('id').order('id', { ascending: true }).limit(1).single();

    const updates = [
        {
            key: 'ultimo_himno_id_ensenanza',
            value: { id: firstHimno?.id || 0, date: '2026-01-01' },
            description: 'Punto de verdad para secuencia de Himnos en Enseñanza'
        },
        {
            key: 'ultimo_coro_id_ensenanza',
            value: { id: firstCoro?.id || 0, date: '2026-01-01' },
            description: 'Punto de verdad para secuencia de Coros en Enseñanza'
        }
    ];

    for (const update of updates) {
        const { error } = await supabase.from('app_config').upsert(update, { onConflict: 'key' });
        if (error) console.error(`Error inicializando ${update.key}:`, error.message);
        else console.log(`¡ÉXITO! ${update.key} inicializado.`);
    }
}

initEnsenanzaPointers();
