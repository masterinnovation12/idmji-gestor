/**
 * Diagnóstico: verifica que las URLs de Google Sheets devuelven datos.
 * Solo en desarrollo. Sin auth.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import {
  getSheetCSVUrl,
  fetchAndParseSheetCSV,
  type SheetSourceId,
} from '@/lib/csv-sheets'

const SOURCES: SheetSourceId[] = ['ensenanzas', 'estudios', 'instituto', 'pastorado']

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Solo en desarrollo' }, { status: 403 })
  }

  const results: Record<string, { url: string | null; rowCount: number; firstKeys: string[]; error?: string }> = {}

  for (const sourceId of SOURCES) {
    try {
      const url = getSheetCSVUrl(sourceId)
      if (!url) {
        results[sourceId] = { url: null, rowCount: 0, firstKeys: [], error: 'URL no configurada' }
        continue
      }
      const data = await fetchAndParseSheetCSV(url)
      const firstKeys = data.length > 0 ? Object.keys(data[0]) : []
      results[sourceId] = { url, rowCount: data.length, firstKeys }
    } catch (e) {
      results[sourceId] = {
        url: getSheetCSVUrl(sourceId) ?? null,
        rowCount: 0,
        firstKeys: [],
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }

  return NextResponse.json({ results })
}
