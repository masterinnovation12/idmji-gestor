const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSaturdays() {
    console.log('--- Verificando Cultos de Sábados ---');
    const { data, error } = await supabase
        .from('cultos')
        .select(`
            fecha,
            tipo_culto:culto_types(nombre)
        `)
        .gte('fecha', '2026-01-01')
        .lte('fecha', '2026-01-31')
        .order('fecha', { ascending: true });
    
    if (error) {
        console.error(error);
        return;
    }
    
    data.forEach(c => {
        const date = new Date(c.fecha);
        if (date.getDay() === 6) { // 6 = Sábado
            console.log(`Fecha: ${c.fecha} (Sábado) - Tipo: ${c.tipo_culto?.nombre}`);
        }
    });
}

checkSaturdays();
