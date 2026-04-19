/**
 * Página Archivos: visible para cualquier usuario autenticado (cualquier rol).
 * No se comprueba rol: ADMIN, EDITOR, VIEWER, etc. pueden acceder.
 */
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore } from 'next/cache'
import ArchivosClient from './ArchivosClient'
import {
  getSheetCSVUrl,
  fetchAndParseSheetCSV,
  type SheetSourceId,
  type SheetFetchMeta,
} from '@/lib/csv-sheets'

export const dynamic = 'force-dynamic'

export const revalidate = 0

const SOURCES: SheetSourceId[] = ['ensenanzas', 'estudios', 'instituto', 'pastorado', 'profecia']

export default async function ArchivosPage() {
  unstable_noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }
  // Sin comprobación de rol: cualquier usuario autenticado puede ver Archivos

  // SSR: Solamente cargamos la pestaña inicial (ensenanzas) para mejorar el TTFB.
  // El resto de pestañas se cargarán bajo demanda en el cliente.
  const initialData: Partial<Record<SheetSourceId, Record<string, string>[]>> = {}
  const initialMeta: Partial<Record<SheetSourceId, SheetFetchMeta>> = {}
  const initialErrors: Partial<Record<SheetSourceId, string>> = {}

  const primarySource: SheetSourceId = 'ensenanzas'
  try {
    const url = getSheetCSVUrl(primarySource)
    if (url) {
      const { data, meta } = await fetchAndParseSheetCSV(url)
      initialData[primarySource] = data
      initialMeta[primarySource] = meta
    } else {
      initialErrors[primarySource] = 'URL no configurada'
    }
  } catch (e) {
    initialErrors[primarySource] = e instanceof Error ? e.message : 'Error al cargar'
  }

  return (
    <ArchivosClient
      initialData={initialData}
      initialMeta={Object.keys(initialMeta).length > 0 ? initialMeta : undefined}
      initialErrors={Object.keys(initialErrors).length > 0 ? initialErrors : undefined}
    />
  )
}
