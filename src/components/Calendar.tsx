/**
 * Calendar - IDMJI Gestor de Púlpito
 * 
 * Componente de calendario interactivo con soporte para vista de cuadrícula (desktop)
 * y vista de lista optimizada (mobile). 
 * 
 * Características:
 * - Diseño Glassmorphism premium
 * - Internacionalización completa (ES/CA)
 * - Navegación intuitiva
 * - Indicadores visuales de estado y tipo de culto
 * 
 * @author Antigravity AI
 * @date 2024-12-25
 */

'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    isSameWeek
} from 'date-fns'
import { es, ca } from 'date-fns/locale'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

import { getCultoStatus } from '@/lib/utils/culto-helpers'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { CalendarEvent } from '@/types/database'

interface CalendarProps {
    events: CalendarEvent[]
    onMonthChange?: (year: number, month: number) => void
    view?: 'month' | 'week' | 'day'
    selectedDate?: Date
    onDateSelect?: (date: Date) => void
}

export default function Calendar({ events, onMonthChange, view = 'month', selectedDate, onDateSelect }: CalendarProps) {
    const { t, language } = useI18n()
    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
    const [internalDate, setInternalDate] = useState(new Date())
    const currentDate = selectedDate || internalDate
    const setCurrentDate = (date: Date) => {
        if (onDateSelect) onDateSelect(date)
        else setInternalDate(date)
    }
    const locale = language === 'ca-ES' ? ca : es

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    const eventsMap = new Map(events.map(e => [e.fecha, e]))

    const handlePrev = () => {
        let newDate: Date
        if (view === 'month') newDate = subMonths(currentDate, 1)
        else if (view === 'week') newDate = subWeeks(currentDate, 1)
        else newDate = subDays(currentDate, 1)
        
        const oldMonth = currentDate.getMonth()
        setCurrentDate(newDate)
        if (view === 'month') onMonthChange?.(newDate.getFullYear(), newDate.getMonth())
        else if (newDate.getMonth() !== oldMonth) onMonthChange?.(newDate.getFullYear(), newDate.getMonth())
    }

    const handleNext = () => {
        let newDate: Date
        if (view === 'month') newDate = addMonths(currentDate, 1)
        else if (view === 'week') newDate = addWeeks(currentDate, 1)
        else newDate = addDays(currentDate, 1)

        const oldMonth = currentDate.getMonth()
        setCurrentDate(newDate)
        if (view === 'month') onMonthChange?.(newDate.getFullYear(), newDate.getMonth())
        else if (newDate.getMonth() !== oldMonth) onMonthChange?.(newDate.getFullYear(), newDate.getMonth())
    }

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    const weekDaysInterval = eachDayOfInterval({ start: weekStart, end: weekEnd })

    const daysToRender = view === 'month' ? days : view === 'week' ? weekDaysInterval : [currentDate]

    const handleToday = () => {
        const today = new Date()
        const oldMonth = currentDate.getMonth()
        const oldYear = currentDate.getFullYear()
        
        setCurrentDate(today)
        if (today.getMonth() !== oldMonth || today.getFullYear() !== oldYear) {
            onMonthChange?.(today.getFullYear(), today.getMonth())
        }
    }

    const weekDays = [
        t('calendar.days.mon'),
        t('calendar.days.tue'),
        t('calendar.days.wed'),
        t('calendar.days.thu'),
        t('calendar.days.fri'),
        t('calendar.days.sat'),
        t('calendar.days.sun')
    ]

    return (
        <div className="space-y-6">
            {/* Header del Calendario */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <CalendarIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">
                        {format(currentDate, 'MMMM yyyy', { locale })}
                    </h2>
                </div>

                <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
                    <button
                        onClick={handlePrev}
                        className="p-2.5 hover:bg-background hover:shadow-sm rounded-xl transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleToday}
                        className="px-5 py-2 text-xs font-black uppercase tracking-widest hover:bg-background hover:shadow-sm rounded-xl transition-all"
                    >
                        {t('calendar.today')}
                    </button>
                    <button
                        onClick={handleNext}
                        className="p-2.5 hover:bg-background hover:shadow-sm rounded-xl transition-all"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid (Desktop) */}
            <div className="hidden md:block">
                <div className={`grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'} gap-px bg-border/20 rounded-[2rem] overflow-hidden border border-border/50 shadow-2xl`}>
                    {view !== 'day' && weekDays.map(day => (
                        <div key={day} className="bg-muted/30 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 border-b border-border/50">
                            {day}
                        </div>
                    ))}

                    {daysToRender.map((day, idx) => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const event = eventsMap.get(dateStr)
                        const isToday = isSameDay(day, new Date())
                        const isCurrentMonth = isSameMonth(day, currentDate)
                        const status = event ? getCultoStatus(event) : null

                        return (
                            <motion.div
                                key={dateStr}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.01 }}
                                onClick={() => onDateSelect?.(day)}
                                className={`
                                    ${view === 'day' ? 'min-h-[400px]' : view === 'week' ? 'min-h-[200px]' : 'min-h-[120px]'} p-4 transition-all relative group/day cursor-pointer
                                    ${isCurrentMonth || view !== 'month' ? 'bg-background/40' : 'bg-muted/10 opacity-40'}
                                    ${isToday ? 'ring-2 ring-inset ring-primary shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.05)]' : ''}
                                    hover:bg-primary/5
                                `}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex flex-col">
                                        <span className={`text-lg font-black ${!isCurrentMonth && view === 'month' ? 'text-muted-foreground/40' : isToday ? 'text-primary' : ''}`}>
                                            {format(day, 'd')}
                                        </span>
                                        {view === 'day' && (
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                {format(day, 'EEEE', { locale })}
                                            </span>
                                        )}
                                    </div>
                                    {event && (
                                        <div
                                            className="w-3 h-3 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)] border-2 border-white dark:border-slate-800"
                                            style={{ backgroundColor: event.tipo_culto?.color || '#888' }}
                                        />
                                    )}
                                </div>

                                {event ? (
                                    <Link href={`/dashboard/cultos/${event.id}`}>
                                        <div className={`
                                            space-y-4 p-4 rounded-2xl transition-all cursor-pointer border shadow-sm
                                            ${isDark ? 'bg-slate-800/50 border-white/5 hover:bg-slate-800' : 'bg-white border-gray-100 hover:bg-gray-50'}
                                            ${view === 'day' ? 'max-w-2xl' : ''}
                                        `}>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-black uppercase tracking-tight leading-tight">
                                                    {event.tipo_culto?.nombre}
                                                </p>
                                                <div className={`
                                                    text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-lg inline-flex items-center gap-1
                                                    ${status === 'complete' 
                                                        ? 'bg-emerald-500/10 text-emerald-600' 
                                                        : 'bg-amber-500/10 text-amber-600'}
                                                `}>
                                                    {status === 'complete' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                    {status === 'complete' ? t('calendar.status.complete') : t('calendar.status.pending')}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-bold">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={14} className="text-primary/60" />
                                                    {event.hora_inicio.slice(0, 5)}
                                                </div>
                                                {event.es_laborable_festivo && (
                                                    <div className="flex items-center gap-1 text-amber-500">
                                                        <AlertCircle size={14} />
                                                        <span>Festivo</span>
                                                    </div>
                                                )}
                                            </div>

                                            {view === 'day' && (
                                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest">Responsable</p>
                                                        <p className="text-xs font-bold truncate">Sin asignar</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest">Lectura</p>
                                                        <p className="text-xs font-bold truncate">Pendiente</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ) : view === 'day' ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                                        <CalendarIcon className="w-16 h-16 mb-4" />
                                        <p className="text-sm font-bold uppercase tracking-widest">{t('calendar.noCultos')}</p>
                                    </div>
                                ) : null}
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            {/* Calendar List (Mobile) - Vista de tarjetas premium */}
            <div className="md:hidden space-y-4 px-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentDate.getMonth()}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        {events
                            .filter(e => isSameMonth(new Date(e.fecha), currentDate))
                            .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                            .map((event, idx) => {
                                const status = getCultoStatus(event)
                                return (
                                    <Link href={`/dashboard/cultos/${event.id}`} key={event.id}>
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="glass rounded-3xl p-5 flex items-center gap-5 border border-white/20 active:scale-[0.98] transition-all shadow-xl shadow-black/5"
                                        >
                                            <div className="flex flex-col items-center justify-center bg-primary/10 rounded-2xl w-16 h-16 shrink-0 border border-primary/20">
                                                <span className="text-[10px] font-black text-primary uppercase tracking-tighter">
                                                    {format(new Date(event.fecha), 'MMM', { locale })}
                                                </span>
                                                <span className="text-2xl font-black text-primary tracking-tighter">
                                                    {format(new Date(event.fecha), 'd')}
                                                </span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <h3 className="font-black text-base uppercase tracking-tight truncate">
                                                        {event.tipo_culto?.nombre}
                                                    </h3>
                                                    <div
                                                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                                                        style={{ backgroundColor: event.tipo_culto?.color || '#888' }}
                                                    />
                                                </div>
                                                <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
                                                    <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5">
                                                        <Clock size={14} className="text-primary/60" />
                                                        {event.hora_inicio.slice(0, 5)}
                                                        {event.es_laborable_festivo && <AlertCircle size={14} className="text-amber-500" />}
                                                    </p>
                                                    <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${status === 'complete' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                        {status === 'complete' ? t('calendar.status.complete') : t('calendar.status.pending')}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-2 bg-muted/50 rounded-xl">
                                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                        </motion.div>
                                    </Link>
                                )
                            })}

                        {events.filter(e => isSameMonth(new Date(e.fecha), currentDate)).length === 0 && (
                            <div className="text-center py-12 glass rounded-3xl border border-white/20">
                                <CalendarIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                    {t('calendar.noCultos')}
                                </p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Leyenda y Notas */}
            <div className="flex flex-wrap items-center justify-center gap-6 px-4 py-6 glass rounded-[2rem] border border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{t('calendar.legend.estudio')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{t('calendar.legend.alabanza')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500 shadow-lg shadow-purple-500/20" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{t('calendar.legend.ensenanza')}</span>
                </div>
                <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-full">
                    <AlertCircle size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                        {t('calendar.laborableFestivo')}
                    </span>
                </div>
            </div>
        </div>
    )
}
