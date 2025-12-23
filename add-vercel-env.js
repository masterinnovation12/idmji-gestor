/**
 * Script para añadir variables de entorno a Vercel
 * Usa la API de Vercel para añadir todas las variables necesarias
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Leer variables del .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parsear variables de entorno
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Proyectos de Vercel
const projects = [
  {
    id: 'prj_cOghTJRDQQijZApUoSxJBJQSw6C1',
    name: 'web'
  },
  {
    id: 'prj_A7Q7A9wEDoaartvNvUtHLqUgVj3w',
    name: 'idmji-gestor'
  }
];

// Variables a añadir (todas para production, preview y development)
const variablesToAdd = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    value: envVars.NEXT_PUBLIC_SUPABASE_URL,
    type: 'plain',
    target: ['production', 'preview', 'development']
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    type: 'plain',
    target: ['production', 'preview', 'development']
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    value: envVars.SUPABASE_SERVICE_ROLE_KEY,
    type: 'secret',
    target: ['production', 'preview', 'development']
  },
  {
    key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    value: envVars.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    type: 'plain',
    target: ['production', 'preview', 'development']
  },
  {
    key: 'VAPID_PRIVATE_KEY',
    value: envVars.VAPID_PRIVATE_KEY,
    type: 'secret',
    target: ['production', 'preview', 'development']
  },
  {
    key: 'VAPID_SUBJECT',
    value: envVars.VAPID_SUBJECT,
    type: 'plain',
    target: ['production', 'preview', 'development']
  }
];

console.log('📋 Variables a añadir:');
variablesToAdd.forEach(v => {
  console.log(`  - ${v.key} (${v.type}) -> ${v.target.join(', ')}`);
});

console.log('\n⚠️  Este script requiere un token de Vercel.');
console.log('💡 Para añadir las variables, ejecuta manualmente desde el directorio web:');
console.log('\n   Para cada variable, ejecuta:');
variablesToAdd.forEach(v => {
  const value = v.type === 'secret' ? '[SECRET]' : v.value;
  console.log(`\n   vercel env add ${v.key} production`);
  console.log(`   vercel env add ${v.key} preview`);
  console.log(`   vercel env add ${v.key} development`);
  console.log(`   (Valor: ${value})`);
});

console.log('\n📝 O usa el dashboard de Vercel:');
console.log('   https://vercel.com/jeffreys-projects-3d123ebc/web/settings/environment-variables');
console.log('   https://vercel.com/jeffreys-projects-3d123ebc/idmji-gestor/settings/environment-variables');

