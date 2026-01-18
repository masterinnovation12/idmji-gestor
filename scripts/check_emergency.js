const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDatabase() {
    console.log('--- VERIFICANDO BASE DE DATOS ---');
    
    // 1. Verificar si hay coros
    const { count, error: countError } = await supabase.from('coros').select('*', { count: 'exact', head: true });
    console.log('Total de coros en la tabla:', count);
    if (countError) console.error('Error al contar coros:', countError.message);

    // 2. Probar una búsqueda simple (ej. coro 1)
    const { data: searchResult, error: searchError } = await supabase.from('coros').select('*').eq('numero', 1).single();
    console.log('Resultado búsqueda Coro #1:', searchResult ? 'Encontrado' : 'No encontrado');
    if (searchError) console.error('Error en búsqueda:', searchError.message);

    // 3. Verificar cultos del 13 de enero
    const { data: cultos, error: cultosError } = await supabase.from('cultos').select('id, fecha').eq('fecha', '2026-01-13');
    console.log('\nCultos el 2026-01-13:', cultos?.length || 0);
    
    if (cultos && cultos.length > 0) {
        for (const c of cultos) {
            const { data: plan } = await supabase.from('plan_himnos_coros').select('id, tipo, coro_id').eq('culto_id', c.id);
            console.log(`  Culto ID ${c.id}: ${plan?.length || 0} elementos en plan_himnos_coros`);
        }
    }

    // 4. Verificar app_config
    const { data: config } = await supabase.from('app_config').select('*').eq('key', 'ultimo_coro_id_alabanza').single();
    console.log('\nPuntero actual en app_config:', JSON.stringify(config?.value));
}

checkDatabase();
