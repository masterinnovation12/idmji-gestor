'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getSheetCSVUrl,
  fetchAndParseSheetCSV,
  type SheetSourceId,
} from '@/lib/csv-sheets'

export type ArchivosResult = {
  success: boolean
  error?: string
  data?: Record<string, string>[]
  /** true si se muestra copia en caché (Google no respondió) */
  stale?: boolean
  /** ISO 8601 de la copia en caché */
  cachedAt?: string
}

const VALID_SOURCES = new Set<SheetSourceId>(['ensenanzas', 'estudios', 'instituto', 'pastorado', 'profecia'])

function isValidSource(id: string): id is SheetSourceId {
  return VALID_SOURCES.has(id as SheetSourceId)
}

/**
 * Obtiene los datos de una hoja publicada (CSV) por identificador.
 * Requiere usuario autenticado. Las URLs se leen solo en servidor.
 */
export async function getSheetData(sourceId: string): Promise<ArchivosResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'No autenticado' }
    }

    if (!isValidSource(sourceId)) {
      return { success: false, error: 'Origen de hoja no válido' }
    }

    const url = getSheetCSVUrl(sourceId as SheetSourceId)
    if (!url) {
      return { success: false, error: 'URL de la hoja no configurada' }
    }

    const { data, meta } = await fetchAndParseSheetCSV(url)
    return {
      success: true,
      data,
      stale: meta.stale,
      ...(meta.cachedAt ? { cachedAt: meta.cachedAt } : {}),
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al cargar los datos'
    return { success: false, error: message }
  }
}
