/**
 * Diagnóstico: indica si el servidor ve las env vars de Sheets (solo si están definidas, sin mostrar valores).
 * Útil para comprobar en producción que Vercel inyecta las variables.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'

const SHEET_KEYS = [
  'SHEET_ENSENANZAS_CSV_URL',
  'SHEET_ESTUDIOS_CSV_URL',
  'SHEET_INSTITUTO_CSV_URL',
  'SHEET_PASTORADO_CSV_URL',
  'SHEET_PROFECIA_CSV_URL',
] as const

export async function GET() {
  const env: Record<string, boolean> = {}
  for (const key of SHEET_KEYS) {
    const val = process.env[key]
    env[key] = typeof val === 'string' && val.trim() !== ''
  }
  return NextResponse.json({
    message: 'Comprueba que en Vercel las variables se llamen exactamente así (sin espacios ni mayúsculas/minúsculas distintas).',
    keysExpected: SHEET_KEYS,
    envPresent: env,
    allOk: SHEET_KEYS.every((k) => env[k]),
  })
}
