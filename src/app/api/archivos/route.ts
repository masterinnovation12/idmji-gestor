/**
 * API Route para datos de Archivos (Google Sheets).
 * Accesible por cualquier usuario autenticado (cualquier rol: ADMIN, EDITOR, VIEWER, etc.).
 * No se comprueba rol.
 *
 * ?force=true → invalida caché local y reintenta agresivamente contra Google.
 *   - Si Google responde: devuelve datos frescos, stale: false.
 *   - Si Google sigue fallando: devuelve { success: false, forceError: true, lastErrorCode }.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  getSheetCSVUrl,
  fetchAndParseSheetCSV,
  fetchAndParseSheetCSVForce,
  type SheetSourceId,
} from '@/lib/csv-sheets'

const VALID_SOURCES = new Set<SheetSourceId>(['ensenanzas', 'estudios', 'instituto', 'pastorado', 'profecia'])

function isValidSource(id: string): id is SheetSourceId {
  return VALID_SOURCES.has(id as SheetSourceId)
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('source')
    const force = searchParams.get('force') === 'true'

    if (!sourceId || !isValidSource(sourceId)) {
      return NextResponse.json({ success: false, error: 'Origen de hoja no válido' }, { status: 400 })
    }

    const url = getSheetCSVUrl(sourceId)
    if (!url) {
      return NextResponse.json({ success: false, error: 'URL de la hoja no configurada' }, { status: 400 })
    }

    if (force) {
      try {
        const { data, meta } = await fetchAndParseSheetCSVForce(url)
        return NextResponse.json({ success: true, data, stale: meta.stale })
      } catch (e) {
        const code = e instanceof Error && 'status' in e ? (e as { status: number | null }).status : null
        return NextResponse.json(
          { success: false, forceError: true, lastErrorCode: code, error: 'Google sigue sin responder. Intenta de nuevo en unos minutos.' },
          { status: 503 }
        )
      }
    }

    const { data, meta } = await fetchAndParseSheetCSV(url)
    return NextResponse.json({
      success: true,
      data,
      stale: meta.stale,
      lastErrorCode: meta.lastErrorCode,
      ...(meta.cachedAt ? { cachedAt: meta.cachedAt } : {}),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al cargar los datos'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
