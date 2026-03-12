#!/usr/bin/env node
/**
 * Script de diagnóstico del backend de Archivos.
 * Ejecutar: node --env-file=.env.local scripts/test-archivos-backend.mjs
 * Requiere Node 20+ para --env-file.
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const SOURCES = ['ensenanzas', 'estudios', 'instituto', 'pastorado']
const ENV_KEYS = {
  ensenanzas: 'SHEET_ENSENANZAS_CSV_URL',
  estudios: 'SHEET_ESTUDIOS_CSV_URL',
  instituto: 'SHEET_INSTITUTO_CSV_URL',
  pastorado: 'SHEET_PASTORADO_CSV_URL',
}

async function fetchCSV(url) {
  const res = await fetch(url, {
    headers: { Accept: 'text/csv, text/plain; charset=utf-8' },
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}

function parseSimple(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length < 2) return { rows: 0, headers: [], sample: [] }
  const headers = lines[0].split(',').map((h) => h.trim())
  const data = lines.slice(1).map((line) => {
    const vals = line.split(',')
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim() })
    return obj
  })
  return { rows: data.length, headers, sample: data.slice(0, 2) }
}

async function main() {
  console.log('=== Diagnóstico Backend Archivos ===\n')

  for (const id of SOURCES) {
    const key = ENV_KEYS[id]
    const url = process.env[key]
    console.log(`[${id}] ${key}:`)
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.log('  ❌ No configurada en .env.local\n')
      continue
    }
    console.log(`  URL: ${url.slice(0, 60)}...`)
    try {
      const { ok, status, text } = await fetchCSV(url)
      if (!ok) {
        console.log(`  ❌ HTTP ${status}`)
        if (text.length < 200) console.log(`  Body: ${text.slice(0, 150)}`)
        console.log('')
        continue
      }
      const isHtml = text.trim().startsWith('<!') || text.trim().startsWith('<html')
      if (isHtml) {
        console.log('  ❌ Respuesta HTML (¿403/error de Google?)')
        console.log(`  Inicio: ${text.slice(0, 80)}...`)
        console.log('')
        continue
      }
      const { rows, headers, sample } = parseSimple(text)
      console.log(`  ✅ OK: ${rows} filas, ${headers.length} columnas`)
      console.log(`  Cabeceras: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`)
      if (sample.length > 0) {
        console.log(`  Muestra fila 1: ${JSON.stringify(sample[0]).slice(0, 80)}...`)
      }
      console.log('')
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}\n`)
    }
  }

  console.log('=== Fin diagnóstico ===')
}

main()
