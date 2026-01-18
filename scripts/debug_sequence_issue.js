const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugSequence() {
    console.log('--- DIAGNÓSTICO DE SECUENCIA ---');
    
    // 1. Ver el puntero actual
    const { data: config } = await supabase.from('app_config').select('*').eq('key', 'ultimo_coro_id_alabanza').single();
    console.log('Puntero en app_config:', config?.value);

    // 2. Ver el coro #126 (para saber su ID real)
    const { data: coro126 } = await supabase.from('coros').select('id, numero, titulo').eq('numero', 126).single();
    console.log('Datos Coro #126:', coro126);

    // 3. Ver coros asignados el 13 de Enero
    const { data: cultos } = await supabase.from('cultos').select('id, fecha').in('fecha', ['2026-01-13', '2026-01-14']).order('fecha', { ascending: true });
    
    for (const culto of cultos) {
        const { data: plan } = await supabase
            .from('plan_himnos_coros')
            .select('orden, coro:coros(id, numero, titulo)')
            .eq('culto_id', culto.id)
            .eq('tipo', 'coro')
            .order('orden', { ascending: true });
        
        console.log(`\nCulto ${culto.fecha} (${culto.id}):`);
        if (!plan || plan.length === 0) {
            console.log('  Sin coros asignados.');
        } else {
            plan.forEach(p => {
                console.log(`  Orden ${p.orden}: Coro #${p.coro?.numero} (ID: ${p.coro?.id}) - ${p.coro?.titulo}`);
            });
        }
    }
}

debugSequence();
