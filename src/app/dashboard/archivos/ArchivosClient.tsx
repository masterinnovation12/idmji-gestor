'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { ArchivosResult } from './actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Modal } from '@/components/ui/Modal'
import {
  Loader2, AlertCircle, ChevronRight, ChevronDown,
  BookOpen, BookText, GraduationCap, UsersRound, Filter,
  RefreshCw, Search, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronsUpDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SheetSourceId } from '@/lib/csv-sheets'
import { pickPrimaryColumn, type DateColResult } from './archivos-helpers'

/* ─── Constants ─────────────────────────────────────────── */
const POLLING_INTERVAL_MS = 45_000

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

type TabConfig = {
  id: SheetSourceId
  labelKey: string
  label: string
  icon: React.ElementType
  color: string
  bg: string
  activeBg: string
}

const TABS_BASE = [
  { id: 'ensenanzas' as SheetSourceId, labelKey: 'archivos.tab.ensenanzas', icon: BookOpen,       color: 'text-blue-600  dark:text-blue-400',  bg: 'bg-blue-50  dark:bg-blue-950/40',  activeBg: 'bg-blue-600  dark:bg-blue-500'  },
  { id: 'estudios'   as SheetSourceId, labelKey: 'archivos.tab.estudios',   icon: BookText,       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', activeBg: 'bg-emerald-600 dark:bg-emerald-500' },
  { id: 'instituto'  as SheetSourceId, labelKey: 'archivos.tab.instituto',  icon: GraduationCap, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40', activeBg: 'bg-violet-600 dark:bg-violet-500' },
  { id: 'pastorado'  as SheetSourceId, labelKey: 'archivos.tab.pastorado',  icon: UsersRound,    color: 'text-amber-600  dark:text-amber-400',  bg: 'bg-amber-50  dark:bg-amber-950/40',  activeBg: 'bg-amber-600  dark:bg-amber-500'  },
]

/* ─── Helpers ────────────────────────────────────────────── */

const MONTH_NAME_TO_NUM: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}

/** Intenta parsear varios formatos de fecha → Date. Devuelve null si no es fecha. */
function parseDate(val: string): Date | null {
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
function getDateFromRow(row: Record<string, string>, dateCol: string | null, mesCol: string | null, diaCol: string | null): Date | null {
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
function getDateDisplay(row: Record<string, string>, dateInfo: DateColResult): string | null {
  if (dateInfo.col && row[dateInfo.col]) return row[dateInfo.col]
  if (dateInfo.mesCol && dateInfo.diaCol) {
    const mes = (row[dateInfo.mesCol] ?? '').trim()
    const dia = (row[dateInfo.diaCol] ?? '').trim()
    if (mes && dia) return `${dia} ${mes}`
  }
  return null
}

/** Busca columna(s) de fecha: una columna DD/MM/YYYY o el par MES+DÍA. */
function findDateColumn(data: Record<string, string>[]): DateColResult {
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

/**
 * Cuando hay MES+DÍA (p. ej. Estudios Bíblicos con celdas fusionadas):
 * - Rellena MES vacío con el valor anterior (forward-fill)
 * - Crea columna FECHA única en formato D/M/YYYY (como Enseñanzas)
 * - Elimina MES y DÍA de la vista
 */
function transformMesDiaToFecha(
  data: Record<string, string>[],
  dateInfo: DateColResult
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

    const dia = (row[diaCol] ?? '').trim()
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
function extractMonthYears(
  data: Record<string, string>[],
  dateInfo: DateColResult
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
    a.year === b.year ? b.month - a.month : b.year - a.year
  )
}

function prettyKey(k: string) {
  return k
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Detecta el tipo de dato de una columna para determinar cómo ordenar */
type ColType = 'date' | 'number' | 'alpha'
function detectColType(col: string, data: Record<string, string>[]): ColType {
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

/** Icono en la cabecera de columna según el estado de ordenamiento activo */
type ColSortIconProps = Readonly<{ col: string; sortConfig: { field: string; dir: string; col?: string } | null }>
function ColSortIcon({ col, sortConfig }: ColSortIconProps) {
  const isActive = sortConfig?.field === 'col' && sortConfig.col === col
  if (!isActive) {
    return <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" />
  }
  return sortConfig?.dir === 'asc'
    ? <ArrowUp className="w-4 h-4 shrink-0 opacity-100 drop-shadow-sm" />
    : <ArrowDown className="w-4 h-4 shrink-0 opacity-100 drop-shadow-sm" />
}

/* ─── HighlightText ──────────────────────────────────────────────── */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text || '—'}</>
  const pattern = escapeRegex(query.trim())
  const regex = new RegExp(`(${pattern})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200/90 dark:bg-yellow-500/30 text-foreground rounded-[3px] px-0.5 not-italic font-semibold"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

/* ─── SearchBar ──────────────────────────────────────────────────── */
type SearchBarProps = Readonly<{
  value: string
  onChange: (v: string) => void
  placeholder?: string
  accentColor: string
  activeBg: string
  resultsCount: number
  totalCount: number
}>

function SearchBar({ value, onChange, placeholder = 'Buscar...', accentColor, resultsCount, totalCount }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isActive = value.trim().length > 0
  const hasNoResults = isActive && resultsCount === 0

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10">
        <Search
          className={`w-4 h-4 transition-all duration-200 ${
            isActive ? accentColor : 'text-muted-foreground/40'
          }`}
        />
      </div>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full pl-10 pr-10 py-3 rounded-xl border text-sm
          bg-background/60 backdrop-blur-sm
          placeholder:text-muted-foreground/40
          focus:outline-none focus:ring-2 transition-all duration-200
          ${hasNoResults
            ? 'border-destructive/40 focus:border-destructive/60 focus:ring-destructive/15'
            : isActive
              ? 'border-primary/40 focus:border-primary/60 focus:ring-primary/15 bg-background'
              : 'border-border hover:border-border/80 focus:border-primary/40 focus:ring-primary/10'
          }
        `}
      />
      {isActive && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => { onChange(''); inputRef.current?.focus() }}
          className="absolute inset-y-0 right-3 flex items-center"
        >
          <X className="w-4 h-4 text-muted-foreground/50 hover:text-foreground transition-colors" />
        </button>
      )}
      {isActive && (
        <div
          className={`absolute -bottom-5 right-1 text-[10px] font-medium transition-colors ${
            hasNoResults ? 'text-destructive/70' : 'text-muted-foreground/60'
          }`}
        >
          {hasNoResults
            ? 'Sin resultados'
            : `${resultsCount} de ${totalCount} resultado${resultsCount !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  )
}

/* ─── Shared: portal dropdown base ─────────────────────────── */
type PortalRect = { top: number; left: number; minWidth: number }

function usePortalDropdown() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [rect, setRect] = useState<PortalRect | null>(null)

  useEffect(() => {
    if (open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setRect({ top: r.bottom + 6, left: r.left, minWidth: Math.max(r.width, 200) })
    } else {
      setRect(null)
    }
  }, [open])

  return { open, setOpen, triggerRef, rect }
}

/* ─── FilterDropdown ────────────────────────────────────────── */
type FilterDropdownProps = Readonly<{
  monthYearOptions: { year: number; month: number; label: string }[]
  filterMonthYear: string
  setFilterMonthYear: (v: string) => void
  activeTabConfig: TabConfig
  hasFilter: boolean
  tAllPeriods: string
}>

function FilterDropdown({ monthYearOptions, filterMonthYear, setFilterMonthYear, activeTabConfig, hasFilter, tAllPeriods }: FilterDropdownProps) {
  const { t } = useI18n()
  const { open, setOpen, triggerRef, rect } = usePortalDropdown()

  const currentLabel = hasFilter
    ? monthYearOptions.find((o) => `${o.year}-${o.month}` === filterMonthYear)?.label
    : null

  // Agrupa por año para mostrar separadores
  const byYear = monthYearOptions.reduce<Record<number, typeof monthYearOptions>>((acc, o) => {
    if (!acc[o.year]) acc[o.year] = []
    acc[o.year].push(o)
    return acc
  }, {})
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold
          transition-all touch-manipulation
          ${hasFilter
            ? `${activeTabConfig.activeBg} text-white shadow`
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }
        `}
      >
        <Filter className="w-4 h-4" />
        <span>{t('archivos.filter.label')}</span>
        {hasFilter && currentLabel && (
          <span className="text-xs opacity-90">({currentLabel})</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && rect && createPortal(
        <>
          <div className="fixed inset-0 z-200" aria-hidden onClick={() => setOpen(false)} />
          <div
            className="fixed z-201 rounded-xl border border-border shadow-2xl overflow-hidden bg-white dark:bg-zinc-900 max-h-[300px] overflow-y-auto"
            style={{ top: rect.top, left: rect.left, minWidth: rect.minWidth }}
          >
            {/* Todos */}
            <button
              type="button"
              onClick={() => { setFilterMonthYear('all'); setOpen(false) }}
              className={[
                'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors',
                filterMonthYear === 'all'
                  ? `${activeTabConfig.activeBg} text-white`
                  : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <span className="text-base leading-none">·</span>
              <span>{tAllPeriods}</span>
            </button>

            {/* Por año agrupado */}
            {years.map((year) => (
              <div key={year}>
                <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 bg-muted/30 border-t border-border/40">
                  {year}
                </div>
                {byYear[year].map((opt) => {
                  const key = `${opt.year}-${opt.month}`
                  const isActive = filterMonthYear === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setFilterMonthYear(key); setOpen(false) }}
                      className={[
                        'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors',
                        isActive
                          ? `${activeTabConfig.activeBg} text-white font-semibold`
                          : 'text-foreground hover:bg-muted/50',
                      ].join(' ')}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white' : activeTabConfig.color.replace('text-', 'bg-')}`} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

/* ─── SortDropdown ──────────────────────────────────────────── */
type SortField = 'date' | 'alpha' | 'col'
type SortDir = 'asc' | 'desc'
export type SortConfig = {
  field: SortField
  dir: SortDir
  col?: string        // columna específica cuando field === 'col'
  colType?: ColType   // tipo detectado de esa columna
}

type SortOption = { field: SortField; dir: SortDir; label: string; sublabel: string; Icon: React.ElementType }

const ALL_SORT_OPTIONS_BASE = [
  { field: 'date'  as SortField, dir: 'desc' as SortDir, labelKey: 'archivos.sort.recent',       sublabel: 'fecha ↓', Icon: ArrowDown },
  { field: 'date'  as SortField, dir: 'asc'  as SortDir, labelKey: 'archivos.sort.oldest',       sublabel: 'fecha ↑', Icon: ArrowUp   },
  { field: 'alpha' as SortField, dir: 'asc'  as SortDir, labelKey: 'archivos.sort.alpha',        sublabel: 'A → Z',   Icon: ArrowDown },
  { field: 'alpha' as SortField, dir: 'desc' as SortDir, labelKey: 'archivos.sort.alphaReverse', sublabel: 'Z → A',   Icon: ArrowUp   },
]

type SortDropdownProps = Readonly<{
  sortConfig: SortConfig | null
  setSortConfig: (v: SortConfig | null) => void
  activeTabConfig: TabConfig
  hasDateInfo: boolean
  tSortLabels: { recent: string; oldest: string; alpha: string; alphaR: string; noSort: string; sort: string }
}>

function SortDropdown({ sortConfig, setSortConfig, activeTabConfig, hasDateInfo, tSortLabels }: SortDropdownProps) {
  const { open, setOpen, triggerRef, rect } = usePortalDropdown()
  const hasSort = sortConfig !== null

  const ALL_SORT_OPTIONS: SortOption[] = ALL_SORT_OPTIONS_BASE.map((o) => ({
    ...o,
    label: o.labelKey === 'archivos.sort.recent' ? tSortLabels.recent
         : o.labelKey === 'archivos.sort.oldest' ? tSortLabels.oldest
         : o.labelKey === 'archivos.sort.alpha'  ? tSortLabels.alpha
         : tSortLabels.alphaR,
  }))

  const sortLabel = sortConfig
    ? sortConfig.field === 'date'
      ? (sortConfig.dir === 'desc' ? tSortLabels.recent : tSortLabels.oldest)
      : sortConfig.field === 'alpha'
        ? (sortConfig.dir === 'asc' ? tSortLabels.alpha : tSortLabels.alphaR)
        : sortConfig.col
          ? `${prettyKey(sortConfig.col)} ${sortConfig.dir === 'asc' ? '↑' : '↓'}`
          : null
    : null

  const options = ALL_SORT_OPTIONS.filter((o) => hasDateInfo || o.field !== 'date')

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold
          transition-all touch-manipulation
          ${hasSort
            ? `${activeTabConfig.activeBg} text-white shadow`
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }
        `}
      >
        <ArrowUpDown className="w-4 h-4" />
        <span>{tSortLabels.sort}</span>
        {hasSort && sortLabel && (
          <span className="text-xs opacity-90">({sortLabel})</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && rect && createPortal(
        <>
          <div className="fixed inset-0 z-200" aria-hidden onClick={() => setOpen(false)} />
          <div
            className="fixed z-201 rounded-xl border border-border shadow-2xl overflow-hidden bg-white dark:bg-zinc-900"
            style={{ top: rect.top, left: rect.left, minWidth: rect.minWidth }}
          >
            {/* Sin ordenar */}
            <button
              type="button"
              onClick={() => { setSortConfig(null); setOpen(false) }}
              className={[
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors',
                !hasSort
                  ? `${activeTabConfig.activeBg} text-white`
                  : 'text-muted-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <ArrowUpDown className="w-4 h-4 shrink-0" />
              <span>{tSortLabels.noSort}</span>
            </button>

            <div className="h-px bg-border/40 mx-3" />

            {/* Opciones */}
            {options.map((opt) => {
              const isActive = sortConfig?.field === opt.field && sortConfig?.dir === opt.dir
              const { Icon } = opt
              return (
                <button
                  key={`${opt.field}-${opt.dir}`}
                  type="button"
                  onClick={() => { setSortConfig({ field: opt.field, dir: opt.dir }); setOpen(false) }}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                    isActive
                      ? `${activeTabConfig.activeBg} text-white font-semibold`
                      : 'text-foreground hover:bg-muted/50',
                  ].join(' ')}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="font-medium">{opt.label}</span>
                    <span className={`text-[10px] ${isActive ? 'opacity-70' : 'text-muted-foreground'}`}>{opt.sublabel}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

/* ─── Row-card (mobile) ──────────────────────────────────── */
const DATE_COL_KEYS = (d: DateColResult) =>
  [d.col, d.mesCol, d.diaCol].filter(Boolean) as string[]

type RowCardProps = Readonly<{
  row: Record<string, string>
  columns: readonly string[]
  dateInfo: DateColResult
  tabId: SheetSourceId
  accentBg: string
  accentText: string
  onClick: () => void
  searchQuery?: string
}>

function RowCard({ row, columns, dateInfo, tabId, accentBg, accentText, onClick, searchQuery = '' }: RowCardProps) {
  const dateVal = getDateDisplay(row, dateInfo)
  const dateCols = DATE_COL_KEYS(dateInfo)
  const primaryCol = pickPrimaryColumn(columns, dateCols, tabId)
  const restCols = columns.filter((c) => !dateCols.includes(c) && c !== primaryCol)

  const primaryVal = primaryCol ? row[primaryCol] : ''
  const dateParts = dateVal?.split('/') ?? []
  const hasSlashDate = dateParts.length >= 3
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="archivo-card"
      aria-label={primaryVal ? `Ver detalle: ${String(primaryVal).slice(0, 50)}` : 'Ver detalle del registro'}
      className="w-full text-left p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors group touch-manipulation"
    >
      <div className="flex items-start gap-3">
        {/* Date badge */}
        {dateVal && (
          <div className={`shrink-0 rounded-xl ${accentBg} px-2.5 py-1.5 text-center min-w-[52px]`}>
            {hasSlashDate ? (
              <>
                <div className={`text-xs font-bold ${accentText} leading-tight`}>
                  {dateParts.slice(0, 2).join('/')}
                </div>
                <div className={`text-[10px] ${accentText} opacity-70`}>{dateParts[2]}</div>
              </>
            ) : (
              <div className={`text-xs font-bold ${accentText} leading-tight`}>{dateVal}</div>
            )}
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {primaryCol && (
            <div className="font-semibold text-sm text-foreground line-clamp-2 mb-1">
              <HighlightText text={row[primaryCol] || '—'} query={searchQuery} />
            </div>
          )}
          {restCols.slice(0, 3).map((col) => (
            row[col] ? (
              <div key={col} className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{prettyKey(col)}:</span>{' '}
                <HighlightText text={row[col]} query={searchQuery} />
              </div>
            ) : null
          ))}
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
      </div>
    </button>
  )
}

/* ─── Main component ─────────────────────────────────────── */
type ArchivosClientProps = {
  initialData?: Partial<Record<SheetSourceId, Record<string, string>[]>>
  initialErrors?: Partial<Record<SheetSourceId, string>>
}

export default function ArchivosClient({ initialData = {}, initialErrors }: ArchivosClientProps) {
  const { t } = useI18n()

  // Tabs con etiquetas traducidas
  const TABS: TabConfig[] = TABS_BASE.map((tab) => ({
    ...tab,
    label: t(tab.labelKey as Parameters<typeof t>[0]),
  }))

  const [activeTab, setActiveTab] = useState<SheetSourceId>('ensenanzas')

  // Inicializar directamente con datos del servidor (evita "Cargando..." innecesario)
  const initialRows = initialData['ensenanzas']
  const initialErr = initialErrors?.['ensenanzas']
  const [data, setData] = useState<Record<string, string>[] | null>(
    Array.isArray(initialRows) && initialRows.length > 0 ? initialRows : null
  )
  const [loading, setLoading] = useState(!Array.isArray(initialRows) || initialRows.length === 0)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(initialErr ?? null)
  const [detailRow, setDetailRow] = useState<Record<string, string> | null>(null)
  const [filterMonthYear, setFilterMonthYear] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initialDataRef = useRef(initialData)

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!

  /* ── Fetch: API route (para refresh/polling y tabs sin datos iniciales) ── */
  const fetchTab = useCallback(async (sourceId: SheetSourceId, silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const res = await fetch(`/api/archivos?source=${encodeURIComponent(sourceId)}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      const result: ArchivosResult = await res.json()
      setLoading(false)
      setRefreshing(false)
      if (!result.success) {
        setError(result.error ?? t('archivos.error'))
        setData(null)
        return
      }
      setData(result.data ?? [])
    } catch (err) {
      setLoading(false)
      setRefreshing(false)
      setError(err instanceof Error ? err.message : t('archivos.error'))
      setData(null)
    }
  }, [t])

  // Al cambiar de pestaña: usar datos del servidor si existen, si no hacer fetch
  useEffect(() => {
    setFilterMonthYear('all')
    setSearchQuery('')
    setSortConfig(null)
    const serverRows = initialDataRef.current[activeTab]
    const serverErr = initialErrors?.[activeTab]
    if (Array.isArray(serverRows) && serverRows.length > 0) {
      setData(serverRows)
      setError(null)
      setLoading(false)
    } else if (serverErr) {
      setError(serverErr)
      setData(null)
      setLoading(false)
    } else {
      fetchTab(activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    pollingRef.current = setInterval(() => {
      setRefreshing(true)
      fetchTab(activeTab, true)
    }, POLLING_INTERVAL_MS)
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [activeTab, fetchTab])

  /* ── Derived ── */
  const columns = useMemo(() => (data && data.length > 0 ? Object.keys(data[0]) : []), [data])
  const dateInfo = useMemo(() => (data ? findDateColumn(data) : { col: null, mesCol: null, diaCol: null }), [data])
  const hasDateInfo = !!(dateInfo.col || (dateInfo.mesCol && dateInfo.diaCol))
  const monthYearOptions = useMemo(
    () => (data && hasDateInfo ? extractMonthYears(data, dateInfo) : []),
    [data, dateInfo, hasDateInfo]
  )

  const filteredData = useMemo(() => {
    if (!data) return []
    if (filterMonthYear === 'all' || !hasDateInfo) return data
    const [fy, fm] = filterMonthYear.split('-').map(Number)
    return data.filter((row) => {
      const dt = getDateFromRow(row, dateInfo.col, dateInfo.mesCol, dateInfo.diaCol)
      return dt !== null && dt.getFullYear() === fy && dt.getMonth() === fm
    })
  }, [data, filterMonthYear, dateInfo, hasDateInfo])

  /* Filtro de búsqueda en tiempo real */
  const searchFilteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return filteredData
    return filteredData.filter((row) =>
      Object.values(row).some((v) => v?.toLowerCase().includes(q))
    )
  }, [filteredData, searchQuery])

  /* Transformar MES+DÍA → FECHA única — DEBE ir ANTES del sort para que el forward-fill sea correcto */
  const { data: preDisplayData, columns: displayColumns, dateInfo: displayDateInfo } = useMemo(() => {
    const safeData = Array.isArray(searchFilteredData) ? searchFilteredData : []
    const safeDateInfo = dateInfo ?? { col: null, mesCol: null, diaCol: null }
    return transformMesDiaToFecha(safeData, safeDateInfo)
  }, [searchFilteredData, dateInfo])

  /* Ordenar sobre los datos ya transformados (FECHA ya existe y está correctamente calculada) */
  const displayData = useMemo(() => {
    if (!sortConfig) return preDisplayData
    const { field, dir } = sortConfig
    const dateCols = DATE_COL_KEYS(displayDateInfo)

    return [...preDisplayData].sort((a, b) => {
      // ── Ordenamiento por columna específica (clic en cabecera) ──
      if (field === 'col' && sortConfig.col) {
        const col = sortConfig.col
        const type = sortConfig.colType ?? detectColType(col, preDisplayData)
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

      // ── Ordenamiento general (dropdown Ordenar) ──
      if (field === 'date') {
        const da = getDateFromRow(a, displayDateInfo.col, displayDateInfo.mesCol, displayDateInfo.diaCol)
        const db = getDateFromRow(b, displayDateInfo.col, displayDateInfo.mesCol, displayDateInfo.diaCol)
        if (!da && !db) return 0
        if (!da) return 1
        if (!db) return -1
        const diff = da.getTime() - db.getTime()
        return dir === 'asc' ? diff : -diff
      }
      // alpha: columna principal del contenido (no fecha)
      const primaryCol =
        pickPrimaryColumn(displayColumns ?? [], dateCols, activeTab) ??
        (displayColumns ?? []).find((c) => !dateCols.includes(c)) ??
        (displayColumns ?? [])[0]
      const va = (a[primaryCol] ?? '').toLowerCase()
      const vb = (b[primaryCol] ?? '').toLowerCase()
      const cmp = va.localeCompare(vb, 'es')
      return dir === 'asc' ? cmp : -cmp
    })
  }, [preDisplayData, sortConfig, displayDateInfo, displayColumns, activeTab])

  const hasFilter = filterMonthYear !== 'all'
  const hasSearch = searchQuery.trim().length > 0
  const hasSort = sortConfig !== null
  const hasAnyFilter = hasFilter || hasSearch || hasSort
  const clearAllFilters = () => { setFilterMonthYear('all'); setSearchQuery(''); setSortConfig(null) }

  /** Ciclo al hacer clic en cabecera: sin orden → ASC → DESC → sin orden */
  const handleColSort = useCallback((col: string) => {
    const type = detectColType(col, preDisplayData)
    setSortConfig((prev) => {
      if (prev?.field === 'col' && prev.col === col) {
        if (prev.dir === 'asc') return { field: 'col', dir: 'desc', col, colType: type }
        return null
      }
      return { field: 'col', dir: 'asc', col, colType: type }
    })
  }, [preDisplayData])

  /* ── Render (CSS media queries para evitar hydration mismatch con useIsMobile) ── */
  return (
    <div className="space-y-4 sm:space-y-6 pb-6" suppressHydrationWarning>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${activeTabConfig.bg}`}>
            <activeTabConfig.icon className={`w-6 h-6 ${activeTabConfig.color}`} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" suppressHydrationWarning>{t('archivos.title')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
              Sincronizado desde Google Drive
              {refreshing && <span className="ml-2 inline-flex items-center gap-1 text-primary"><RefreshCw className="w-3 h-3 animate-spin" />actualizando…</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs — grid 2x2 en móvil, fila horizontal en desktop */}
      <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                min-h-[44px] px-3 py-2.5 sm:px-5 sm:py-2.5 rounded-xl
                font-semibold text-[11px] sm:text-sm leading-tight
                transition-all duration-200 touch-manipulation
                flex items-center justify-center sm:justify-start gap-2
                ${isActive
                  ? `${tab.activeBg} text-white shadow-lg`
                  : `${tab.bg} ${tab.color} hover:brightness-95`
                }
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-left wrap-break-word hyphens-auto">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Barra de búsqueda + Filtro fecha + Limpiar todo */}
      <div className="space-y-3">
        {/* SearchBar siempre visible */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('archivos.search.inTab').replace('{tab}', activeTabConfig.label)}
          accentColor={activeTabConfig.color}
          activeBg={activeTabConfig.activeBg}
          resultsCount={searchFilteredData.length}
          totalCount={filteredData.length}
        />

        {/* Fila: filtro fecha + ordenar + limpiar */}
        <div className="flex items-center gap-2 flex-wrap">
          {monthYearOptions.length > 0 && (
            <FilterDropdown
              monthYearOptions={monthYearOptions}
              filterMonthYear={filterMonthYear}
              setFilterMonthYear={setFilterMonthYear}
              activeTabConfig={activeTabConfig}
              hasFilter={hasFilter}
              tAllPeriods={t('archivos.filter.allPeriods')}
            />
          )}

          <SortDropdown
            sortConfig={sortConfig}
            setSortConfig={setSortConfig}
            activeTabConfig={activeTabConfig}
            hasDateInfo={hasDateInfo}
            tSortLabels={{
              recent: t('archivos.sort.recent'),
              oldest: t('archivos.sort.oldest'),
              alpha: t('archivos.sort.alpha'),
              alphaR: t('archivos.sort.alphaReverse'),
              noSort: t('archivos.sort.noSort'),
              sort: t('archivos.sort.sortLabel'),
            }}
          />

          <AnimatePresence>
            {hasAnyFilter && (
              <motion.button
                type="button"
                onClick={clearAllFilters}
                initial={{ opacity: 0, scale: 0.85, x: -6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85, x: -6 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold
                  text-destructive/80 hover:text-destructive
                  bg-destructive/5 hover:bg-destructive/10
                  border border-destructive/20 hover:border-destructive/30
                  transition-colors touch-manipulation"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t('archivos.clear')}</span>
                <span className="bg-destructive/15 text-destructive rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                  {(hasFilter ? 1 : 0) + (hasSearch ? 1 : 0) + (hasSort ? 1 : 0)}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* States */}
      {loading && !data && (
        <div className="glass rounded-2xl border border-border/50 p-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className={`w-10 h-10 ${activeTabConfig.color} animate-spin`} />
          <p className="text-muted-foreground text-sm">{t('archivos.loading')}</p>
        </div>
      )}

      {error && !data && (
        <div className="glass rounded-2xl border border-destructive/30 p-12 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-muted-foreground text-sm text-center max-w-xs">{error}</p>
        </div>
      )}

      {!loading && !error && data && (displayData?.length ?? 0) === 0 && (
        <div className="glass rounded-2xl border border-border/50 p-12 flex flex-col items-center justify-center gap-3">
          {hasSearch
            ? <Search className="w-10 h-10 text-muted-foreground/30" />
            : <Filter className="w-10 h-10 text-muted-foreground/40" />
          }
          <p className="text-muted-foreground text-sm text-center">
            {hasSearch
              ? <>{t('archivos.noResultsFor')} <strong className="text-foreground">"{searchQuery}"</strong></>
              : hasFilter ? 'No hay datos para este período.' : t('archivos.empty')
            }
          </p>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-primary underline hover:no-underline"
            >
              {t('archivos.clearFilters')}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {!loading && !error && (displayData?.length ?? 0) > 0 && (
          <motion.div
            key={`${activeTab}-${filterMonthYear}-${searchQuery}-${sortConfig?.field}-${sortConfig?.dir}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {/* ── Desktop: tabla (≥640px) — hidden en móvil vía CSS ── */}
            <div className="hidden sm:block glass rounded-2xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-left text-sm"
                    style={{ minWidth: `${Math.max((displayColumns?.length ?? 0) * 160, 500)}px` }}
                  >
                  <thead>
                    <tr className={`border-b border-border/60 ${activeTabConfig.bg}`}>
                      {(displayColumns ?? []).map((col) => {
                        const isColActive = sortConfig?.field === 'col' && sortConfig.col === col
                        return (
                          <th
                            key={col}
                            onClick={() => handleColSort(col)}
                            title={`Ordenar por ${prettyKey(col)}`}
                            className={`
                              px-4 py-3.5 font-bold text-xs uppercase tracking-wide whitespace-nowrap
                              select-none cursor-pointer group transition-all
                              ${isColActive
                                ? `${activeTabConfig.color} underline underline-offset-4 decoration-2`
                                : `${activeTabConfig.color} hover:opacity-75`
                              }
                            `}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{prettyKey(col)}</span>
                              <ColSortIcon col={col} sortConfig={sortConfig} />
                            </div>
                          </th>
                        )
                      })}
                      </tr>
                    </thead>
                  <tbody>
                    {(displayData ?? []).map((row, i) => (
                        <tr
                          key={`${activeTab}-row-${i}`}
                          tabIndex={0}
                          data-testid="archivo-table-row"
                          aria-label="Ver detalle del registro"
                          onClick={() => setDetailRow(row)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDetailRow(row) }}
                          className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                        >
                          {(displayColumns ?? []).map((col) => (
                            <td
                              key={col}
                              className="px-4 py-3 text-sm text-foreground/80 group-hover:text-foreground transition-colors"
                            >
                              <span className="line-clamp-2 max-w-[260px] block">
                                <HighlightText text={row[col] || '—'} query={searchQuery} />
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 border-t border-border/30 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {(displayData?.length ?? 0)} {(displayData?.length ?? 0) === 1 ? t('archivos.record') : t('archivos.records')}
                    {hasFilter && (() => { const opt = monthYearOptions.find((o) => `${o.year}-${o.month}` === filterMonthYear); return opt ? ` · ${opt.label}` : '' })()}
                    {hasSearch && ` · "${searchQuery}"`}
                  </span>
                  {hasAnyFilter && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-[10px] text-primary/70 hover:text-primary underline transition-colors"
                    >
                      {t('archivos.clear')}
                    </button>
                  )}
                </div>
              </div>

            {/* ── Mobile: cards (<640px) — sm:hidden en desktop ── */}
            <div className="sm:hidden glass rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
                {displayData.map((row, i) => (
                  <RowCard
                    key={`${activeTab}-card-${i}`}
                    row={row}
                    columns={displayColumns ?? []}
                    dateInfo={displayDateInfo ?? { col: null, mesCol: null, diaCol: null }}
                    tabId={activeTab}
                    accentBg={activeTabConfig.bg}
                    accentText={activeTabConfig.color}
                    onClick={() => setDetailRow(row)}
                    searchQuery={searchQuery}
                  />
                ))}
                <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {(displayData?.length ?? 0)} {(displayData?.length ?? 0) === 1 ? t('archivos.record') : t('archivos.records')}
                    {hasFilter && (() => { const opt = monthYearOptions.find((o) => `${o.year}-${o.month}` === filterMonthYear); return opt ? ` · ${opt.label}` : '' })()}
                    {hasSearch && ` · "${searchQuery}"`}
                  </span>
                  {hasAnyFilter && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-[10px] text-primary/70 hover:text-primary underline transition-colors"
                    >
                      {t('archivos.clear')}
                    </button>
                  )}
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <Modal
        isOpen={!!detailRow}
        onClose={() => setDetailRow(null)}
        title={activeTabConfig.label}
        size="md"
        keyPrefix="archivos-detail"
      >
        {detailRow && (
          <div className="space-y-0 divide-y divide-border/40">
            {Object.entries(detailRow).map(([key, value]) => (
              <div key={key} className="py-3 first:pt-0 last:pb-0">
                <div className={`text-[11px] font-bold uppercase tracking-wider ${activeTabConfig.color} mb-0.5`}>
                  {prettyKey(key)}
                </div>
                <div className="text-sm text-foreground wrap-break-word leading-relaxed">
                  {value || '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
