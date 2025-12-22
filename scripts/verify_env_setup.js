/**
 * Script para verificar que todas las variables de entorno necesarias estén configuradas
 * Ejecutar: node scripts/verify_env_setup.js
 */

require('dotenv').config({ path: '.env.local' });

const requiredVars = {
    // Supabase (REQUERIDAS)
    'NEXT_PUBLIC_SUPABASE_URL': 'URL de tu proyecto Supabase',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Clave pública anónima de Supabase',
    'SUPABASE_SERVICE_ROLE_KEY': 'Clave de servicio (service_role) de Supabase',
    
    // VAPID (Opcionales pero recomendadas)
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY': 'Clave pública VAPID para notificaciones push',
    'VAPID_PRIVATE_KEY': 'Clave privada VAPID para notificaciones push',
    'VAPID_SUBJECT': 'Subject VAPID (email)',
};

console.log('🔍 Verificando variables de entorno...\n');

let allPresent = true;
const missing = [];
const present = [];

for (const [key, description] of Object.entries(requiredVars)) {
    const value = process.env[key];
    if (value && value.trim() !== '') {
        present.push(key);
        console.log(`✅ ${key}: Configurada`);
    } else {
        missing.push(key);
        allPresent = false;
        console.log(`❌ ${key}: FALTA - ${description}`);
    }
}

console.log('\n' + '='.repeat(60));
console.log(`📊 Resumen:`);
console.log(`   ✅ Configuradas: ${present.length}`);
console.log(`   ❌ Faltantes: ${missing.length}`);

if (missing.length > 0) {
    console.log('\n⚠️  Variables faltantes:');
    missing.forEach(key => {
        console.log(`   - ${key}`);
    });
    console.log('\n💡 Añade estas variables a tu archivo .env.local');
    process.exit(1);
} else {
    console.log('\n✨ ¡Todas las variables están configuradas correctamente!');
    process.exit(0);
}

