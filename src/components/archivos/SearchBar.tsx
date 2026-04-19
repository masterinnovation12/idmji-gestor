'use client'

import { useRef, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'

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
            isActive ? accentColor : 'text-muted-foreground/40'
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
          onClick={() => { handleChange(''); inputRef.current?.focus() }}
          className="absolute inset-y-0 right-3 flex items-center p-1.5 hover:bg-muted rounded-lg transition-colors group"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground" />
        </button>
      )}
      {isActive && (
        <div
          className={`absolute -bottom-5 right-1 pointer-events-none select-none text-[9px] font-bold uppercase tracking-wider transition-colors ${
            hasNoResults ? 'text-destructive/80' : 'text-muted-foreground/50'
          }`}
        >
          {hasNoResults
            ? 'Sin resultados'
            : `${resultsCount} / ${totalCount}`}
        </div>
      )}
    </div>
  )
}
