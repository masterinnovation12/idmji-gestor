'use client'

import { createPortal } from 'react-dom'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react'
import { usePortalDropdown } from './usePortalDropdown'
import { prettyKey } from '@/app/dashboard/archivos/archivos-data'
import type { SortConfig } from '@/app/dashboard/archivos/archivos-data'
import type { TabConfig } from './types'

type SortField = 'date' | 'alpha' | 'col'
type SortDir = 'asc' | 'desc'
type SortOption = { field: SortField; dir: SortDir; label: string; sublabel: string; Icon: React.ElementType }

type SortDropdownProps = Readonly<{
  sortConfig: SortConfig | null
  setSortConfig: (v: SortConfig | null) => void
  activeTabConfig: TabConfig
  hasDateInfo: boolean
  tSortLabels: { recent: string; oldest: string; alpha: string; alphaR: string; noSort: string; sort: string }
}>

export function SortDropdown({
  sortConfig,
  setSortConfig,
  activeTabConfig,
  hasDateInfo,
  tSortLabels,
}: SortDropdownProps) {
  const { open, setOpen, triggerRef, rect } = usePortalDropdown()
  const hasSort = sortConfig !== null

  const ALL_SORT_OPTIONS: SortOption[] = [
    { field: 'date', dir: 'desc', label: tSortLabels.recent, sublabel: 'fecha ↓', Icon: ArrowDown },
    { field: 'date', dir: 'asc', label: tSortLabels.oldest, sublabel: 'fecha ↑', Icon: ArrowUp },
    { field: 'alpha', dir: 'asc', label: tSortLabels.alpha, sublabel: 'A → Z', Icon: ArrowDown },
    { field: 'alpha', dir: 'desc', label: tSortLabels.alphaR, sublabel: 'Z → A', Icon: ArrowUp },
  ]

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
        document.body,
      )}
    </div>
  )
}
