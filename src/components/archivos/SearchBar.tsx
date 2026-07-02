'use client'

import { useRef, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'

type SearchBarProps = Readonly<{
  value: string
  onChange: (v: string) => void
  placeholder?: string
  accentColor: string
  activeBg: string
  resultsCount: number
  totalCount: number
  /** Debounce delay in ms (default 250) */
  debounceMs?: number
}>

/**
 * Barra de búsqueda con debounce integrado, indicador de resultados
 * y feedback visual (rojo si 0 resultados).
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  accentColor,
  resultsCount,
  totalCount,
  debounceMs = 250,
}: SearchBarProps) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value changes (e.g. clear all filters)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (v: string) => {
    setLocalValue(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(v), debounceMs)
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const isActive = localValue.trim().length > 0
  const hasNoResults = isActive && resultsCount === 0

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10">
        <Search
          className={`w-4 h-4 transition-all duration-200 ${
            isActive ? accentColor : 'text-[#b8964a]'
          }`}
        />
      </div>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full pl-10 pr-10 py-3 rounded-xl border-[1.5px] text-sm
          bg-white text-slate-800
          placeholder:text-slate-400
          focus:outline-none focus:ring-2 transition-all duration-200
          ${hasNoResults
            ? 'border-red-400/60 focus:border-red-500/70 focus:ring-red-500/15'
            : isActive
              ? 'border-[#b8964a] focus:ring-[rgba(184,150,74,0.25)]'
              : 'border-[rgba(184,150,74,0.32)] hover:border-[rgba(184,150,74,0.5)] focus:border-[#b8964a] focus:ring-[rgba(184,150,74,0.18)]'
          }
        `}
      />
      {isActive && (
        <button
          type="button"
          aria-label={t('common.clearSearch')}
          onClick={() => { handleChange(''); inputRef.current?.focus() }}
          className="absolute inset-y-0 right-3 flex items-center p-1.5 hover:bg-[#f8f3e8] rounded-lg transition-colors group"
        >
          <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
        </button>
      )}
      {isActive && (
        <div
          className={`absolute -bottom-5 right-1 pointer-events-none select-none text-[9px] font-bold uppercase tracking-wider transition-colors ${
            hasNoResults ? 'text-red-500/90' : 'text-muted-foreground/50'
          }`}
        >
          {hasNoResults
            ? <span suppressHydrationWarning>{t('archivos.search.noResultsShort' as Parameters<typeof t>[0])}</span>
            : `${resultsCount} / ${totalCount}`}
        </div>
      )}
    </div>
  )
}
