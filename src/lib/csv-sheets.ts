/**
 * Parser CSV adaptativo para Google Sheets publicados.
 * Ver docs/archivos-publicar-web/LOGICA_PARSER_CSV_ADAPTATIVO.md
 *
 * - Cabecera = primera fila con al menos una celda no vacía
 * - Excluye filas totalmente vacías
 * - Excluye columnas totalmente vacías
 * - Normaliza cabeceras (trim, espacios → _) para claves JSON
 *
 * Caché: si el export de Google falla (500/429), se sirve la última copia válida
 * (memoria + archivo en tmp del runtime) hasta 30 días, para que Archivos siga mostrando datos.
 */

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/** Hojas grandes recién editadas tardan más en generar el CSV; 20s fallaba a veces con “timeout” efectivo. */
const FETCH_TIMEOUT_MS = 35_000
/** Google a veces responde 500/429 al export CSV desde IPs de datacenter; varios reintentos con backoff ayudan. */
const MAX_RETRIES = 5

/** Antigüedad máxima para usar CSV en caché cuando Google falla (30 días). */
const STALE_CACHE_MAX_MS = 30 * 24 * 60 * 60 * 1000

type CachedCsvPayload = { text: string; at: number }

function getMemoryCsvCache(): Map<string, CachedCsvPayload> {
  const g = globalThis as unknown as { __idmjiCsvCache?: Map<string, CachedCsvPayload> }
  g.__idmjiCsvCache ??= new Map()
  return g.__idmjiCsvCache
}

function cacheFilePathForUrl(url: string): string {
  const hash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 48)
  return path.join(os.tmpdir(), `idmji-sheet-${hash}.json`)
}

async function persistCsvCache(url: string, text: string): Promise<void> {
  const payload: CachedCsvPayload = { text, at: Date.now() }
  getMemoryCsvCache().set(url, payload)
  try {
    await fs.writeFile(cacheFilePathForUrl(url), JSON.stringify(payload), 'utf8')
  } catch {
    // Sin permiso en tmp o entorno de solo lectura: solo memoria
  }
}

async function readDiskCsvCache(url: string): Promise<CachedCsvPayload | null> {
  try {
    const raw = await fs.readFile(cacheFilePathForUrl(url), 'utf8')
    const parsed = JSON.parse(raw) as CachedCsvPayload
    if (parsed && typeof parsed.text === 'string' && typeof parsed.at === 'number') return parsed
  } catch {
    /* no hay archivo */
  }
  return null
}

function isStaleUsable(entry: CachedCsvPayload): boolean {
  return Date.now() - entry.at <= STALE_CACHE_MAX_MS
}

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
async function fetchOnce(url: string, headers: HeadersInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers,
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Genera variantes de URL para mejorar resiliencia con Google Sheets publicados.
 * Caso típico: /pub?output=csv falla (500) pero /pub?output=csv&single=true sí responde.
 */
function buildCandidateUrls(url: string): string[] {
  const out: string[] = [url]
  try {
    const u = new URL(url)
    const isPubEndpoint = u.pathname.endsWith('/pub')
    const output = (u.searchParams.get('output') ?? '').toLowerCase()

    if (isPubEndpoint && output === 'csv') {
      const single = u.searchParams.get('single')
      const gid = u.searchParams.get('gid')

      // Variante 1: forzar single=true
      if (single !== 'true') {
        const v1 = new URL(u.toString())
        v1.searchParams.set('single', 'true')
        out.push(v1.toString())
      }

      // Variante 2: forzar gid=0 (primera hoja) para exports inestables
      if (!gid) {
        const v2 = new URL(u.toString())
        v2.searchParams.set('gid', '0')
        out.push(v2.toString())
      }

      // Variante 3: single=true + gid=0
      if (single !== 'true' || !gid) {
        const v3 = new URL(u.toString())
        v3.searchParams.set('single', 'true')
        v3.searchParams.set('gid', '0')
        out.push(v3.toString())
      }
    }
  } catch {
    // URL inválida: usar original
  }

  return [...new Set(out)]
}

/** Google/CDN a veces devuelve 500 en la URL “caliente” tras publicar cambios; un parámetro único evita caché de borde. */
function withCacheBust(u: string): string {
  const sep = u.includes('?') ? '&' : '?'
  return `${u}${sep}idmji_export_ts=${Date.now()}`
}

async function fetchCSVText(url: string): Promise<string> {
  const browserLikeHeaders: HeadersInit = {
    Accept: 'text/csv, text/plain; charset=utf-8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    Referer: 'https://docs.google.com/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }

  const fallbackHeaders: HeadersInit = {
    Accept: 'text/csv, text/plain; charset=utf-8',
    'User-Agent': 'Mozilla/5.0',
  }

  let lastStatus: number | null = null
  let lastStatusText = 'Unknown'
  const candidates = buildCandidateUrls(url)

  for (const candidate of candidates) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const headers = attempt % 2 === 1 ? browserLikeHeaders : fallbackHeaders
      const res = await fetchOnce(candidate, headers)

      if (res.ok) return res.text()

      lastStatus = res.status
      lastStatusText = res.statusText

      // Reintentar en 429 (rate limit) y 5xx (Google suele devolver 500 intermitente en export CSV)
      const retryable = res.status === 429 || (res.status >= 500 && res.status < 600)
      if (!retryable || attempt === MAX_RETRIES) break

      const backoffMs = Math.min(2500, 350 * 2 ** (attempt - 1))
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }

    // Tras agregar filas/columnas en Sheets, el export pub a vecle solo falla en la URL cacheada; bust + backoff breve.
    for (let bust = 1; bust <= 2; bust++) {
      const busted = withCacheBust(candidate)
      const headers = bust % 2 === 1 ? browserLikeHeaders : fallbackHeaders
      const res = await fetchOnce(busted, headers)
      if (res.ok) return res.text()
      lastStatus = res.status
      lastStatusText = res.statusText
      await new Promise((resolve) => setTimeout(resolve, 500 * bust))
    }
  }

  class HttpError extends Error {
    status: number | null
    constructor(message: string, status: number | null) {
      super(message)
      this.status = status
    }
  }
  throw new HttpError(`HTTP ${lastStatus ?? 500}: ${lastStatusText}`, lastStatus)
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
  if (text.codePointAt(0) === 0xfeff) text = text.slice(1)
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

export type SheetSourceId = 'ensenanzas' | 'estudios' | 'instituto' | 'pastorado' | 'profecia'

const ENV_KEYS: Record<SheetSourceId, string> = {
  ensenanzas: 'SHEET_ENSENANZAS_CSV_URL',
  estudios: 'SHEET_ESTUDIOS_CSV_URL',
  instituto: 'SHEET_INSTITUTO_CSV_URL',
  pastorado: 'SHEET_PASTORADO_CSV_URL',
  profecia: 'SHEET_PROFECIA_CSV_URL',
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

/** Metadatos de la última lectura: `stale` true = copia en caché porque Google falló. */
export type SheetFetchMeta = {
  stale: boolean
  /** ISO 8601; solo cuando stale es true */
  cachedAt?: string
  /** Código de error HTTP si falló el fetch más reciente */
  lastErrorCode?: number
}

export type SheetFetchResult = {
  data: Record<string, string>[]
  meta: SheetFetchMeta
}

/**
 * Descarga y parsea el CSV de una URL con lógica adaptativa.
 * Ante fallo de Google, reutiliza la última descarga correcta (memoria / disco, hasta 30 días).
 */
export async function fetchAndParseSheetCSV(url: string): Promise<SheetFetchResult> {
  try {
    const text = await fetchCSVText(url)
    await persistCsvCache(url, text)
    return { data: parseAdaptiveCSV(text), meta: { stale: false } }
  } catch (err) {
    const mem = getMemoryCsvCache().get(url)
    const errorCode = err instanceof Error && 'status' in err ? (err as { status: number }).status : undefined
    if (mem && isStaleUsable(mem)) {
      const cachedAt = new Date(mem.at).toISOString()
      console.warn(
        '[csv-sheets] Export CSV falló; usando caché en memoria (antigüedad %ds)',
        Math.round((Date.now() - mem.at) / 1000)
      )
      return { data: parseAdaptiveCSV(mem.text), meta: { stale: true, cachedAt, lastErrorCode: errorCode } }
    }
    const disk = await readDiskCsvCache(url)
    if (disk && isStaleUsable(disk)) {
      getMemoryCsvCache().set(url, disk)
      const cachedAt = new Date(disk.at).toISOString()
      console.warn('[csv-sheets] Export CSV falló; usando caché en disco (tmp)')
      return { data: parseAdaptiveCSV(disk.text), meta: { stale: true, cachedAt, lastErrorCode: errorCode } }
    }
    throw err
  }
}

/**
 * Elimina la caché en memoria y en disco para una URL concreta.
 * Útil antes de un "force-refresh" para que no caiga en datos viejos si Google tarda.
 */
export async function invalidateCsvCache(url: string): Promise<void> {
  getMemoryCsvCache().delete(url)
  try {
    await fs.unlink(cacheFilePathForUrl(url))
  } catch {
    // No hay archivo: ignorar
  }
}

/**
 * Variante "fuerza": invalida caché local y reintenta más agresivamente contra Google.
 * Si Google sigue fallando después de todos los intentos, lanza el error (NO sirve caché antigua).
 * Así el caller sabe con certeza que los datos siguen sin actualizarse.
 */
export async function fetchAndParseSheetCSVForce(url: string): Promise<SheetFetchResult> {
  await invalidateCsvCache(url)
  // Intentamos varias variantes incluyendo cache-bust extra
  const candidates = buildCandidateUrls(url)
  const browserLikeHeaders: HeadersInit = {
    Accept: 'text/csv, text/plain; charset=utf-8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    Referer: 'https://docs.google.com/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }

  let lastStatus: number | null = null
  for (const candidate of candidates) {
    // Hasta FORCE_EXTRA_RETRIES intentos por candidato, siempre con cache-bust
    const FORCE_RETRIES = 4
    for (let attempt = 1; attempt <= FORCE_RETRIES; attempt++) {
      const busted = withCacheBust(candidate)
      const res = await fetchOnce(busted, browserLikeHeaders)
      if (res.ok) {
        const text = await res.text()
        await persistCsvCache(url, text)
        return { data: parseAdaptiveCSV(text), meta: { stale: false } }
      }
      lastStatus = res.status
      const retryable = res.status === 429 || (res.status >= 500 && res.status < 600)
      if (!retryable || attempt === FORCE_RETRIES) break
      await new Promise((resolve) => setTimeout(resolve, Math.min(3000, 500 * attempt)))
    }
  }

  class HttpError extends Error {
    status: number | null
    constructor(message: string, status: number | null) { super(message); this.status = status }
  }
  throw new HttpError(`Force-refresh: Google sigue respondiendo HTTP ${lastStatus ?? 500}`, lastStatus)
}
