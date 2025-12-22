/**
 * Script para añadir variables de entorno a Vercel usando la API
 * Ejecutar: node scripts/add_vercel_env_via_api.js
 * 
 * Requiere: Token de Vercel en variable de entorno VERCEL_TOKEN
 * Obtener token: https://vercel.com/account/tokens
 */

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_cOghTJRDQQijZApUoSxJBJQSw6C1';
const TEAM_ID = 'team_hn64tc8bCRGPKr0ZEDkeo58Z';

if (!VERCEL_TOKEN) {
    console.error('❌ Error: VERCEL_TOKEN no está configurado');
    console.log('💡 Obtén tu token en: https://vercel.com/account/tokens');
    console.log('💡 Luego ejecuta: $env:VERCEL_TOKEN="tu_token"; node scripts/add_vercel_env_via_api.js');
    process.exit(1);
}

const envVars = [
    {
        key: 'NEXT_PUBLIC_SUPABASE_URL',
        value: 'https://dcjqjsmyydqpsmxbkhya.supabase.co',
        type: 'plain',
        target: ['production', 'preview', 'development']
    },
    {
        key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanFqc215eWRxcHNteGJraHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NzQ3MTUsImV4cCI6MjA4MDM1MDcxNX0.AQ-K6u8zxwREbrr_I7Lcfa8OQsUAUIYafzA4jGFs5ec',
        type: 'plain',
        target: ['production', 'preview', 'development']
    },
    {
        key: 'SUPABASE_SERVICE_ROLE_KEY',
        value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanFqc215eWRxcHNteGJraHlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc3NDcxNSwiZXhwIjoyMDgwMzUwNzE1fQ.ZsO4uTR-dW7KMtI553zLUyQam1hRcAa5QJXRzox3qMo',
        type: 'sensitive',
        target: ['production', 'preview', 'development']
    },
    {
        key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
        value: 'BEeyLGjKHt_LpMMvsD7_63UIvVktANK2wN48bMrSA9L0goyoEbpxhL1xCN62c3PvwzamOmgCABglrcGxUk',
        type: 'plain',
        target: ['production', 'preview', 'development']
    },
    {
        key: 'VAPID_PRIVATE_KEY',
        value: '_K5mDScV2Cq069tU2la',
        type: 'sensitive',
        target: ['production', 'preview', 'development']
    },
    {
        key: 'VAPID_SUBJECT',
        value: 'mailto:admin@idmji.org',
        type: 'plain',
        target: ['production', 'preview', 'development']
    }
];

function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function addEnvVar(envVar) {
    const url = `/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`;
    
    const options = {
        hostname: 'api.vercel.com',
        path: url,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    const result = await makeRequest(options, {
        key: envVar.key,
        value: envVar.value,
        type: envVar.type,
        target: envVar.target
    });

    return result;
}

async function main() {
    console.log('🚀 Añadiendo variables de entorno a Vercel...\n');
    console.log(`Proyecto: ${PROJECT_ID}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const envVar of envVars) {
        console.log(`📝 Añadiendo: ${envVar.key}...`);
        
        try {
            const result = await addEnvVar(envVar);
            
            if (result.status === 200 || result.status === 201) {
                console.log(`   ✅ ${envVar.key} añadida correctamente`);
                successCount++;
            } else if (result.status === 409 || result.data?.error?.code === 'env_already_exists') {
                console.log(`   ⚠️  ${envVar.key} ya existe (se omitirá)`);
            } else {
                console.log(`   ❌ Error: ${result.data?.error?.message || result.status}`);
                errorCount++;
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            errorCount++;
        }
        
        console.log('');
    }

    console.log('='.repeat(60));
    console.log('📊 Resumen:');
    console.log(`   ✅ Añadidas: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log('');

    if (errorCount === 0) {
        console.log('✨ ¡Todas las variables se añadieron correctamente!');
        console.log('💡 El próximo deployment debería funcionar correctamente.');
    } else {
        console.log('⚠️  Algunas variables no se pudieron añadir. Revisa los errores arriba.');
    }
}

main().catch(console.error);

