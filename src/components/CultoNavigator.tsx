/**
 * CultoNavigator - IDMJI Gestor de Púlpito
 *
 * Navegación del culto en el dashboard (±1 semana).
 * El día cambia al instante; los datos se leen de caché (rango precargado)
 * para que prev/siguiente en móvil no esperen a la red.
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, eachDayOfInterval, isWithinInterval } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { getCultosByDate, getCultosByDateRange, getCultoIndicatorsForRange } from '@/app/dashboard/cultos/actions'
import { Culto, LecturaBiblica } from '@/types/database'
import { cn } from '@/lib/utils'
import {
    dashboardNavigatorBounds,
    applyAuthoritativeRange,
    navigatorRangeFingerprint,
    pickDefaultCultoForDay,
    seedNavigatorCache,
} from '@/lib/utils/pickDashboardCulto'
import { hasOpenAppModal } from '@/lib/utils/hasOpenAppModal'

type CultoWithLecturas = Culto & { lecturas?: LecturaBiblica[] }

interface CultoNavigatorProps {
    initialCulto: CultoWithLecturas | null
    initialDate: string // YYYY-MM-DD
    esHoy: boolean
    initialDayCultos?: CultoWithLecturas[]
    /** Cultos del rango ±1 semana (SSR): navegar no espera a la red. */
    initialRangeCultos?: CultoWithLecturas[]
    /** Solo tests: fija "hoy" para límites y dual 10h/17h. */
    now?: Date
    children: (culto: CultoWithLecturas | null, isLoading: boolean, esHoy: boolean) => ReactNode
}

interface CultoIndicator {
    fecha: string
    tipo_culto: { color: string } | null
}

function seedCache(
    initialDate: string,
    initialDayCultos: CultoWithLecturas[] | undefined,
    initialCulto: CultoWithLecturas | null,
    minDate: Date,
    maxDate: Date,
    initialRangeCultos?: CultoWithLecturas[],
): Record<string, CultoWithLecturas[]> {
    const fromRange = initialRangeCultos
        ? seedNavigatorCache(minDate, maxDate, initialRangeCultos)
        : {}
    const list = initialDayCultos?.length
        ? initialDayCultos
        : initialCulto
            ? [initialCulto]
            : []
    return list.length > 0 ? { ...fromRange, [initialDate]: list } : fromRange
}

export default function CultoNavigator({
    initialCulto,
    initialDate,
    initialDayCultos,
    initialRangeCultos,
    now,
    children,
}: CultoNavigatorProps) {
    const { language, t } = useI18n()
    const locale = language === 'ca-ES' ? ca : es
    const [today] = useState(() => now ?? new Date())
    const { minDate, maxDate } = useMemo(() => dashboardNavigatorBounds(today), [today])
    const rangeStart = format(minDate, 'yyyy-MM-dd')
    const rangeEnd = format(maxDate, 'yyyy-MM-dd')

    const getTranslatedCultoName = (name: string | undefined) => {
        if (!name) return ''
        const lower = name.toLowerCase()
        if (lower.includes('estudio')) return t('culto.estudio')
        if (lower.includes('alabanza')) return t('culto.alabanza')
        if (lower.includes('enseñanza') || lower.includes('ensenanza')) return t('culto.ensenanza')
        if (lower.includes('testimonios')) return t('culto.testimonios')
        return name
    }

    const [selectedDate, setSelectedDate] = useState<Date>(new Date(initialDate + 'T12:00:00'))
    const seeded = seedCache(initialDate, initialDayCultos, initialCulto, minDate, maxDate, initialRangeCultos)
    const cacheRef = useRef(seeded)

    const seededList = seeded[initialDate] ?? []
    const [currentCulto, setCurrentCulto] = useState<CultoWithLecturas | null>(
        pickDefaultCultoForDay(seededList, new Date(initialDate + 'T12:00:00'), today) ?? initialCulto,
    )
    const [dayCultos, setDayCultos] = useState<CultoWithLecturas[]>(seededList)
    const [isLoading, setIsLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [indicators, setIndicators] = useState<CultoIndicator[]>([])
    const fetchGenRef = useRef(0)
    const selectedKeyRef = useRef(initialDate)
    const hourLockedRef = useRef(false)
    const currentIdRef = useRef<string | null>(
        pickDefaultCultoForDay(seededList, new Date(initialDate + 'T12:00:00'), today)?.id ?? initialCulto?.id ?? null,
    )
    const appliedFpRef = useRef(navigatorRangeFingerprint(initialRangeCultos))
    const rangeGenRef = useRef(0)

    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const isSelectedToday = isSameDay(selectedDate, today)
    const canGoPrev = isWithinInterval(subDays(selectedDate, 1), { start: minDate, end: maxDate })
    const canGoNext = isWithinInterval(addDays(selectedDate, 1), { start: minDate, end: maxDate })

    const applyDay = useCallback((date: Date, list: CultoWithLecturas[]) => {
        setDayCultos(list)
        const picked = pickDefaultCultoForDay(list, date, today)
        setCurrentCulto(picked)
        currentIdRef.current = picked?.id ?? null
    }, [today])

    const applyKeepingSelection = useCallback((date: Date, list: CultoWithLecturas[]) => {
        setDayCultos(list)
        if (hourLockedRef.current && currentIdRef.current) {
            const match = list.find((c) => c.id === currentIdRef.current) ?? pickDefaultCultoForDay(list, date, today)
            setCurrentCulto(match)
            currentIdRef.current = match?.id ?? null
            return
        }
        const picked = pickDefaultCultoForDay(list, date, today)
        setCurrentCulto(picked)
        currentIdRef.current = picked?.id ?? null
    }, [today])

    const writeCache = useCallback((updater: (prev: Record<string, CultoWithLecturas[]>) => Record<string, CultoWithLecturas[]>) => {
        cacheRef.current = updater(cacheRef.current)
    }, [])

    const remember = useCallback((fecha: string, list: CultoWithLecturas[]) => {
        writeCache((prev) => {
            const existing = prev[fecha]
            if (existing && existing.length > 0) return prev
            return { ...prev, [fecha]: list }
        })
    }, [writeCache])

    const ingestRange = useCallback((cultos: CultoWithLecturas[]) => {
        writeCache((prev) => applyAuthoritativeRange(prev, minDate, maxDate, cultos))
        const key = selectedKeyRef.current
        applyKeepingSelection(new Date(`${key}T12:00:00`), cacheRef.current[key] ?? [])
        setIsLoading(false)
    }, [applyKeepingSelection, maxDate, minDate, writeCache])

    const refetchRange = useCallback(async () => {
        const gen = ++rangeGenRef.current
        const [rangeResult, indicatorResult] = await Promise.all([
            getCultosByDateRange(rangeStart, rangeEnd),
            getCultoIndicatorsForRange(rangeStart, rangeEnd),
        ])
        if (gen !== rangeGenRef.current) return
        if (indicatorResult.success && indicatorResult.data) {
            setIndicators(indicatorResult.data as unknown as CultoIndicator[])
        }
        if (!rangeResult.success || !rangeResult.data) return
        ingestRange(rangeResult.data as CultoWithLecturas[])
    }, [ingestRange, rangeEnd, rangeStart])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        void refetchRange()
    }, [refetchRange])

    const ssrFingerprint = navigatorRangeFingerprint(initialRangeCultos)
    useEffect(() => {
        if (!initialRangeCultos) return
        if (appliedFpRef.current === ssrFingerprint) return
        appliedFpRef.current = ssrFingerprint
        rangeGenRef.current += 1
        const next = seedCache(initialDate, initialDayCultos, initialCulto, minDate, maxDate, initialRangeCultos)
        cacheRef.current = next
        const key = selectedKeyRef.current
        applyKeepingSelection(new Date(`${key}T12:00:00`), next[key] ?? [])
        setIsLoading(false)
    }, [applyKeepingSelection, initialCulto, initialDate, initialDayCultos, initialRangeCultos, maxDate, minDate, ssrFingerprint])

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined
        const onShow = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
                if (hasOpenAppModal()) return
                void refetchRange()
            }, 150)
        }
        document.addEventListener('visibilitychange', onShow)
        window.addEventListener('focus', onShow)
        window.addEventListener('pageshow', onShow)
        return () => {
            if (timer) clearTimeout(timer)
            document.removeEventListener('visibilitychange', onShow)
            window.removeEventListener('focus', onShow)
            window.removeEventListener('pageshow', onShow)
        }
    }, [refetchRange])

    useEffect(() => {
        const key = format(selectedDate, 'yyyy-MM-dd')
        selectedKeyRef.current = key
        hourLockedRef.current = false
        if (key in cacheRef.current) {
            applyDay(selectedDate, cacheRef.current[key] ?? [])
            setIsLoading(false)
        } else {
            setIsLoading(true)
            setDayCultos([])
            setCurrentCulto(null)
            const gen = ++fetchGenRef.current
            void getCultosByDate(key).then((result) => {
                const list = (result.success && result.data ? result.data : []) as CultoWithLecturas[]
                remember(key, list)
                if (gen !== fetchGenRef.current || selectedKeyRef.current !== key) return
                applyDay(selectedDate, list)
                setIsLoading(false)
            })
        }

        const prefetch = (date: Date) => {
            if (!isWithinInterval(date, { start: minDate, end: maxDate })) return
            const neighbor = format(date, 'yyyy-MM-dd')
            if (neighbor in cacheRef.current) return
            void getCultosByDate(neighbor).then((result) => {
                const list = (result.success && result.data ? result.data : []) as CultoWithLecturas[]
                remember(neighbor, list)
            })
        }
        prefetch(subDays(selectedDate, 1))
        prefetch(addDays(selectedDate, 1))
    }, [selectedDate, applyDay, remember, minDate, maxDate])

    const goToPrev = () => {
        setSelectedDate((current) => {
            const next = subDays(current, 1)
            return isWithinInterval(next, { start: minDate, end: maxDate }) ? next : current
        })
    }

    const goToNext = () => {
        setSelectedDate((current) => {
            const next = addDays(current, 1)
            return isWithinInterval(next, { start: minDate, end: maxDate }) ? next : current
        })
    }

    const goToDay = (date: Date) => {
        if (!isWithinInterval(date, { start: minDate, end: maxDate })) return
        setSelectedDate(date)
    }

    const getIndicatorForDate = (date: Date): string | null => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const indicator = indicators.find((i) => i.fecha === dateStr)
        return indicator?.tipo_culto?.color || null
    }

    if (!mounted) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#b8964a]" />
            </div>
        )
    }

    const selectedKey = format(selectedDate, 'yyyy-MM-dd')

    return (
        <div className="space-y-4" data-testid="dashboard-culto-navigator">
            <div className="flex flex-col gap-4">
                <div className="ofrenda-liquid-nav flex items-center justify-between gap-2 rounded-2xl sm:rounded-full p-2 shadow-lg">
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={goToPrev}
                        disabled={!canGoPrev}
                        aria-label={t('calendar.prevDay')}
                        data-testid="dashboard-nav-prev"
                        className={cn(
                            "w-12 h-12 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all shrink-0 touch-manipulation",
                            canGoPrev
                                ? "bg-[#f8f3e8] hover:bg-[#f3ead4] border border-[rgba(184,150,74,0.3)] text-[#1f2e85]"
                                : "bg-white/50 text-slate-300 cursor-not-allowed"
                        )}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>

                    <div
                        className="flex-1 text-center min-w-0 px-2"
                        data-testid="dashboard-nav-date"
                        data-date={selectedKey}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-sm sm:text-base font-black text-slate-800 capitalize truncate" suppressHydrationWarning>
                                {format(selectedDate, 'EEEE', { locale })}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-500" suppressHydrationWarning>
                                {format(selectedDate, 'd MMMM', { locale })}
                            </span>
                        </div>
                        {isSelectedToday && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="inline-block mt-1.5 px-3 py-0.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-red-500/30"
                            >
                                {t('dashboard.navigator.today')}
                            </motion.div>
                        )}
                    </div>

                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={goToNext}
                        disabled={!canGoNext}
                        aria-label={t('calendar.nextDay')}
                        data-testid="dashboard-nav-next"
                        className={cn(
                            "w-12 h-12 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all shrink-0 touch-manipulation",
                            canGoNext
                                ? "bg-[#f8f3e8] hover:bg-[#f3ead4] border border-[rgba(184,150,74,0.3)] text-[#1f2e85]"
                                : "bg-white/50 text-slate-300 cursor-not-allowed"
                        )}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </motion.button>
                </div>

                {dayCultos.length > 1 && (
                    <div className="flex justify-center gap-1 p-1 rounded-2xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] shadow-sm" data-testid="dashboard-nav-hours">
                        {dayCultos.map((culto) => {
                            const isSelected = currentCulto?.id === culto.id
                            const horaLabel = `${getTranslatedCultoName(culto.tipo_culto?.nombre)} (${culto.hora_inicio.slice(0, 5)})`
                            return (
                                <button
                                    type="button"
                                    key={culto.id}
                                    onClick={() => {
                                        hourLockedRef.current = true
                                        currentIdRef.current = culto.id
                                        setCurrentCulto(culto)
                                    }}
                                    className={cn(
                                        "flex-1 min-h-[44px] px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all touch-manipulation",
                                        isSelected
                                            ? "bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]"
                                            : "text-slate-500 hover:text-[#1f2e85] hover:bg-white/70"
                                    )}
                                >
                                    {horaLabel}
                                </button>
                            )
                        })}
                    </div>
                )}

                <div className="hidden xs:grid grid-cols-7 gap-1 sm:gap-2 px-1">
                    {weekDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDate)
                        const isToday = isSameDay(day, today)
                        const indicatorColor = getIndicatorForDate(day)
                        const isInRange = isWithinInterval(day, { start: minDate, end: maxDate })
                        const dayKey = format(day, 'yyyy-MM-dd')

                        return (
                            <motion.button
                                type="button"
                                key={day.toISOString()}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => goToDay(day)}
                                disabled={!isInRange}
                                data-testid={`dashboard-nav-day-${dayKey}`}
                                className={cn(
                                    "flex flex-col items-center gap-1 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all border touch-manipulation",
                                    isSelected
                                        ? "bg-gradient-to-br from-[#1f2e85] to-[#283593] border-[#b8964a] shadow-[0_4px_14px_rgba(31,46,133,0.35)]"
                                        : isInRange
                                            ? "border-transparent bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700"
                                            : "border-transparent bg-slate-50 dark:bg-slate-900 opacity-40 cursor-not-allowed"
                                )}
                            >
                                <span className={cn(
                                    "text-[9px] sm:text-[10px] font-black uppercase tracking-tight",
                                    isSelected
                                        ? "text-[#e8d9a8]"
                                        : "text-slate-400 dark:text-slate-500"
                                )}>
                                    {format(day, 'EEE', { locale }).slice(0, 2)}
                                </span>
                                <span className={cn(
                                    "text-sm sm:text-base font-black",
                                    isSelected
                                        ? "text-white"
                                        : isToday
                                            ? "text-[#b68f2f]"
                                            : "text-slate-700 dark:text-slate-200"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                <div
                                    className={cn(
                                        "w-2 h-2 rounded-full transition-all",
                                        indicatorColor
                                            ? `shadow-sm`
                                            : "bg-transparent"
                                    )}
                                    style={{ backgroundColor: indicatorColor || 'transparent' }}
                                />
                            </motion.button>
                        )
                    })}
                </div>
            </div>

            <div
                data-testid="dashboard-nav-content"
                aria-busy={isLoading}
            >
                {children(currentCulto, isLoading && !currentCulto, isSelectedToday)}
            </div>
        </div>
    )
}
