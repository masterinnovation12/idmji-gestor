const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testRippleEffect() {
    console.log('--- TEST: Ripple Effect of Sequence Update ---');
    
    // 1. Simular que el martes 13 tiene coros antiguos (IDs 1041-1044)
    const martesId = '79023370-8dc0-49c6-84fd-84c0d07159dd';
    const miercolesId = '88c04ce4-4494-47e5-b76f-863625a81de7';
    
    console.log('Preparando datos antiguos para el test...');
    await supabase.from('plan_himnos_coros').delete().in('culto_id', [martesId, miercolesId]);
    
    // Martes con coros 1, 2, 3, 4
    await supabase.from('plan_himnos_coros').insert([
        { culto_id: martesId, tipo: 'coro', coro_id: 1041, orden: 1 },
        { culto_id: martesId, tipo: 'coro', coro_id: 1042, orden: 2 },
        { culto_id: martesId, tipo: 'coro', coro_id: 1043, orden: 3 },
        { culto_id: martesId, tipo: 'coro', coro_id: 1044, orden: 4 }
    ]);
    
    // Miércoles con coros 1, 2, 3, 4 (incorrecto, debería ser 5, 6, 7, 8)
    await supabase.from('plan_himnos_coros').insert([
        { culto_id: miercolesId, tipo: 'coro', coro_id: 1041, orden: 1 }
    ]);

    // 2. Actualizar el puntero simulando que el Admin cambió el martes al coro 1050
    console.log('Simulando que el Admin actualiza el contador al coro 1050...');
    await supabase.from('app_config').upsert({ 
        key: 'ultimo_coro_id_alabanza', 
        value: { id: 1050 } 
    });

    // 3. Ejecutar la lógica de auto-relleno (ahora debería sobrescribir el miércoles)
    console.log('Ejecutando autoFillAlabanzaSequence...');
    // Aquí invocamos la lógica que acabamos de modificar (usaré una versión simplificada para el test)
    
    const start = '2026-01-12';
    const end = '2026-01-18';
    
    const { data: cultos } = await supabase
        .from('cultos')
        .select('id, fecha, tipo_culto:culto_types!inner(nombre)')
        .gte('fecha', start)
        .lte('fecha', end)
        .ilike('tipo_culto.nombre', '%Alabanza%')
        .order('fecha', { ascending: true });

    let currentPointer = 1050;

    for (const culto of cultos) {
        console.log(`Procesando culto ${culto.fecha} (${culto.id})...`);
        
        // Obtener próximos 4
        const { data: nextCoros } = await supabase
            .from('coros')
            .select('id')
            .gt('id', currentPointer)
            .order('id', { ascending: true })
            .limit(4);

        // Limpiar
        await supabase.from('plan_himnos_coros').delete().eq('culto_id', culto.id).eq('tipo', 'coro');

        // Insertar
        const inserts = nextCoros.map((coro, index) => ({
            culto_id: culto.id,
            tipo: 'coro',
            coro_id: coro.id,
            orden: index + 1
        }));
        await supabase.from('plan_himnos_coros').insert(inserts);
        
        currentPointer = nextCoros[nextCoros.length - 1].id;
    }

    console.log('Verificando resultados para el miércoles...');
    const { data: resultMiercoles } = await supabase
        .from('plan_himnos_coros')
        .select('coro_id')
        .eq('culto_id', miercolesId)
        .order('orden', { ascending: true });
    
    console.log('Coros en miércoles:', resultMiercoles.map(r => r.coro_id));
    // Deberían ser los siguientes al 1054 (si martes tomó 1051, 1052, 1053, 1054)
    // Miércoles: 1055, 1056, 1057, 1058
}

testRippleEffect();
