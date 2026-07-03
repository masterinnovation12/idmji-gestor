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
  Loader2, AlertCircle, RefreshCw, Zap,
  BookOpen, BookText, GraduationCap, UsersRound, HandHeart,
  Search, Filter, X, CheckCircle2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
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

// Colores de identidad por pestaña, SIEMPRE claros: se pintan dentro de cards
// liquid (fondo crema/blanco fijo), por lo que no deben variar con el tema.
const TABS_BASE = [
  { id: 'ensenanzas' as SheetSourceId, labelKey: 'archivos.tab.ensenanzas', icon: BookOpen,      color: 'text-blue-600',    bg: 'bg-blue-50',    activeBg: 'bg-blue-600'    },
  { id: 'estudios'   as SheetSourceId, labelKey: 'archivos.tab.estudios',   icon: BookText,      color: 'text-emerald-600', bg: 'bg-emerald-50', activeBg: 'bg-emerald-600' },
  { id: 'instituto'  as SheetSourceId, labelKey: 'archivos.tab.instituto',  icon: GraduationCap, color: 'text-violet-600',  bg: 'bg-violet-50',  activeBg: 'bg-violet-600'  },
  { id: 'pastorado'  as SheetSourceId, labelKey: 'archivos.tab.pastorado',  icon: UsersRound,    color: 'text-amber-600',   bg: 'bg-amber-50',   activeBg: 'bg-amber-600'   },
  { id: 'profecia'   as SheetSourceId, labelKey: 'archivos.tab.profecia',   icon: HandHeart,     color: 'text-rose-600',    bg: 'bg-rose-50',    activeBg: 'bg-rose-600'    },
]

/* ─── Main Component ──────────────────────────────────── */

type ArchivosClientProps = {
  initialData?: Partial<Record<SheetSourceId, Record<string, string>[]>>
  initialMeta?: Partial<Record<SheetSourceId, SheetFetchMeta>>
  initialErrors?: Partial<Record<SheetSourceId, string>>
}

function ForcingLabel({ forceLoading, forceAttempt }: Readonly<{ forceLoading: boolean; forceAttempt: number }>) {
  const { t } = useI18n()
  if (!forceLoading) return <>{t('archivos.updating')}</>
  if (forceAttempt > 1) return <>{t('archivos.forcingAttempt').replace('{n}', String(forceAttempt))}</>
  return <>{t('archivos.forcing')}</>
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
  const initialDataRef = useRef(initialData)
  const initialMetaRef = useRef(initialMeta)
  const [staleInfo, setStaleInfo] = useState<{ stale: boolean; cachedAt?: string; lastErrorCode?: number } | null>(() => {
    const m = initialMeta?.ensenanzas
    return m?.stale ? { stale: true, cachedAt: m.cachedAt, lastErrorCode: m.lastErrorCode } : null
  })
  const [forceLoading, setForceLoading] = useState(false)
  const [forceAttempt, setForceAttempt] = useState(0)

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

  /* ── Force-refresh: limpia caché local y reintenta agresivamente contra Google ── */
  const forceRefresh = useCallback(async (sourceId: SheetSourceId) => {
    if (forceLoading) return
    setForceLoading(true)
    setForceAttempt(1)

    // Animamos el contador de intentos mientras el servidor trabaja
    const ticker = setInterval(() => {
      setForceAttempt((n) => Math.min(n + 1, 12))
    }, 2800)

    try {
      const res = await fetch(
        `/api/archivos?source=${encodeURIComponent(sourceId)}&force=true`,
        { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } }
      )
      const result: ArchivosResult & { forceError?: boolean } = await res.json()
      if (result.success && result.data) {
        setData(result.data)
        setStaleInfo(null)
        setError(null)
        toast.success(t('archivos.toast.updated' as Parameters<typeof t>[0]), {
          description: (t('archivos.toast.updatedDesc' as Parameters<typeof t>[0]) as string).replace('{n}', String(result.data.length)),
        })
      } else {
        const code = result.lastErrorCode
        toast.error(t('archivos.toast.stillDown' as Parameters<typeof t>[0]), {
          description: code
            ? (t('archivos.toast.stillDownDescCode' as Parameters<typeof t>[0]) as string).replace('{code}', String(code))
            : t('archivos.toast.stillDownDesc' as Parameters<typeof t>[0]),
          duration: 8000,
        })
      }
    } catch {
      toast.error(t('archivos.toast.connectionError' as Parameters<typeof t>[0]))
    } finally {
      clearInterval(ticker)
      setForceLoading(false)
      setForceAttempt(0)
    }
  }, [forceLoading, t])

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
    <div className="ofrenda-liquid-scope space-y-4 sm:space-y-6 pb-6">

      {/* Header hero liquid (marino + dorado) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] via-[#283593] to-[#151f5c] p-4 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#b8964a]/25 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute inset-x-[8%] top-0 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#b68f2f,#e3cc92 42%,#d4b86a 58%,#b68f2f)', boxShadow: '0 0 12px rgba(227,204,146,0.6)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-white border border-[rgba(227,204,146,0.5)] shadow-sm`}>
              <activeTabConfig.icon className={`w-6 h-6 ${activeTabConfig.color}`} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">{t('archivos.title')}</h1>
              <p className="text-xs text-white/70 mt-0.5">
                {staleInfo?.stale
                  ? t('archivos.syncStaleHint' as Parameters<typeof t>[0])
                  : t('archivos.syncSubtitle' as Parameters<typeof t>[0])}
                {(refreshing || forceLoading) && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[#e3cc92]">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <ForcingLabel forceLoading={forceLoading} forceAttempt={forceAttempt} />
                  </span>
                )}
              </p>
            </div>
          </div>
          {/* Botón fuerza siempre visible cuando hay datos stale */}
          {staleInfo?.stale && (
            <button
              onClick={() => forceRefresh(activeTab)}
              disabled={forceLoading || refreshing}
              title={t('archivos.refreshTitle')}
              className={`
                hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                transition-all touch-manipulation shadow-sm
                ${forceLoading
                  ? 'bg-white/10 text-[#e3cc92] border border-[rgba(227,204,146,0.4)] cursor-wait'
                  : 'border-2 border-[#b8964a] bg-white text-[#1f2e85] hover:bg-[#f8f3e8]'}
                disabled:opacity-60
              `}
            >
              {forceLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{t('archivos.trying')} {forceAttempt > 1 ? `(${forceAttempt})` : ''}</>
              ) : (
                <><Zap className="w-4 h-4" />{t('archivos.getNewData')}</>
              )}
            </button>
          )}
          {!staleInfo?.stale && data && data.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span suppressHydrationWarning>{t('archivos.liveData' as Parameters<typeof t>[0])}</span>
            </span>
          )}
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
            {/* Botones: reintento normal + fuerza */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setRefreshing(true); fetchTab(activeTab) }}
                disabled={refreshing || forceLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing && !forceLoading ? 'animate-spin' : ''}`} />
                <span suppressHydrationWarning>{t('archivos.sync' as Parameters<typeof t>[0])}</span>
              </button>
              <button
                onClick={() => forceRefresh(activeTab)}
                disabled={forceLoading || refreshing}
                title={t('archivos.retryTitle')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/25 hover:bg-amber-600/40 border border-amber-600/40 text-xs font-bold transition-all disabled:opacity-60"
              >
                {forceLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span suppressHydrationWarning>{t('archivos.trying')} {forceAttempt > 1 ? `(${forceAttempt})` : ''}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span suppressHydrationWarning>{t('archivos.forceUpdate' as Parameters<typeof t>[0])}</span>
                  </>
                )}
              </button>
            </div>
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
                  ? `${tab.activeBg} text-white shadow-lg border-[1.5px] border-[#b8964a]/70`
                  : `bg-white ${tab.color} border-[1.5px] border-[rgba(184,150,74,0.32)] hover:bg-[#f8f3e8] hover:border-[#b8964a]`
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
              dateWord: t('common.date').toLowerCase(),
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
        <div className="ofrenda-liquid-card rounded-2xl p-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className={`w-10 h-10 ${activeTabConfig.color} animate-spin`} />
          <p className="text-slate-500 text-sm">{t('archivos.loading')}</p>
        </div>
      )}

      {/* Error state with Retry button */}
      {error && !data && (() => {
        const { type, hint } = parseErrorDisplay(error)
        return (
          <div
            className="ofrenda-liquid-card rounded-2xl !border-2 !border-red-400/50 p-8 sm:p-10 flex flex-col items-center justify-center gap-4 max-w-md"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-10 h-10 shrink-0" />
              <span className="font-bold text-base">{type}</span>
            </div>
            <p className="text-slate-500 text-sm text-center wrap-break-word">
              {error}
            </p>
            {hint && (
              <p className="text-xs text-slate-500 text-center bg-white/70 rounded-lg px-4 py-3 border border-[rgba(184,150,74,0.25)]">
                {hint}
              </p>
            )}
            <button
              type="button"
              onClick={() => fetchTab(activeTab)}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white shadow-[0_4px_16px_rgba(31,46,133,0.32)] hover:shadow-[0_6px_22px_rgba(31,46,133,0.42)] transition-shadow touch-manipulation"
            >
              <RefreshCw className="w-4 h-4 inline-block mr-2" />
              <span suppressHydrationWarning>{t('archivos.retry' as Parameters<typeof t>[0])}</span>
            </button>
          </div>
        )
      })()}

      {/* Empty state */}
      {!loading && !error && data && (displayData?.length ?? 0) === 0 && (
        <div className="ofrenda-liquid-card rounded-2xl !border-2 !border-dashed p-12 flex flex-col items-center justify-center gap-3">
          {hasSearch
            ? <Search className="w-10 h-10 text-slate-300" />
            : <Filter className="w-10 h-10 text-slate-300" />
          }
          <p className="text-slate-500 text-sm text-center">
            {hasSearch
              ? <>{t('archivos.noResultsFor')} <strong className="text-slate-800">&quot;{searchQuery}&quot;</strong></>
              : hasFilter ? <span suppressHydrationWarning>{t('archivos.noDataPeriod' as Parameters<typeof t>[0])}</span> : t('archivos.empty')
            }
          </p>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-[#1f2e85] underline hover:no-underline"
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
            <div className="sm:hidden ofrenda-liquid-card rounded-2xl overflow-hidden divide-y divide-[rgba(184,150,74,0.18)]">
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
                <span className="text-xs text-slate-500">
                  {displayData.length} {displayData.length === 1 ? t('archivos.record') : t('archivos.records')}
                  {hasFilter && filterLabel && ` · ${filterLabel}`}
                  {hasSearch && ` · "${searchQuery}"`}
                </span>
                {hasAnyFilter && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-[10px] text-[#1f2e85]/70 hover:text-[#1f2e85] underline transition-colors"
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
