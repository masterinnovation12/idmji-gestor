'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Search, UserPlus, Check, User } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { OfrendaLiquidShell, useOfrendaMobileOrTablet } from '../OfrendaLiquidShell'
import { normalizePlanoPersonaNombre } from './planoPersonaNormalize'
import { searchPlanoPersonas, createPlanoPersona } from './planoActions'
import { invokePlanoAction } from './planoInvoke'
import type { PlanoPersona, PlanoCreatePersonaError } from './planoActions'
import type { PlanoCapacidad } from './planoTypes'

interface Props {
    open: boolean
    onClose: () => void
    bloque: number
    rolLabel: string
    color: string
    value: string
    onSelect: (
        personaId: string | null,
        nombre: string | null,
        capacidad: PlanoCapacidad | null,
        alreadyExisted?: boolean,
    ) => void
}

export function PlanoPersonaCombobox({
    open,
    onClose,
    bloque,
    rolLabel,
    color,
    value,
    onSelect,
}: Readonly<Props>) {
    const { t } = useI18n()
    const isMobile = useOfrendaMobileOrTablet()
    const inputId = useId()
    const [query, setQuery] = useState(value)
    const [results, setResults] = useState<PlanoPersona[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (open) setQuery(value)
    }, [open, value])

    const runSearch = useCallback(async (q: string, signal: { cancelled: boolean }) => {
        setLoading(true)
        setError(null)
        try {
            const res = await invokePlanoAction(() => searchPlanoPersonas(q))
            if (signal.cancelled) return
            if (res.error) {
                setError(res.error)
                setResults([])
                return
            }
            setResults(res.data ?? [])
        } catch (err) {
            if (signal.cancelled) return
            setError(err instanceof Error ? err.message : t('ofrenda.plano.combobox.loading'))
            setResults([])
        } finally {
            if (!signal.cancelled) setLoading(false)
        }
    }, [t])

    useEffect(() => {
        if (!open) return
        const signal = { cancelled: false }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            void runSearch(query, signal)
        }, 200)
        return () => {
            signal.cancelled = true
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [open, query, runSearch])

    const trimmed = query.trim().replace(/\s+/g, ' ')
    const normQuery = normalizePlanoPersonaNombre(trimmed)
    const exactMatch = results.find(p => normalizePlanoPersonaNombre(p.nombre) === normQuery)

    const createErrorLabel = (code: PlanoCreatePersonaError): string => {
        if (code === 'too_short') return t('ofrenda.plano.combobox.tooShort')
        if (code === 'too_long') return t('ofrenda.plano.combobox.tooLong')
        if (code === 'no_permission') return t('ofrenda.plano.combobox.noPermission')
        return t('ofrenda.plano.combobox.createError')
    }

    const handleCreate = async () => {
        if (!trimmed || exactMatch) {
            if (exactMatch) onSelect(exactMatch.id, exactMatch.nombre, exactMatch.capacidad)
            onClose()
            return
        }
        setLoading(true)
        try {
            const res = await invokePlanoAction(() => createPlanoPersona(trimmed))
            if (res.errorCode) {
                setError(createErrorLabel(res.errorCode))
                return
            }
            if (res.data) onSelect(res.data.id, res.data.nombre, res.data.capacidad, res.alreadyExisted)
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : t('ofrenda.plano.combobox.loading'))
        } finally {
            setLoading(false)
        }
    }

    const rowClass =
        'w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm transition-all touch-manipulation min-h-[48px] rounded-xl hover:bg-muted/80'

    const list = (
        <div className="flex flex-col gap-1 px-2 pb-3 max-h-[min(50vh,360px)] overflow-y-auto">
            <button
                type="button"
                className={rowClass}
                onClick={() => { onSelect(null, null, null); onClose() }}
            >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="w-4 h-4 opacity-70" />
                </span>
                <span className="flex-1 font-medium">{t('ofrenda.plano.combobox.clear')}</span>
            </button>

            {loading && (
                <p className="px-4 py-2 text-xs text-muted-foreground">{t('ofrenda.plano.combobox.loading')}</p>
            )}
            {error && (
                <p className="px-4 py-2 text-xs text-destructive" role="alert">{error}</p>
            )}

            {results.map(p => (
                <button
                    key={p.id}
                    type="button"
                    className={rowClass}
                    onClick={() => { onSelect(p.id, p.nombre, p.capacidad); onClose() }}
                >
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: color }}
                    >
                        {p.nombre.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0 truncate">{p.nombre}</span>
                    {normalizePlanoPersonaNombre(p.nombre) === normQuery && (
                        <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            <Check className="w-3 h-3" />
                            {t('ofrenda.plano.combobox.existing')}
                        </span>
                    )}
                </button>
            ))}

            {trimmed.length >= 2 && !exactMatch && (
                <button
                    type="button"
                    className={`${rowClass} border border-dashed border-amber-500/50 bg-amber-500/5 font-semibold`}
                    onClick={handleCreate}
                    disabled={loading}
                >
                    <UserPlus className="w-5 h-5 text-amber-600 shrink-0" />
                    <span className="flex-1 min-w-0">
                        {t('ofrenda.plano.combobox.add').replace('{nombre}', trimmed)}
                    </span>
                </button>
            )}

            {!loading && trimmed.length >= 1 && results.length === 0 && !exactMatch && trimmed.length < 2 && (
                <p className="px-4 py-2 text-xs text-muted-foreground">{t('ofrenda.plano.combobox.typeMore')}</p>
            )}
            {!loading && trimmed.length >= 2 && results.length === 0 && !exactMatch && (
                <p className="px-4 py-2 text-xs text-muted-foreground">{t('ofrenda.plano.combobox.noMatch')}</p>
            )}
        </div>
    )

    if (isMobile) {
        return (
            <OfrendaLiquidShell
                open={open}
                onClose={onClose}
                ariaLabel={`${bloque}- ${rolLabel}`}
                title={`${bloque}- ${rolLabel}`}
                headline={`${bloque}- ${rolLabel}`}
                accent="gold"
                testIdPrefix="plano-persona-combobox"
                unstyledBody
            >
                <div className="px-4 pb-2">
                    <label htmlFor={inputId} className="sr-only">{t('ofrenda.plano.combobox.search')}</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            id={inputId}
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoComplete="off"
                            autoCapitalize="words"
                            enterKeyHint="done"
                            autoFocus
                            className="w-full pl-10 pr-4 py-3 min-h-[48px] rounded-xl border border-border bg-background text-base"
                            placeholder={t('ofrenda.plano.combobox.search')}
                        />
                    </div>
                </div>
                {list}
            </OfrendaLiquidShell>
        )
    }

    if (!open) return null

    return (
        <OfrendaLiquidShell
            open={open}
            onClose={onClose}
            ariaLabel={`${bloque}- ${rolLabel}`}
            title={`${bloque}- ${rolLabel}`}
            headline={`${bloque}- ${rolLabel}`}
            accent="gold"
            testIdPrefix="plano-persona-combobox"
            unstyledBody
        >
            <div className="px-4 pb-2">
                <label htmlFor={inputId} className="sr-only">{t('ofrenda.plano.combobox.search')}</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        id={inputId}
                        type="search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoComplete="off"
                        autoCapitalize="words"
                        autoFocus
                        role="combobox"
                        aria-expanded
                        className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-border bg-background"
                        placeholder={t('ofrenda.plano.combobox.search')}
                    />
                </div>
            </div>
            {list}
        </OfrendaLiquidShell>
    )
}
