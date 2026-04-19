/**
 * archivos-data.ts — Lógica de datos para la página Archivos.
 *
 * Contiene todas las funciones puras de:
 *  - Parsing de fechas (DD/MM/YYYY, ISO, DD-MM-YYYY)
 *  - Detección de columnas de fecha
 *  - Transformación MES+DÍA → FECHA unificada
 *  - Extracción de opciones mes/año para filtro
 *  - Detección de tipo de columna (date/number/alpha)
 *  - Clasificación de errores para UX
 *  - Formateo de etiquetas legibles
 *
 * @author Antigravity AI – QA Refactoring
 */

import type { SheetSourceId } from '@/lib/csv-sheets'
import type { DateColResult } from './archivos-helpers'
import { pickPrimaryColumn } from './archivos-helpers'

/* ─── Constants ────────────────────────────────────────────── */

export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MONTH_NAME_TO_NUM: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}

/* ─── Date Parsing ──────────────────────────────────────────── */

/** Intenta parsear varios formatos de fecha → Date. Devuelve null si no es fecha. */
export function parseDate(val: string): Date | null {
  if (!val) return null
  const s = val.trim()
  if (!s) return null

  // DD/MM/YYYY o D/M/YYYY
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (m) {
    const d = Number.parseInt(m[1], 10)
    const mo = Number.parseInt(m[2], 10) - 1
    const y = Number.parseInt(m[3], 10)
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) return new Date(y, mo, d)
  }

  // YYYY-MM-DD (ISO)
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (m) {
    const y = Number.parseInt(m[1], 10)
    const mo = Number.parseInt(m[2], 10) - 1
    const d = Number.parseInt(m[3], 10)
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) return new Date(y, mo, d)
  }

  // DD-MM-YYYY
  m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s)
  if (m) {
    const d = Number.parseInt(m[1], 10)
    const mo = Number.parseInt(m[2], 10) - 1
    const y = Number.parseInt(m[3], 10)
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) return new Date(y, mo, d)
  }

  return null
}

/** Obtiene fecha desde una fila: columna única o MES+DÍA (nombres de mes). */
export function getDateFromRow(
  row: Record<string, string>,
  dateCol: string | null,
  mesCol: string | null,
  diaCol: string | null,
): Date | null {
  if (dateCol) {
    const dt = parseDate(row[dateCol])
    if (dt) return dt
  }
  if (mesCol && diaCol) {
    const mesVal = (row[mesCol] ?? '').trim().toLowerCase()
    const diaVal = (row[diaCol] ?? '').trim()
    const mo = MONTH_NAME_TO_NUM[mesVal] ?? (Number.parseInt(mesVal, 10) - 1)
    const d = Number.parseInt(diaVal, 10)
    if (Number.isNaN(d) || d < 1 || d > 31) return null
    if (mo < 0 || mo > 11) return null
    const y = new Date().getFullYear()
    return new Date(y, mo, d)
  }
  return null
}

/** Texto para mostrar la fecha en cards (columna única o "DÍA MES"). */
export function getDateDisplay(row: Record<string, string>, dateInfo: DateColResult): string | null {
  if (dateInfo.col && row[dateInfo.col]) return row[dateInfo.col]
  if (dateInfo.mesCol && dateInfo.diaCol) {
    const mes = (row[dateInfo.mesCol] ?? '').trim()
    const dia = (row[dateInfo.diaCol] ?? '').trim()
    if (mes && dia) return `${dia} ${mes}`
  }
  return null
}

/* ─── Column Detection ──────────────────────────────────────── */

/** Busca columna(s) de fecha: una columna DD/MM/YYYY o el par MES+DÍA. */
export function findDateColumn(data: Record<string, string>[]): DateColResult {
  if (!data || data.length === 0) return { col: null, mesCol: null, diaCol: null }
  const keys = Object.keys(data[0])

  for (const key of keys) {
    const hits = data.slice(0, 15).filter((r) => parseDate(r[key]) !== null).length
    if (hits >= 2) return { col: key, mesCol: null, diaCol: null }
  }

  const norm = (s: string) => s.replaceAll(/[\s_]/g, '').toLowerCase()
  const mesKey = keys.find((k) => norm(k) === 'mes')
  const diaKey = keys.find((k) => /^d[ií]a$/.test(norm(k)))
  if (mesKey && diaKey) {
    const hits = data.slice(0, 15).filter((r) => getDateFromRow(r, null, mesKey, diaKey) !== null).length
    if (hits >= 2) return { col: null, mesCol: mesKey, diaCol: diaKey }
  }

  return { col: null, mesCol: null, diaCol: null }
}

/** Claves de columnas de fecha activas. */
export const DATE_COL_KEYS = (d: DateColResult) =>
  [d.col, d.mesCol, d.diaCol].filter(Boolean) as string[]

/* ─── Data Transforms ─────────────────────────────────────── */

/**
 * Cuando hay MES+DÍA (p. ej. Estudios Bíblicos con celdas fusionadas):
 * - Rellena MES vacío con el valor anterior (forward-fill)
 * - Crea columna FECHA única en formato D/M/YYYY (como Enseñanzas)
 * - Elimina MES y DÍA de la vista
 */
export function transformMesDiaToFecha(
  data: Record<string, string>[],
  dateInfo: DateColResult,
): { data: Record<string, string>[]; columns: string[]; dateInfo: DateColResult } {
  if (!data || !dateInfo.mesCol || !dateInfo.diaCol || data.length === 0) {
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []
    return { data: data ?? [], columns, dateInfo }
  }

  const mesCol = dateInfo.mesCol
  const diaCol = dateInfo.diaCol
  const otherCols = Object.keys(data[0]).filter((k) => k !== mesCol && k !== diaCol)

  let lastMes = ''
  const transformed: Record<string, string>[] = []

  for (const row of data) {
    const mesRaw = (row[mesCol] ?? '').trim()
    const mes = mesRaw || lastMes
    if (mes) lastMes = mes

    const dt = getDateFromRow({ ...row, [mesCol]: mes }, null, mesCol, diaCol)
    const fechaStr = dt ? `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}` : ''

    const newRow: Record<string, string> = { FECHA: fechaStr }
    for (const k of otherCols) newRow[k] = row[k] ?? ''
    transformed.push(newRow)
  }

  const columns = ['FECHA', ...otherCols]
  return {
    data: transformed,
    columns,
    dateInfo: { col: 'FECHA', mesCol: null, diaCol: null },
  }
}

/** Extrae opciones únicas mes+año desde columna(s) de fecha. */
export function extractMonthYears(
  data: Record<string, string>[],
  dateInfo: DateColResult,
): { year: number; month: number; label: string }[] {
  if (!data || !dateInfo) return []
  const seen = new Map<string, { year: number; month: number; label: string }>()
  for (const row of data) {
    const dt = getDateFromRow(row, dateInfo.col, dateInfo.mesCol, dateInfo.diaCol)
    if (!dt) continue
    const key = `${dt.getFullYear()}-${dt.getMonth()}`
    if (!seen.has(key)) {
      seen.set(key, {
        year: dt.getFullYear(),
        month: dt.getMonth(),
        label: `${MONTHS_ES[dt.getMonth()]} ${dt.getFullYear()}`,
      })
    }
  }
  return [...seen.values()].sort((a, b) =>
    a.year === b.year ? b.month - a.month : b.year - a.year,
  )
}

/* ─── Column Type Detection ─────────────────────────────────── */

export type ColType = 'date' | 'number' | 'alpha'

/** Detecta el tipo de dato de una columna para determinar cómo ordenar */
export function detectColType(col: string, data: Record<string, string>[]): ColType {
  if (!data || data.length === 0) return 'alpha'
  const sample = data.slice(0, 20).map((r) => (r[col] ?? '').trim()).filter(Boolean)
  if (sample.length === 0) return 'alpha'
  // Date detection
  const dateHits = sample.filter((v) => parseDate(v) !== null).length
  if (dateHits / sample.length >= 0.5) return 'date'
  // Number detection
  const numHits = sample.filter((v) => {
    const n = Number(v.replaceAll(',', '.'))
    return !Number.isNaN(n) && v !== ''
  }).length
  if (numHits / sample.length >= 0.7) return 'number'
  return 'alpha'
}

/* ─── Sort Logic ────────────────────────────────────────────── */

export type SortField = 'date' | 'alpha' | 'col'
export type SortDir = 'asc' | 'desc'
export type SortConfig = {
  field: SortField
  dir: SortDir
  col?: string
  colType?: ColType
}

/** Ordena los datos según la configuración de sort proporcionada. */
export function sortData(
  data: Record<string, string>[],
  sortConfig: SortConfig | null,
  dateInfo: DateColResult,
  columns: string[],
  activeTab: SheetSourceId,
): Record<string, string>[] {
  if (!sortConfig) return data
  const { field, dir } = sortConfig
  const dateCols = DATE_COL_KEYS(dateInfo)

  return [...data].sort((a, b) => {
    // Ordenamiento por columna específica (clic en cabecera)
    if (field === 'col' && sortConfig.col) {
      const col = sortConfig.col
      const type = sortConfig.colType ?? detectColType(col, data)
      if (type === 'date') {
        const da = parseDate(a[col] ?? '')
        const db = parseDate(b[col] ?? '')
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        const diff = da.getTime() - db.getTime()
        return dir === 'asc' ? diff : -diff
      }
      if (type === 'number') {
        const na = Number.parseFloat((a[col] ?? '').replaceAll(',', '.')) || 0
        const nb = Number.parseFloat((b[col] ?? '').replaceAll(',', '.')) || 0
        return dir === 'asc' ? na - nb : nb - na
      }
      const va = (a[col] ?? '').toLowerCase()
      const vb = (b[col] ?? '').toLowerCase()
      return dir === 'asc' ? va.localeCompare(vb, 'es') : vb.localeCompare(va, 'es')
    }

    // Ordenamiento general por fecha
    if (field === 'date') {
      const da = getDateFromRow(a, dateInfo.col, dateInfo.mesCol, dateInfo.diaCol)
      const db = getDateFromRow(b, dateInfo.col, dateInfo.mesCol, dateInfo.diaCol)
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      const diff = da.getTime() - db.getTime()
      return dir === 'asc' ? diff : -diff
    }

    // alpha: columna principal
    const primaryCol =
      pickPrimaryColumn(columns ?? [], dateCols, activeTab) ??
      (columns ?? []).find((c) => !dateCols.includes(c)) ??
      (columns ?? [])[0]
    const va = (a[primaryCol] ?? '').toLowerCase()
    const vb = (b[primaryCol] ?? '').toLowerCase()
    const cmp = va.localeCompare(vb, 'es')
    return dir === 'asc' ? cmp : -cmp
  })
}

/* ─── Formatting ──────────────────────────────────────────── */

/** Una palabra con mayúscula inicial respetando ñ, vocales acentuadas, etc. */
function capitalizeWordEs(word: string): string {
  const w = word.trim().toLocaleLowerCase('es-ES')
  if (!w) return ''
  return w.replace(/^(\p{L})(.*)$/u, (__, first: string, rest: string) =>
    first.toLocaleUpperCase('es-ES') + rest,
  )
}

/**
 * Etiqueta legible para cabeceras CSV (underscores → espacios, title case por palabra).
 * \b\w de JS no trata í, ñ, etc. como letras de palabra → "Día" se veía como "DiA".
 */
export function prettyKey(k: string) {
  if (!k) return ''
  return k
    .replaceAll('_', ' ')
    .split('/')
    .map((segment) =>
      segment
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(capitalizeWordEs)
        .join(' '),
    )
    .filter(Boolean)
    .join(' / ')
}

export function formatCachedAtLabel(iso: string | undefined, lang: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat(lang === 'ca-ES' ? 'ca' : 'es', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return iso
  }
}

/* ─── Error Classification ──────────────────────────────────── */

/** Clasifica el mensaje de error para mostrar tipo y sugerencia. */
export function parseErrorDisplay(error: string): { type: string; hint: string | null } {
  const e = error.trim()
  if (/HTTP\s*500|500\s*Internal|Error interno del servidor/i.test(e)) {
    return {
      type: 'Error de servidor (HTTP 500)',
      hint: 'El documento de Google Sheets no responde. Comprueba que la hoja esté publicada en la web (Archivo → Compartir → Publicar en la web) y que la URL en las variables de entorno sea correcta.',
    }
  }
  if (/HTTP\s*404|404\s*Not\s*Found/i.test(e)) {
    return { type: 'No encontrado (HTTP 404)', hint: 'La URL del documento no es válida o la hoja ya no está publicada.' }
  }
  if (/HTTP\s*403|403\s*Forbidden/i.test(e)) {
    return { type: 'Acceso denegado (HTTP 403)', hint: 'El documento no permite acceso público. Publica la hoja en la web como "Cualquier persona con el enlace".' }
  }
  if (/fetch|network|timeout|aborted|ECONNREFUSED/i.test(e)) {
    return { type: 'Error de conexión', hint: 'Comprueba tu conexión a internet e inténtalo de nuevo.' }
  }
  if (/No autenticado|401|unauthorized/i.test(e)) {
    return { type: 'No autenticado', hint: 'Inicia sesión de nuevo.' }
  }
  if (/URL.*no configurada|no está configurada/i.test(e)) {
    return { type: 'Configuración', hint: 'Falta la variable de entorno para esta hoja (p. ej. SHEET_ENSENANZAS_CSV_URL).' }
  }
  return { type: 'Error al cargar', hint: null }
}
