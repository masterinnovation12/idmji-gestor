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

import { useState, useEffect } from 'react'
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
    const [isDark, setIsDark] = useState(false)
    
    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'))
    }, [])

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
    
    // Deduplicar eventos por fecha para asegurar que solo haya uno por día
    const eventsMap = new Map()
    events.forEach(e => {
        if (!eventsMap.has(e.fecha)) {
            eventsMap.set(e.fecha, e)
        }
    })

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

    const isMonthActual = isSameMonth(currentDate, new Date())

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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-2 mb-8">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-primary/10 rounded-3xl border border-primary/20 shadow-inner">
                        <CalendarIcon className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">
                            {view === 'month' ? format(currentDate, 'MMMM yyyy', { locale }) : 
                             view === 'week' ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM, yyyy')}` :
                             format(currentDate, 'EEEE, d MMMM yyyy', { locale })}
                        </h2>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">
                            {view === 'month' ? 'Vista Mensual' : view === 'week' ? 'Vista Semanal' : 'Vista Diaria'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-[2.5rem] border border-border/50 shadow-inner backdrop-blur-md">
                    <button
                        onClick={handlePrev}
                        className="p-3 hover:bg-background hover:shadow-lg rounded-2xl transition-all group active:scale-90 flex items-center gap-2"
                        title={view === 'month' ? 'Mes Anterior' : view === 'week' ? 'Semana Anterior' : 'Día Anterior'}
                    >
                        <ChevronLeft className="w-6 h-6 text-primary group-hover:-translate-x-0.5 transition-transform" />
                        <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest text-primary/70">Anterior</span>
                    </button>
                    
                    <button
                        onClick={handleToday}
                        className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-2xl border-b-2 ${
                            isMonthActual 
                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 border-blue-800' 
                                : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-600 border-transparent hover:border-blue-200'
                        }`}
                    >
                        {isMonthActual ? t('calendar.today') : 'Hoy'}
                    </button>

                    <button
                        onClick={handleNext}
                        className="p-3 hover:bg-background hover:shadow-lg rounded-2xl transition-all group active:scale-90 flex items-center gap-2"
                        title={view === 'month' ? 'Mes Siguiente' : view === 'week' ? 'Semana Siguiente' : 'Día Siguiente'}
                    >
                        <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest text-primary/70">Siguiente</span>
                        <ChevronRight className="w-6 h-6 text-primary group-hover:translate-x-0.5 transition-transform" />
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
                                    ${view === 'day' ? 'min-h-[400px]' : view === 'week' ? 'min-h-[220px]' : 'min-h-[160px] md:min-h-[210px]'} p-2 md:p-4 transition-all relative group/day cursor-pointer overflow-hidden flex flex-col
                                    ${isCurrentMonth || view !== 'month' ? 'bg-background/40' : 'bg-muted/10 opacity-40'}
                                    ${isToday ? 'ring-2 ring-inset ring-primary shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.05)]' : ''}
                                    hover:bg-primary/5
                                `}
                            >
                                <div className="flex items-center justify-between mb-2 md:mb-4 shrink-0">
                                    <div className="flex flex-col">
                                        <span className={`text-base md:text-lg font-black ${!isCurrentMonth && view === 'month' ? 'text-muted-foreground/40' : isToday ? 'text-primary' : ''}`}>
                                            {format(day, 'd')}
                                        </span>
                                        {view === 'day' && (
                                            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                {format(day, 'EEEE', { locale })}
                                            </span>
                                        )}
                                    </div>
                                    {event && (
                                        <div
                                            className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)] border-2 border-white dark:border-slate-800 shrink-0"
                                            style={{ backgroundColor: event.tipo_culto?.color || '#888' }}
                                        />
                                    )}
                                </div>

                                {event ? (
                                    <Link href={`/dashboard/cultos/${event.id}`} className="flex-1 min-h-0">
                                        <div className={`
                                            h-full p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] transition-all cursor-pointer border shadow-md flex flex-col items-center justify-between text-center overflow-hidden
                                            ${status === 'complete'
                                                ? (isDark ? 'bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-900/30' : 'bg-[#f0fdf4] border-emerald-200/60 hover:bg-[#dcfce7] shadow-lg shadow-emerald-200/10')
                                                : event.es_laborable_festivo 
                                                    ? (isDark ? 'bg-amber-900/20 border-amber-500/30 hover:bg-amber-900/30' : 'bg-[#fffbeb] border-amber-200/50 hover:bg-[#fff7d1] shadow-lg shadow-amber-200/10')
                                                    : (isDark ? 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60' : 'bg-white border-gray-100 hover:bg-gray-50')
                                            }
                                            ${view === 'day' ? 'max-w-2xl mx-auto' : ''}
                                        `}>
                                            {/* Cabecera: Nombre del Culto */}
                                            <div className="w-full">
                                                <p className={`text-[9px] md:text-[11px] font-black uppercase tracking-tight leading-tight mb-2 ${
                                                    status === 'complete' ? 'text-emerald-900 dark:text-emerald-100' : 
                                                    event.es_laborable_festivo ? 'text-amber-900 dark:text-amber-100' : ''
                                                }`}>
                                                    {event.tipo_culto?.nombre}
                                                </p>
                                                
                                                <div className={`
                                                    mx-auto text-[7px] md:text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full inline-flex items-center gap-1 shadow-xs border
                                                    ${status === 'complete' 
                                                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' 
                                                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/20'}
                                                `}>
                                                    {status === 'complete' ? <CheckCircle size={8} className="md:w-[10px] md:h-[10px]" /> : <Clock size={8} className="md:w-[10px] md:h-[10px]" />}
                                                    <span>{status === 'complete' ? t('calendar.status.complete') : t('calendar.status.pending')}</span>
                                                </div>
                                            </div>

                                            {/* Pie: Hora y Festivo */}
                                            <div className="w-full space-y-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                                                <div className={`flex items-center justify-center gap-1.5 text-[9px] md:text-[10px] font-bold ${
                                                    status === 'complete' ? 'text-emerald-800/70 dark:text-emerald-200/70' :
                                                    event.es_laborable_festivo ? 'text-amber-800/70 dark:text-amber-200/70' : 
                                                    'text-muted-foreground'
                                                }`}>
                                                    <Clock size={10} className="md:w-[12px] md:h-[12px] opacity-60" />
                                                    {event.hora_inicio.slice(0, 5)}
                                                </div>
                                                {event.es_laborable_festivo && (
                                                    <div className="mx-auto flex items-center justify-center gap-1 text-amber-700 dark:text-amber-300 text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/10">
                                                        <AlertCircle size={10} />
                                                        <span>Festivo</span>
                                                    </div>
                                                )}
                                            </div>

                                            {view === 'day' && (
                                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50 shrink-0">
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
                        key={`${view}-${currentDate.getTime()}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        {Array.from(eventsMap.values())
                            .filter(e => {
                                const eventDate = new Date(e.fecha)
                                if (view === 'month') return isSameMonth(eventDate, currentDate)
                                if (view === 'week') return isSameWeek(eventDate, currentDate, { weekStartsOn: 1 })
                                if (view === 'day') return isSameDay(eventDate, currentDate)
                                return true
                            })
                            .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                            .map((event, idx) => {
                                const status = getCultoStatus(event)
                                return (
                                    <Link href={`/dashboard/cultos/${event.id}`} key={event.id}>
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="glass rounded-[2rem] p-4 flex items-center gap-4 border border-white/20 active:scale-[0.98] transition-all shadow-xl shadow-black/5"
                                        >
                                            <div className="flex flex-col items-center justify-center bg-primary/10 rounded-2xl w-14 h-14 shrink-0 border border-primary/20">
                                                <span className="text-[9px] font-black text-primary/60 uppercase tracking-tighter leading-none mb-0.5">
                                                    {format(new Date(event.fecha), 'MMM', { locale })}
                                                </span>
                                                <span className="text-xl font-black text-primary tracking-tighter leading-none">
                                                    {format(new Date(event.fecha), 'd')}
                                                </span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <h3 className="font-black text-sm uppercase tracking-tight leading-tight break-words flex-1">
                                                        {event.tipo_culto?.nombre}
                                                    </h3>
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                                        style={{ backgroundColor: event.tipo_culto?.color || '#888' }}
                                                    />
                                                </div>
                                                <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                                                    <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                                                        <Clock size={12} className="text-primary/60" />
                                                        {event.hora_inicio.slice(0, 5)}
                                                        {event.es_laborable_festivo && <AlertCircle size={12} className="text-amber-500" />}
                                                    </p>
                                                    <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${status === 'complete' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                        {status === 'complete' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                        {status === 'complete' ? t('calendar.status.complete') : t('calendar.status.pending')}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-2 bg-muted/30 rounded-xl shrink-0">
                                                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                                            </div>
                                        </motion.div>
                                    </Link>
                                )
                            })}

                        {Array.from(eventsMap.values()).filter(e => {
                            const eventDate = new Date(e.fecha)
                            if (view === 'month') return isSameMonth(eventDate, currentDate)
                            if (view === 'week') return isSameWeek(eventDate, currentDate, { weekStartsOn: 1 })
                            if (view === 'day') return isSameDay(eventDate, currentDate)
                            return true
                        }).length === 0 && (
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
