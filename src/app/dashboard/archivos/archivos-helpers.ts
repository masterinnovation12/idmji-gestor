import type { SheetSourceId } from '@/lib/csv-sheets'

export type DateColResult = { col: string | null; mesCol: string | null; diaCol: string | null }

/** Preferencia de columna principal por tab (subcadena, case y acentos insensibles) */
const PRIMARY_COL_PREFERENCE: Record<SheetSourceId, string[]> = {
  ensenanzas: ['titulo', 'enseñanza', 'enseñanza'],
  estudios: ['titulo', 'estudio', 'biblico', 'bíblico'],
  instituto: ['nombre', 'audio', 'clase'],
  pastorado: ['tema', 'titulo', 'título'],
}

/** Normaliza para comparación: sin acentos, minúsculas, sin espacios/guiones bajos */
export function normalizeForMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[\s_]/g, '')
}

export function pickPrimaryColumn(
  columns: readonly string[],
  dateCols: readonly string[],
  tabId: SheetSourceId
): string {
  const candidates = columns.filter((c) => !dateCols.includes(c))
  const prefs = PRIMARY_COL_PREFERENCE[tabId] ?? []
  for (const p of prefs) {
    const pNorm = normalizeForMatch(p)
    const found = candidates.find((c) => normalizeForMatch(c).includes(pNorm))
    if (found) return found
  }
  return candidates[0] ?? columns[0]
}
