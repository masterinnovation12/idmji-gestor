'use client'

import { useCallback } from 'react'
import { ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { prettyKey, detectColType } from '@/app/dashboard/archivos/archivos-data'
import type { SortConfig } from '@/app/dashboard/archivos/archivos-data'
import { HighlightText } from './HighlightText'
import type { TabConfig } from './types'

/* ─── ColSortIcon ──────────────────────────────────────── */
function ColSortIcon({ col, sortConfig }: { col: string; sortConfig: SortConfig | null }) {
  const isActive = sortConfig?.field === 'col' && sortConfig.col === col
  if (!isActive) {
    return <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" />
  }
  return sortConfig?.dir === 'asc'
    ? <ArrowUp className="w-4 h-4 shrink-0 opacity-100 drop-shadow-sm" />
    : <ArrowDown className="w-4 h-4 shrink-0 opacity-100 drop-shadow-sm" />
}

/* ─── DataTable ────────────────────────────────────────── */
type DataTableProps = Readonly<{
  data: Record<string, string>[]
  columns: string[]
  activeTab: string
  activeTabConfig: TabConfig
  sortConfig: SortConfig | null
  setSortConfig: (v: SortConfig | null) => void
  searchQuery: string
  onRowClick: (row: Record<string, string>) => void
  /** Pre-display data for column type detection */
  preDisplayData: Record<string, string>[]
  /* Filter summary info */
  hasFilter: boolean
  hasSearch: boolean
  hasAnyFilter: boolean
  filterLabel: string
  clearAllFilters: () => void
  tRecords: string
  tRecord: string
  tClear: string
}>

/**
 * Tabla de datos desktop con cabeceras ordenables (clic → ASC → DESC → sin orden).
 */
export function DataTable({
  data,
  columns,
  activeTab,
  activeTabConfig,
  sortConfig,
  setSortConfig,
  searchQuery,
  onRowClick,
  preDisplayData,
  hasFilter,
  hasSearch,
  hasAnyFilter,
  filterLabel,
  clearAllFilters,
  tRecords,
  tRecord,
  tClear,
}: DataTableProps) {

  /** Ciclo al hacer clic en cabecera: sin orden → ASC → DESC → sin orden */
  const handleColSort = useCallback((col: string) => {
    const type = detectColType(col, preDisplayData)
    setSortConfig(
      sortConfig?.field === 'col' && sortConfig.col === col
        ? sortConfig.dir === 'asc'
          ? { field: 'col', dir: 'desc', col, colType: type }
          : null
        : { field: 'col', dir: 'asc', col, colType: type },
    )
  }, [preDisplayData, sortConfig, setSortConfig])

  return (
    <div className="hidden sm:block glass rounded-2xl border border-border/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-sm"
          style={{ minWidth: `${Math.max(columns.length * 160, 500)}px` }}
        >
          <thead>
            <tr className={`border-b border-border/60 ${activeTabConfig.bg}`}>
              {columns.map((col) => {
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
            {data.map((row, i) => {
              // Use a stable key from column values when possible
              const rowKey = row['id'] || `${activeTab}-${row['FECHA'] || 'row'}-${i}`
              return (
                <tr
                  key={rowKey}
                  tabIndex={0}
                  data-testid="archivo-table-row"
                  aria-label="Ver detalle del registro"
                  onClick={() => onRowClick(row)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRowClick(row) }}
                  className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                >
                  {columns.map((col) => (
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
              )
            })}
          </tbody>
        </table>
      </div>
      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border/30 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {data.length} {data.length === 1 ? tRecord : tRecords}
          {hasFilter && filterLabel && ` · ${filterLabel}`}
          {hasSearch && ` · "${searchQuery}"`}
        </span>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[10px] text-primary/70 hover:text-primary underline transition-colors"
          >
            {tClear}
          </button>
        )}
      </div>
    </div>
  )
}
