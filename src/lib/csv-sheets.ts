/**
 * Parser CSV adaptativo para Google Sheets publicados.
 * Ver docs/archivos-publicar-web/LOGICA_PARSER_CSV_ADAPTATIVO.md
 *
 * - Cabecera = primera fila con al menos una celda no vacía
 * - Excluye filas totalmente vacías
 * - Excluye columnas totalmente vacías
 * - Normaliza cabeceras (trim, espacios → _) para claves JSON
 */

const FETCH_TIMEOUT_MS = 15_000

/**
 * Parsea una línea CSV respetando comillas dobles (RFC 4180 básico).
 * "campo con, coma" → un solo campo.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (inQuotes) {
      current += c
    } else if (c === ',') {
      result.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  result.push(current.trim())
  return result
}

function isEmptyRow(cells: string[]): boolean {
  return cells.every((c) => (c ?? '').trim() === '')
}

function normalizeHeaderCell(cell: string, index: number): string {
  const t = cell.trim()
  if (t) return t.replaceAll(/\s+/g, '_')
  return `column_${index}`
}

/**
 * Obtiene la fila de cabecera: fila con más celdas no vacías en las primeras 15.
 * Si ninguna tiene 2+ celdas, usa la primera fila no vacía (permite hojas con título de 1 celda).
 */
function findHeaderRow(rows: string[][]): { headerIndex: number; keys: string[] } | null {
  let bestIndex = -1
  let bestScore = 0

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i]
    const nonEmpty = row.filter((c) => (c ?? '').trim() !== '').length
    if (nonEmpty > bestScore) {
      bestScore = nonEmpty
      bestIndex = i
    }
  }

  if (bestIndex === -1) {
    for (let i = 0; i < rows.length; i++) {
      if (!isEmptyRow(rows[i])) {
        bestIndex = i
        break
      }
    }
  }

  if (bestIndex === -1) return null

  const row = rows[bestIndex]
  const keys = row.map((c, idx) => normalizeHeaderCell(c, idx))
  return { headerIndex: bestIndex, keys }
}

/**
 * Construye objeto desde una fila usando las claves (mismo length que headerRow).
 * Rellena faltantes con ''.
 */
function rowToObject(keys: string[], row: string[]): Record<string, string> {
  const obj: Record<string, string> = {}
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (!key) continue
    const val = String(row[i] ?? '').trim()
    obj[key] = val
  }
  return obj
}

/**
 * Elimina del array de objetos las claves (columnas) donde todos los valores están vacíos.
 */
function removeEmptyColumns(data: Record<string, string>[]): Record<string, string>[] {
  if (data.length === 0) return data
  const keys = Object.keys(data[0])
  const keysToRemove = new Set<string>()
  for (const key of keys) {
    const allEmpty = data.every((row) => (row[key] ?? '').trim() === '')
    if (allEmpty) keysToRemove.add(key)
  }
  if (keysToRemove.size === 0) return data
  return data.map((row) => {
    const next: Record<string, string> = {}
    for (const k of Object.keys(row)) {
      if (!keysToRemove.has(k)) next[k] = row[k]
    }
    return next
  })
}

/**
 * Fetch a URL con timeout y cuerpo como texto UTF-8.
 * Headers tipo navegador para que Google Sheets no devuelva 500 en algunos documentos
 * (Enseñanzas, Pastorado, etc.) cuando la petición viene de servidor.
 */
async function fetchCSVText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const res = await fetch(url, {
    signal: controller.signal,
    headers: {
      Accept: 'text/csv, text/plain; charset=utf-8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      Referer: 'https://docs.google.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })
  clearTimeout(timeout)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.text()
}

/**
 * Parsea texto CSV a array de objetos con lógica adaptativa.
 * - Primera fila no vacía = cabecera (claves normalizadas)
 * - Filas totalmente vacías excluidas
 * - Columnas totalmente vacías excluidas
 * - Elimina BOM UTF-8 si existe
 * - Rechaza respuestas HTML (p. ej. error de Google)
 */
export function parseAdaptiveCSV(csvText: string): Record<string, string>[] {
  let text = csvText
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const trimmed = text.trim()
  if (trimmed.startsWith('<!') || trimmed.startsWith('<html') || trimmed.startsWith('<HTML')) {
    return []
  }
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0)
  const rows = lines.map((line) => parseCSVLine(line))
  if (rows.length === 0) return []

  const headerInfo = findHeaderRow(rows)
  if (!headerInfo) return []

  const { headerIndex, keys } = headerInfo
  const data: Record<string, string>[] = []

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (isEmptyRow(row)) continue
    const obj = rowToObject(keys, row)
    const hasAny = keys.some((k) => obj[k] && obj[k].trim() !== '')
    if (!hasAny) continue
    data.push(obj)
  }

  return removeEmptyColumns(data)
}

export type SheetSourceId = 'ensenanzas' | 'estudios' | 'instituto' | 'pastorado'

const ENV_KEYS: Record<SheetSourceId, string> = {
  ensenanzas: 'SHEET_ENSENANZAS_CSV_URL',
  estudios: 'SHEET_ESTUDIOS_CSV_URL',
  instituto: 'SHEET_INSTITUTO_CSV_URL',
  pastorado: 'SHEET_PASTORADO_CSV_URL',
}

/**
 * Obtiene la URL CSV para un origen. Devuelve null si no está configurada.
 */
export function getSheetCSVUrl(sourceId: SheetSourceId): string | null {
  const key = ENV_KEYS[sourceId]
  const url = process.env[key]
  if (!url || typeof url !== 'string' || url.trim() === '') return null
  return url.trim()
}

/**
 * Descarga y parsea el CSV de una URL con lógica adaptativa.
 */
export async function fetchAndParseSheetCSV(url: string): Promise<Record<string, string>[]> {
  const text = await fetchCSVText(url)
  return parseAdaptiveCSV(text)
}
