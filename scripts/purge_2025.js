const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function purge2025() {
    console.log('--- INICIANDO PURGA DE DATOS 2025 ---');
    
    // 1. Obtener IDs de cultos de 2025
    const { data: cultos2025 } = await supabase
        .from('cultos')
        .select('id')
        .lt('fecha', '2026-01-01');
    
    const ids2025 = cultos2025?.map(c => c.id) || [];
    console.log(`Identificados ${ids2025.length} cultos para purgar.`);

    if (ids2025.length === 0) {
        console.log('No se encontraron datos de 2025 para borrar.');
        return;
    }

    // 2. Borrar dependencias primero (FK constraints)
    const tables = [
        { name: 'lecturas_biblicas', fk: 'culto_id' },
        { name: 'plan_himnos_coros', fk: 'culto_id' },
        { name: 'movimientos', fk: 'culto_id' }
    ];

    for (const table of tables) {
        const { error, count } = await supabase
            .from(table.name)
            .delete({ count: 'exact' })
            .in(table.fk, ids2025);
        
        if (error) {
            console.error(`Error al borrar en ${table.name}:`, error.message);
        } else {
            console.log(`Eliminados ${count || 0} registros de ${table.name}.`);
        }
    }

    // 3. Borrar los cultos finalmente
    const { error: cultosError, count: cultosCount } = await supabase
        .from('cultos')
        .delete({ count: 'exact' })
        .in('id', ids2025);

    if (cultosError) {
        console.error('Error al borrar cultos:', cultosError.message);
    } else {
        console.log(`¡ÉXITO! Eliminados ${cultosCount || 0} cultos de 2025.`);
    }

    console.log('--- PURGA COMPLETADA ---');
}

purge2025();
