/**
 * API Route para datos de Archivos (Google Sheets).
 * Accesible por cualquier usuario autenticado (cualquier rol: ADMIN, EDITOR, VIEWER, etc.).
 * No se comprueba rol.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  getSheetCSVUrl,
  fetchAndParseSheetCSV,
  type SheetSourceId,
} from '@/lib/csv-sheets'

const VALID_SOURCES = new Set<SheetSourceId>(['ensenanzas', 'estudios', 'instituto', 'pastorado'])

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
    // Sin comprobación de rol: cualquier usuario autenticado puede consumir la API

    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('source')

    if (!sourceId || !isValidSource(sourceId)) {
      return NextResponse.json({ success: false, error: 'Origen de hoja no válido' }, { status: 400 })
    }

    const url = getSheetCSVUrl(sourceId as SheetSourceId)
    if (!url) {
      return NextResponse.json({ success: false, error: 'URL de la hoja no configurada' }, { status: 400 })
    }

    const data = await fetchAndParseSheetCSV(url)
    return NextResponse.json({ success: true, data })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al cargar los datos'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
