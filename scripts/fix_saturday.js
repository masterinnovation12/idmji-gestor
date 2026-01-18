const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixSaturday() {
    console.log('Restaurando el tipo de culto para el sábado 17 de enero...');
    
    // Obtener el ID de 'Estudio Bíblico'
    const { data: tipo } = await supabase
        .from('culto_types')
        .select('id')
        .eq('nombre', 'Estudio Bíblico')
        .single();
    
    if (!tipo) {
        console.error('No se encontró el tipo de culto Estudio Bíblico');
        return;
    }

    const { error } = await supabase
        .from('cultos')
        .update({ tipo_culto_id: tipo.id })
        .eq('fecha', '2026-01-17');
    
    if (error) {
        console.error('Error al actualizar:', error.message);
    } else {
        console.log('Sábado 17 de enero restaurado a Estudio Bíblico.');
    }
}

fixSaturday();
