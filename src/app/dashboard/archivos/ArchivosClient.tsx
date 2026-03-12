'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { getSheetData, type ArchivosResult } from './actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Modal } from '@/components/ui/Modal'
import {
  Loader2, AlertCircle, ChevronRight,
  BookOpen, GraduationCap, School, Church, Filter, X, Calendar,
  RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SheetSourceId } from '@/lib/csv-sheets'

/* ─── Constants ─────────────────────────────────────────── */
const POLLING_INTERVAL_MS = 45_000

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

type TabConfig = {
  id: SheetSourceId
  label: string
  icon: React.ElementType
  color: string
  bg: string
  activeBg: string
}

const TABS: TabConfig[] = [
  { id: 'ensenanzas',  label: 'Enseñanzas',     icon: BookOpen,       color: 'text-blue-600  dark:text-blue-400',  bg: 'bg-blue-50  dark:bg-blue-950/40',  activeBg: 'bg-blue-600  dark:bg-blue-500'  },
  { id: 'estudios',   label: 'Estudios Bíblicos', icon: Church,       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', activeBg: 'bg-emerald-600 dark:bg-emerald-500' },
  { id: 'instituto',  label: 'Instituto Bíblico', icon: GraduationCap, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40', activeBg: 'bg-violet-600 dark:bg-violet-500' },
  { id: 'pastorado',  label: 'Pastorado',        icon: School,        color: 'text-amber-600  dark:text-amber-400',  bg: 'bg-amber-50  dark:bg-amber-950/40',  activeBg: 'bg-amber-600  dark:bg-amber-500'  },
]

/* ─── Helpers ────────────────────────────────────────────── */

const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

/** Try to parse DD/MM/YYYY or D/M/YYYY → Date. Returns null if not a date. */
function parseDate(val: string): Date | null {
  if (!val) return null
  const m = DATE_RE.exec(val.trim())
  if (!m) return null
  const d = Number.parseInt(m[1], 10)
  const mo = Number.parseInt(m[2], 10) - 1
  const y = Number.parseInt(m[3], 10)
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null
  return new Date(y, mo, d)
}

/** Find which key in the first row looks most like a date column */
function findDateColumn(data: Record<string, string>[]): string | null {
  if (data.length === 0) return null
  const keys = Object.keys(data[0])
  for (const key of keys) {
    const hits = data.slice(0, 10).filter((r) => parseDate(r[key]) !== null).length
    if (hits >= 2) return key
  }
  return null
}

/** Extract sorted unique month+year options from a date column */
function extractMonthYears(data: Record<string, string>[], dateCol: string) {
  const seen = new Map<string, { year: number; month: number; label: string }>()
  for (const row of data) {
    const dt = parseDate(row[dateCol])
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
    .replaceAll(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}

/* ─── Row-card (mobile) ──────────────────────────────────── */
type RowCardProps = Readonly<{
  row: Record<string, string>
  columns: readonly string[]
  dateCol: string | null
  accentBg: string
  accentText: string
  onClick: () => void
}>

function RowCard({ row, columns, dateCol, accentBg, accentText, onClick }: RowCardProps) {
  const dateVal = dateCol ? row[dateCol] : null
  const primaryCol = columns.find((c) => c !== dateCol) ?? columns[0]
  const restCols = columns.filter((c) => c !== dateCol && c !== primaryCol)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors group touch-manipulation"
    >
      <div className="flex items-start gap-3">
        {/* Date badge */}
        {dateVal && (
          <div className={`shrink-0 rounded-xl ${accentBg} px-2.5 py-1.5 text-center min-w-[52px]`}>
            <div className={`text-xs font-bold ${accentText} leading-tight`}>
              {dateVal.split('/').slice(0, 2).join('/')}
            </div>
            <div className={`text-[10px] ${accentText} opacity-70`}>
              {dateVal.split('/')[2]}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {primaryCol && (
            <div className="font-semibold text-sm text-foreground line-clamp-2 mb-1">
              {row[primaryCol] || '—'}
            </div>
          )}
          {restCols.slice(0, 3).map((col) => (
            row[col] ? (
              <div key={col} className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{prettyKey(col)}:</span>{' '}
                {row[col]}
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
export default function ArchivosClient() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<SheetSourceId>('ensenanzas')
  const [data, setData] = useState<Record<string, string>[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailRow, setDetailRow] = useState<Record<string, string> | null>(null)
  const [filterMonthYear, setFilterMonthYear] = useState<string>('all')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!

  /* ── Fetch ── */
  const fetchTab = useCallback(async (sourceId: SheetSourceId, silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    const result: ArchivosResult = await getSheetData(sourceId)
    setLoading(false)
    setRefreshing(false)
    if (!result.success) {
      setError(result.error ?? t('archivos.error'))
      if (!silent) setData(null)
      return
    }
    setData(result.data ?? [])
  }, [t])

  useEffect(() => {
    setFilterMonthYear('all')
    fetchTab(activeTab)
  }, [activeTab, fetchTab])

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
  const dateCol = useMemo(() => (data ? findDateColumn(data) : null), [data])
  const monthYearOptions = useMemo(
    () => (data && dateCol ? extractMonthYears(data, dateCol) : []),
    [data, dateCol]
  )

  const filteredData = useMemo(() => {
    if (!data) return []
    if (filterMonthYear === 'all' || !dateCol) return data
    const [fy, fm] = filterMonthYear.split('-').map(Number)
    return data.filter((row) => {
      const dt = parseDate(row[dateCol])
      return dt !== null && dt.getFullYear() === fy && dt.getMonth() === fm
    })
  }, [data, filterMonthYear, dateCol])

  const hasFilter = filterMonthYear !== 'all'

  /* ── Render ── */
  return (
    <div className="space-y-4 sm:space-y-6 pb-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${activeTabConfig.bg}`}>
            <activeTabConfig.icon className={`w-6 h-6 ${activeTabConfig.color}`} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('archivos.title')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sincronizado desde Google Drive
              {refreshing && <span className="ml-2 inline-flex items-center gap-1 text-primary"><RefreshCw className="w-3 h-3 animate-spin" />actualizando…</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs — scroll horizontal en móvil */}
      <div className="overflow-x-auto no-scrollbar -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0">
        <div className="flex gap-2 min-w-max pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  min-h-[44px] px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl
                  font-semibold text-xs sm:text-sm whitespace-nowrap
                  transition-all duration-200 touch-manipulation
                  flex items-center gap-2
                  ${isActive
                    ? `${tab.activeBg} text-white shadow-lg scale-[1.02]`
                    : `${tab.bg} ${tab.color} hover:brightness-95`
                  }
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter bar — month/year */}
      {monthYearOptions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>Filtrar:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterMonthYear('all')}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[32px] touch-manipulation transition-all',
                hasFilter
                  ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                  : `${activeTabConfig.activeBg} text-white shadow`,
              ].join(' ')}
            >
              Todos
            </button>
            {monthYearOptions.map((opt) => {
              const key = `${opt.year}-${opt.month}`
              const isActive = filterMonthYear === key
              return (
                <button
                  key={key}
                  onClick={() => setFilterMonthYear(isActive ? 'all' : key)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[32px] touch-manipulation transition-all
                    ${isActive
                      ? `${activeTabConfig.activeBg} text-white shadow`
                      : `${activeTabConfig.bg} ${activeTabConfig.color} hover:brightness-95`
                    }
                  `}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {hasFilter && (
            <button
              onClick={() => setFilterMonthYear('all')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>
      )}

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

      {!loading && !error && data && filteredData.length === 0 && (
        <div className="glass rounded-2xl border border-border/50 p-12 flex flex-col items-center justify-center gap-3">
          <Filter className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {hasFilter ? 'No hay datos para este período.' : t('archivos.empty')}
          </p>
          {hasFilter && (
            <button onClick={() => setFilterMonthYear('all')} className="text-xs text-primary underline">
              Ver todos
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {!loading && !error && filteredData.length > 0 && (
          <motion.div
            key={`${activeTab}-${filterMonthYear}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {/* ── Desktop table (sm+) ── */}
            <div className="hidden sm:block glass rounded-2xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table
                  className="w-full text-left text-sm"
                  style={{ minWidth: `${Math.max(columns.length * 160, 500)}px` }}
                >
                  <thead>
                    <tr className={`border-b border-border/60 ${activeTabConfig.bg}`}>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className={`px-4 py-3.5 font-bold text-xs uppercase tracking-wide whitespace-nowrap ${activeTabConfig.color}`}
                        >
                          {prettyKey(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, i) => (
                      <tr
                        key={`${activeTab}-row-${i}`}
                        tabIndex={0}
                        onClick={() => setDetailRow(row)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDetailRow(row) }}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                      >
                        {columns.map((col) => (
                          <td
                            key={col}
                            className="px-4 py-3 text-sm text-foreground/80 group-hover:text-foreground transition-colors"
                          >
                            <span className="line-clamp-2 max-w-[260px] block">{row[col] || '—'}</span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-border/30">
                <span className="text-xs text-muted-foreground">
                  {filteredData.length} {filteredData.length === 1 ? 'registro' : 'registros'}
                  {hasFilter && (() => { const opt = monthYearOptions.find((o) => `${o.year}-${o.month}` === filterMonthYear); return opt ? ` · ${opt.label}` : '' })()}
                </span>
              </div>
            </div>

            {/* ── Mobile cards (< sm) ── */}
            <div className="sm:hidden glass rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
              {filteredData.map((row, i) => (
                <RowCard
                  key={`${activeTab}-card-${i}`}
                  row={row}
                  columns={columns}
                  dateCol={dateCol}
                  accentBg={activeTabConfig.bg}
                  accentText={activeTabConfig.color}
                  onClick={() => setDetailRow(row)}
                />
              ))}
              <div className="px-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  {filteredData.length} {filteredData.length === 1 ? 'registro' : 'registros'}
                </span>
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
