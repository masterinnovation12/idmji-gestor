const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixPointerAndFill() {
    console.log('--- CORRIGIENDO PUNTERO Y FORZANDO RELLENO ---');
    
    // 1. Establecer el puntero al 13 de enero con el coro #126 (ID 1164)
    await supabase.from('app_config').upsert({
        key: 'ultimo_coro_id_alabanza',
        value: { id: 1164, date: '2026-01-13' },
        description: 'ID y fecha del último punto de verdad en la secuencia de Alabanza'
    });
    console.log('Puntero establecido a #126 en 2026-01-13');

    // 2. Limpiar miércoles 14 para que se rellene
    const miercolesId = '88c04ce4-4494-47e5-b76f-863625a81de7';
    await supabase.from('plan_himnos_coros').delete().eq('culto_id', miercolesId);
    console.log('Miércoles 14 limpiado.');

    // 3. Simular relleno para el miércoles
    const { data: allCoros } = await supabase.from('coros').select('id, numero').gt('id', 1164).order('id', { ascending: true }).limit(4);
    const inserts = allCoros.map((c, i) => ({
        culto_id: miercolesId,
        tipo: 'coro',
        coro_id: c.id,
        orden: i + 1
    }));
    await supabase.from('plan_himnos_coros').insert(inserts);
    console.log(`Miércoles 14 rellenado con coros: ${allCoros.map(c => c.numero).join(', ')}`);

    // 4. Actualizar puntero final
    const lastId = allCoros[allCoros.length - 1].id;
    await supabase.from('app_config').upsert({
        key: 'ultimo_coro_id_alabanza',
        value: { id: lastId, date: '2026-01-14' }
    });
    console.log('Puntero final actualizado al 14 de enero.');
}

fixPointerAndFill();
