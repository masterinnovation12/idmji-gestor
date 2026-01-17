/**
 * Script de prueba para la secuencia de coros
 * Verifica la obtención del puntero, el loop y el salto de IDs inexistentes.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Variables de entorno faltantes (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSequence() {
    console.log('--- TEST: Secuencia de Coros ---');

    // 1. Obtener primer coro
    const { data: firstCoro } = await supabase
        .from('coros')
        .select('id, numero, titulo')
        .order('id', { ascending: true })
        .limit(1)
        .single();
    
    console.log(`Primer coro disponible: #${firstCoro.numero} (ID: ${firstCoro.id})`);

    // 2. Obtener el coro con el ID más alto
    const { data: lastCoro } = await supabase
        .from('coros')
        .select('id, numero, titulo')
        .order('id', { ascending: false })
        .limit(1)
        .single();
    
    console.log(`Coro con ID más alto: #${lastCoro.numero} (ID: ${lastCoro.id})`);

    // 3. Probar salto de IDs inexistentes
    console.log('\n--- Probando salto de IDs ---');
    const { data: sequence } = await supabase
        .from('coros')
        .select('id, numero')
        .gt('id', firstCoro.id)
        .order('id', { ascending: true })
        .limit(4);
    
    console.log('Siguientes 4 coros tras el primero:');
    sequence.forEach(c => console.log(` - #${c.numero} (ID: ${c.id})`));

    // 4. Probar Loop (vuelta al principio)
    console.log('\n--- Probando Loop (vuelta al principio) ---');
    // Simulamos que estamos en el último ID
    const count = 4;
    const { data: nextFromLast } = await supabase
        .from('coros')
        .select('id, numero')
        .gt('id', lastCoro.id) // No habrá ninguno
        .order('id', { ascending: true })
        .limit(count);
    
    let results = nextFromLast || [];
    if (results.length < count) {
        const remaining = count - results.length;
        const { data: loopItems } = await supabase
            .from('coros')
            .select('id, numero')
            .order('id', { ascending: true })
            .limit(remaining);
        results = [...results, ...loopItems];
    }

    console.log(`Siguientes ${count} coros tras el último ID (${lastCoro.id}):`);
    results.forEach(c => console.log(` - #${c.numero} (ID: ${c.id})`));

    if (results[0].id === firstCoro.id) {
        console.log('✅ ÉXITO: El loop funciona correctamente.');
    } else {
        console.error('❌ ERROR: El loop no volvió al primer ID.');
    }

    // 5. Verificar app_config
    console.log('\n--- Verificando app_config ---');
    const { data: config } = await supabase
        .from('app_config')
        .select('*')
        .eq('key', 'ultimo_coro_id_alabanza')
        .single();
    
    if (config) {
        console.log(`Valor actual en app_config: ${JSON.stringify(config.value)}`);
    } else {
        console.log('app_config no tiene la clave todavía (se creará al ejecutar la acción).');
    }

    console.log('\n--- Fin del Test ---');
}

testSequence().catch(console.error);
