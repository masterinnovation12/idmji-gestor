'use client'

/**
 * ArchivosClient — Componente principal de la página Archivos.
 *
 * Refactorizado: lógica de datos extraída a archivos-data.ts,
 * sub-componentes en components/archivos/*.
 *
 * @author Antigravity AI – QA Refactoring
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Loader2, AlertCircle, RefreshCw,
  BookOpen, BookText, GraduationCap, UsersRound, HandHeart,
  Search, Filter, X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { SheetSourceId, SheetFetchMeta } from '@/lib/csv-sheets'
import type { ArchivosResult } from './actions'

/* ─── Data Helpers ─────────────────────────────────────── */
import {
  findDateColumn,
  extractMonthYears,
  transformMesDiaToFecha,
  sortData,
  getDateFromRow,
  formatCachedAtLabel,
  parseErrorDisplay,
  type SortConfig,
} from './archivos-data'

/* ─── Sub-components ──────────────────────────────────── */
import { SearchBar } from '@/components/archivos/SearchBar'
import { FilterDropdown } from '@/components/archivos/FilterDropdown'
import { SortDropdown } from '@/components/archivos/SortDropdown'
import { RowCard } from '@/components/archivos/RowCard'
import { DataTable } from '@/components/archivos/DataTable'
import { DetailModal } from '@/components/archivos/DetailModal'
import type { TabConfig } from '@/components/archivos/types'

/* ─── Constants ────────────────────────────────────────── */
const POLLING_INTERVAL_MS = 45_000
const POLLING_STALE_MS = 12_000

const TABS_BASE = [
  { id: 'ensenanzas' as SheetSourceId, labelKey: 'archivos.tab.ensenanzas', icon: BookOpen,       color: 'text-blue-600  dark:text-blue-400',  bg: 'bg-blue-50  dark:bg-blue-950/40',  activeBg: 'bg-blue-600  dark:bg-blue-500'  },
  { id: 'estudios'   as SheetSourceId, labelKey: 'archivos.tab.estudios',   icon: BookText,       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', activeBg: 'bg-emerald-600 dark:bg-emerald-500' },
  { id: 'instituto'  as SheetSourceId, labelKey: 'archivos.tab.instituto',  icon: GraduationCap, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40', activeBg: 'bg-violet-600 dark:bg-violet-500' },
  { id: 'pastorado'  as SheetSourceId, labelKey: 'archivos.tab.pastorado',  icon: UsersRound,    color: 'text-amber-600  dark:text-amber-400',  bg: 'bg-amber-50  dark:bg-amber-950/40',  activeBg: 'bg-amber-600  dark:bg-amber-500'  },
  { id: 'profecia'   as SheetSourceId, labelKey: 'archivos.tab.profecia',   icon: HandHeart,     color: 'text-rose-600   dark:text-rose-400',   bg: 'bg-rose-50   dark:bg-rose-950/40',   activeBg: 'bg-rose-600   dark:bg-rose-500'   },
]

/* ─── Main Component ──────────────────────────────────── */

type ArchivosClientProps = {
  initialData?: Partial<Record<SheetSourceId, Record<string, string>[]>>
  initialMeta?: Partial<Record<SheetSourceId, SheetFetchMeta>>
  initialErrors?: Partial<Record<SheetSourceId, string>>
}

export default function ArchivosClient({ initialData = {}, initialMeta, initialErrors }: ArchivosClientProps) {
  const { t, language } = useI18n()

  const TABS: TabConfig[] = TABS_BASE.map((tab) => ({
    ...tab,
    label: t(tab.labelKey as Parameters<typeof t>[0]),
  }))

  /* ── State ── */
  const [activeTab, setActiveTab] = useState<SheetSourceId>('ensenanzas')
  const initialRows = initialData['ensenanzas']
  const initialErr = initialErrors?.['ensenanzas']
  const [data, setData] = useState<Record<string, string>[] | null>(
    Array.isArray(initialRows) && initialRows.length > 0 ? initialRows : null,
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
  const initialMetaRef = useRef(initialMeta)
  const [staleInfo, setStaleInfo] = useState<{ stale: boolean; cachedAt?: string; lastErrorCode?: number } | null>(() => {
    const m = initialMeta?.ensenanzas
    return m?.stale ? { stale: true, cachedAt: m.cachedAt, lastErrorCode: m.lastErrorCode } : null
  })

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!

  /* ── Fetch via API route (polling / tabs sin datos) ── */
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
        setStaleInfo(null)
        return
      }
      setStaleInfo(result.stale ? { stale: true, cachedAt: result.cachedAt, lastErrorCode: result.lastErrorCode } : null)
      setData(result.data ?? [])
    } catch (err) {
      setLoading(false)
      setRefreshing(false)
      setError(err instanceof Error ? err.message : t('archivos.error'))
      setData(null)
    }
  }, [t])

  /* ── Tab change: prefer SSR data, fallback to fetch ── */
  useEffect(() => {
    setFilterMonthYear('all')
    setSearchQuery('')
    setSortConfig(null)
    const serverRows = initialDataRef.current[activeTab]
    const serverErr = initialErrors?.[activeTab]
    const serverMeta = initialMetaRef.current?.[activeTab]
    if (Array.isArray(serverRows) && serverRows.length > 0) {
      setData(serverRows)
      setError(null)
      setStaleInfo(serverMeta?.stale ? { stale: true, cachedAt: serverMeta.cachedAt, lastErrorCode: serverMeta.lastErrorCode } : null)
      setLoading(false)
    } else if (serverErr) {
      setError(serverErr)
      setData(null)
      setStaleInfo(null)
      setLoading(false)
    } else {
      fetchTab(activeTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  /* ── Smart polling: pause when tab is hidden ── */
  const pollIntervalMs = staleInfo?.stale ? POLLING_STALE_MS : POLLING_INTERVAL_MS

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId)
      intervalId = setInterval(() => {
        setRefreshing(true)
        fetchTab(activeTab, true)
      }, pollIntervalMs)
    }

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Refresh immediately when coming back, then resume polling
        setRefreshing(true)
        fetchTab(activeTab, true)
        startPolling()
      } else {
        stopPolling()
      }
    }

    // Start polling only if visible
    if (document.visibilityState === 'visible') {
      startPolling()
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [activeTab, fetchTab, pollIntervalMs])

  /* ── Derived data ── */
  const columns = useMemo(() => (data && data.length > 0 ? Object.keys(data[0]) : []), [data])
  const dateInfo = useMemo(() => (data ? findDateColumn(data) : { col: null, mesCol: null, diaCol: null }), [data])
  const hasDateInfo = !!(dateInfo.col || (dateInfo.mesCol && dateInfo.diaCol))
  const monthYearOptions = useMemo(
    () => (data && hasDateInfo ? extractMonthYears(data, dateInfo) : []),
    [data, dateInfo, hasDateInfo],
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

  const searchFilteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return filteredData
    return filteredData.filter((row) =>
      Object.values(row).some((v) => v?.toLowerCase().includes(q)),
    )
  }, [filteredData, searchQuery])

  // Transform MES+DÍA → FECHA before sorting
  const { data: preDisplayData, columns: displayColumns, dateInfo: displayDateInfo } = useMemo(() => {
    const safeData = Array.isArray(searchFilteredData) ? searchFilteredData : []
    const safeDateInfo = dateInfo ?? { col: null, mesCol: null, diaCol: null }
    return transformMesDiaToFecha(safeData, safeDateInfo)
  }, [searchFilteredData, dateInfo])

  // Sort on transformed data
  const displayData = useMemo(
    () => sortData(preDisplayData, sortConfig, displayDateInfo, displayColumns ?? [], activeTab),
    [preDisplayData, sortConfig, displayDateInfo, displayColumns, activeTab],
  )

  const hasFilter = filterMonthYear !== 'all'
  const hasSearch = searchQuery.trim().length > 0
  const hasSort = sortConfig !== null
  const hasAnyFilter = hasFilter || hasSearch || hasSort
  const clearAllFilters = () => { setFilterMonthYear('all'); setSearchQuery(''); setSortConfig(null) }

  const filterLabel = hasFilter
    ? monthYearOptions.find((o) => `${o.year}-${o.month}` === filterMonthYear)?.label ?? ''
    : ''

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
              {staleInfo?.stale ? t('archivos.syncStaleHint' as Parameters<typeof t>[0]) : t('archivos.syncSubtitle' as Parameters<typeof t>[0])}
              {refreshing && <span className="ml-2 inline-flex items-center gap-1 text-primary"><RefreshCw className="w-3 h-3 animate-spin" />actualizando…</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Stale banner */}
      {staleInfo?.stale && (
        <div
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50 dark:border-amber-400/35 dark:bg-amber-500/15"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {t('archivos.staleBanner' as Parameters<typeof t>[0])}
                {staleInfo.lastErrorCode && (
                  <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
                    HTTP {staleInfo.lastErrorCode}
                  </span>
                )}
              </p>
              <p className="text-xs opacity-95 leading-relaxed">
                {(t('archivos.staleDetail' as Parameters<typeof t>[0]) as string).replace(
                  '{date}',
                  formatCachedAtLabel(staleInfo.cachedAt, language),
                )}
              </p>
            </div>
            <button
              onClick={() => { setRefreshing(true); fetchTab(activeTab) }}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Sincronizar ahora
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
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

      {/* Search + Filters */}
      <div className="space-y-3">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('archivos.search.inTab').replace('{tab}', activeTabConfig.label)}
          accentColor={activeTabConfig.color}
          activeBg={activeTabConfig.activeBg}
          resultsCount={searchFilteredData.length}
          totalCount={filteredData.length}
        />

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

      {/* Loading state */}
      {loading && !data && (
        <div className="glass rounded-2xl border border-border/50 p-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className={`w-10 h-10 ${activeTabConfig.color} animate-spin`} />
          <p className="text-muted-foreground text-sm">{t('archivos.loading')}</p>
        </div>
      )}

      {/* Error state with Retry button */}
      {error && !data && (() => {
        const { type, hint } = parseErrorDisplay(error)
        return (
          <div
            className="glass rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-8 sm:p-10 flex flex-col items-center justify-center gap-4 max-w-md"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-10 h-10 shrink-0" />
              <span className="font-bold text-base">{type}</span>
            </div>
            <p className="text-muted-foreground text-sm text-center wrap-break-word">
              {error}
            </p>
            {hint && (
              <p className="text-xs text-muted-foreground text-center bg-muted/50 rounded-lg px-4 py-3 border border-border/50">
                {hint}
              </p>
            )}
            <button
              type="button"
              onClick={() => fetchTab(activeTab)}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors touch-manipulation shadow-sm"
            >
              <RefreshCw className="w-4 h-4 inline-block mr-2" />
              Reintentar
            </button>
          </div>
        )
      })()}

      {/* Empty state */}
      {!loading && !error && data && (displayData?.length ?? 0) === 0 && (
        <div className="glass rounded-2xl border border-border/50 p-12 flex flex-col items-center justify-center gap-3">
          {hasSearch
            ? <Search className="w-10 h-10 text-muted-foreground/30" />
            : <Filter className="w-10 h-10 text-muted-foreground/40" />
          }
          <p className="text-muted-foreground text-sm text-center">
            {hasSearch
              ? <>{t('archivos.noResultsFor')} <strong className="text-foreground">&quot;{searchQuery}&quot;</strong></>
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

      {/* Content (table + cards) */}
      <AnimatePresence mode="wait">
        {!loading && !error && (displayData?.length ?? 0) > 0 && (
          <motion.div
            key={`${activeTab}-content`}
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }} // Deceleration curve
          >
            {/* Desktop table */}
            <DataTable
              data={displayData}
              columns={displayColumns ?? []}
              activeTab={activeTab}
              activeTabConfig={activeTabConfig}
              sortConfig={sortConfig}
              setSortConfig={setSortConfig}
              searchQuery={searchQuery}
              onRowClick={setDetailRow}
              preDisplayData={preDisplayData}
              hasFilter={hasFilter}
              hasSearch={hasSearch}
              hasAnyFilter={hasAnyFilter}
              filterLabel={filterLabel}
              clearAllFilters={clearAllFilters}
              tRecords={t('archivos.records')}
              tRecord={t('archivos.record')}
              tClear={t('archivos.clear')}
            />

            {/* Mobile cards */}
            <div className="sm:hidden glass rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
              {displayData.map((row, i) => {
                const rowKey = row['id'] || `${activeTab}-${row['FECHA'] || 'card'}-${i}`
                return (
                  <RowCard
                    key={rowKey}
                    row={row}
                    columns={displayColumns ?? []}
                    dateInfo={displayDateInfo ?? { col: null, mesCol: null, diaCol: null }}
                    tabId={activeTab}
                    accentBg={activeTabConfig.bg}
                    accentText={activeTabConfig.color}
                    onClick={() => setDetailRow(row)}
                    searchQuery={searchQuery}
                  />
                )
              })}
              {/* Mobile footer */}
              <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {displayData.length} {displayData.length === 1 ? t('archivos.record') : t('archivos.records')}
                  {hasFilter && filterLabel && ` · ${filterLabel}`}
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
      <DetailModal
        row={detailRow}
        onClose={() => setDetailRow(null)}
        activeTabConfig={activeTabConfig}
      />
    </div>
  )
}
