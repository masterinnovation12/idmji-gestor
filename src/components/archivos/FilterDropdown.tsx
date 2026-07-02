'use client'

import { createPortal } from 'react-dom'
import { Filter, ChevronDown } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { usePortalDropdown } from './usePortalDropdown'
import type { TabConfig } from './types'

type FilterDropdownProps = Readonly<{
  monthYearOptions: { year: number; month: number; label: string }[]
  filterMonthYear: string
  setFilterMonthYear: (v: string) => void
  activeTabConfig: TabConfig
  hasFilter: boolean
  tAllPeriods: string
}>

export function FilterDropdown({
  monthYearOptions,
  filterMonthYear,
  setFilterMonthYear,
  activeTabConfig,
  hasFilter,
  tAllPeriods,
}: FilterDropdownProps) {
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
            ? `${activeTabConfig.activeBg} text-white shadow border-[1.5px] border-[#b8964a]/70`
            : 'bg-white text-slate-600 border-[1.5px] border-[rgba(184,150,74,0.32)] hover:bg-[#f8f3e8] hover:border-[#b8964a]'
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
            className="fixed z-201 rounded-xl border-[1.5px] border-[rgba(184,150,74,0.45)] shadow-2xl overflow-hidden bg-white max-h-[300px] overflow-y-auto"
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
                  : 'text-slate-700 hover:bg-[#f8f3e8]',
              ].join(' ')}
            >
              <span className="text-base leading-none">·</span>
              <span>{tAllPeriods}</span>
            </button>

            {/* Por año agrupado */}
            {years.map((year) => (
              <div key={year}>
                <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#b68f2f] bg-[#f8f3e8]/70 border-t border-[rgba(184,150,74,0.25)]">
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
                          : 'text-slate-700 hover:bg-[#f8f3e8]',
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
        document.body,
      )}
    </div>
  )
}
