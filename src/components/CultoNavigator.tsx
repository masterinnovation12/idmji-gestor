/**
 * CultoNavigator - IDMJI Gestor de Púlpito
 * 
 * Componente de navegación para el bloque de culto del Dashboard.
 * Permite navegar entre cultos de diferentes días con flechas y mini-calendario.
 * 
 * Rango: ±1 semana desde hoy (21 días totales)
 * 
 * @author Antigravity AI
 * @date 2026-01-25
 */

'use client'

import { useState, useEffect, useCallback, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, eachDayOfInterval, isWithinInterval } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { getCultoByDate, getCultoIndicatorsForRange } from '@/app/dashboard/cultos/actions'
import { Culto } from '@/types/database'
import { cn } from '@/lib/utils'

interface CultoNavigatorProps {
    initialCulto: (Culto & { lecturas?: any[] }) | null
    initialDate: string // YYYY-MM-DD
    esHoy: boolean
    children: (culto: (Culto & { lecturas?: any[] }) | null, isLoading: boolean, esHoy: boolean) => ReactNode
}

interface CultoIndicator {
    fecha: string
    tipo_culto: { color: string } | null
}

export default function CultoNavigator({ initialCulto, initialDate, esHoy: initialEsHoy, children }: CultoNavigatorProps) {
    const { language, t } = useI18n()
    const locale = language === 'ca-ES' ? ca : es

    // State
    const [selectedDate, setSelectedDate] = useState<Date>(new Date(initialDate + 'T12:00:00'))
    const [currentCulto, setCurrentCulto] = useState<(Culto & { lecturas?: any[] }) | null>(initialCulto)
    const [isLoading, setIsLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [indicators, setIndicators] = useState<CultoIndicator[]>([])
    const [direction, setDirection] = useState<'left' | 'right'>('right')

    // Calculate limits (±1 week from today)
    const today = new Date()
    const minDate = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
    const maxDate = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })

    // Week days for mini-calendar
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    // Check if selected date is today
    const isSelectedToday = isSameDay(selectedDate, today)

    // Nav limits check
    const canGoPrev = isWithinInterval(subDays(selectedDate, 1), { start: minDate, end: maxDate })
    const canGoNext = isWithinInterval(addDays(selectedDate, 1), { start: minDate, end: maxDate })

    // Hydration fix
    useEffect(() => {
        setMounted(true)
    }, [])

    // Fetch indicators for the visible range
    const fetchIndicators = useCallback(async () => {
        const start = format(minDate, 'yyyy-MM-dd')
        const end = format(maxDate, 'yyyy-MM-dd')
        const result = await getCultoIndicatorsForRange(start, end)
        if (result.success && result.data) {
            setIndicators(result.data as unknown as CultoIndicator[])
        }
    }, [])

    useEffect(() => {
        fetchIndicators()
    }, [fetchIndicators])

    // Fetch culto when date changes
    const fetchCulto = useCallback(async (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')

        // Skip if it's the initial date (already have the data)
        if (dateStr === initialDate && currentCulto === initialCulto) return

        setIsLoading(true)
        try {
            const result = await getCultoByDate(dateStr)
            if (result.success) {
                setCurrentCulto(result.data as any)
            } else {
                setCurrentCulto(null)
            }
        } catch (error) {
            console.error('Error fetching culto:', error)
            setCurrentCulto(null)
        } finally {
            setIsLoading(false)
        }
    }, [initialDate, initialCulto, currentCulto])

    // Navigate functions
    const goToPrev = () => {
        if (!canGoPrev) return
        setDirection('left')
        const newDate = subDays(selectedDate, 1)
        setSelectedDate(newDate)
        fetchCulto(newDate)
    }

    const goToNext = () => {
        if (!canGoNext) return
        setDirection('right')
        const newDate = addDays(selectedDate, 1)
        setSelectedDate(newDate)
        fetchCulto(newDate)
    }

    const goToDay = (date: Date) => {
        if (!isWithinInterval(date, { start: minDate, end: maxDate })) return
        setDirection(date > selectedDate ? 'right' : 'left')
        setSelectedDate(date)
        fetchCulto(date)
    }

    // Get indicator for a specific date
    const getIndicatorForDate = (date: Date): string | null => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const indicator = indicators.find(i => i.fecha === dateStr)
        return indicator?.tipo_culto?.color || null
    }

    if (!mounted) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Navigation Header */}
            <div className="flex flex-col gap-4">
                {/* Date Navigation Bar */}
                <div className="flex items-center justify-between gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl sm:rounded-full p-2 shadow-lg border border-slate-100 dark:border-slate-800">
                    {/* Prev Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={goToPrev}
                        disabled={!canGoPrev || isLoading}
                        className={cn(
                            "w-12 h-12 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all shrink-0",
                            canGoPrev && !isLoading
                                ? "bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200"
                                : "bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-700 cursor-not-allowed"
                        )}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>

                    {/* Current Date Display */}
                    <div className="flex-1 text-center min-w-0 px-2">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-sm sm:text-base font-black text-slate-800 dark:text-white capitalize truncate">
                                {format(selectedDate, 'EEEE', { locale })}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                                {format(selectedDate, 'd MMMM', { locale })}
                            </span>
                        </div>
                        {isSelectedToday && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="inline-block mt-1.5 px-3 py-0.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-red-500/30"
                            >
                                {t('dashboard.navigator.today' as any)}
                            </motion.div>
                        )}
                    </div>

                    {/* Next Button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={goToNext}
                        disabled={!canGoNext || isLoading}
                        className={cn(
                            "w-12 h-12 sm:w-10 sm:h-10 rounded-xl sm:rounded-full flex items-center justify-center transition-all shrink-0",
                            canGoNext && !isLoading
                                ? "bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200"
                                : "bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-700 cursor-not-allowed"
                        )}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </motion.button>
                </div>

                {/* Mini Week Calendar - Hidden on very small screens */}
                <div className="hidden xs:grid grid-cols-7 gap-1 sm:gap-2 px-1">
                    {weekDays.map((day) => {
                        const isSelected = isSameDay(day, selectedDate)
                        const isToday = isSameDay(day, today)
                        const indicatorColor = getIndicatorForDate(day)
                        const isInRange = isWithinInterval(day, { start: minDate, end: maxDate })

                        return (
                            <motion.button
                                key={day.toISOString()}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => goToDay(day)}
                                disabled={!isInRange || isLoading}
                                className={cn(
                                    "flex flex-col items-center gap-1 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all",
                                    isSelected
                                        ? "bg-slate-900 dark:bg-white shadow-lg"
                                        : isInRange && !isLoading
                                            ? "bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700"
                                            : "bg-slate-50 dark:bg-slate-900 opacity-40 cursor-not-allowed"
                                )}
                            >
                                {/* Day Name */}
                                <span className={cn(
                                    "text-[9px] sm:text-[10px] font-black uppercase tracking-tight",
                                    isSelected
                                        ? "text-white dark:text-slate-900"
                                        : "text-slate-400 dark:text-slate-500"
                                )}>
                                    {format(day, 'EEE', { locale }).slice(0, 2)}
                                </span>

                                {/* Day Number */}
                                <span className={cn(
                                    "text-sm sm:text-base font-black",
                                    isSelected
                                        ? "text-white dark:text-slate-900"
                                        : isToday
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-slate-700 dark:text-slate-200"
                                )}>
                                    {format(day, 'd')}
                                </span>

                                {/* Culto Indicator Dot */}
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

            {/* Content Area with Animation */}
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={format(selectedDate, 'yyyy-MM-dd')}
                    initial={{ opacity: 0, x: direction === 'right' ? 50 : -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction === 'right' ? -50 : 50 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                    {children(currentCulto, isLoading, isSelectedToday)}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
