/**
 * Ejecuta SQL contra la base de datos del proyecto vía Supabase Management API.
 * Lee SUPABASE_ACCESS_TOKEN y NEXT_PUBLIC_SUPABASE_URL de .env.local (nunca hardcodear claves).
 *
 * Uso:
 *   node scripts/db-query.mjs "select 1"
 *   node scripts/db-query.mjs --file supabase/migrations/xxxx.sql
 */
import { readFileSync } from 'fs'
import path from 'path'

function loadEnv() {
    const envPath = path.join(process.cwd(), '.env.local')
    const out = {}
    for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
        if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
    }
    return out
}

const env = loadEnv()
const token = env.SUPABASE_ACCESS_TOKEN
const url = env.NEXT_PUBLIC_SUPABASE_URL
if (!token || !url) {
    console.error('Faltan SUPABASE_ACCESS_TOKEN o NEXT_PUBLIC_SUPABASE_URL en .env.local')
    process.exit(1)
}
const ref = new URL(url).hostname.split('.')[0]

let query
if (process.argv[2] === '--file') {
    query = readFileSync(process.argv[3], 'utf-8')
} else {
    query = process.argv.slice(2).join(' ')
}
if (!query?.trim()) {
    console.error('Falta la consulta SQL')
    process.exit(1)
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
})

const text = await res.text()
if (!res.ok) {
    console.error(`HTTP ${res.status}: ${text}`)
    process.exit(1)
}
try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
} catch {
    console.log(text)
}
