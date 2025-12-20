'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    getDay,
    startOfWeek,
    endOfWeek
} from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

import { getCultoStatus } from '@/lib/utils/culto-helpers'

import { CalendarEvent } from '@/types/database'

interface CalendarProps {
    events: CalendarEvent[]
    onMonthChange?: (year: number, month: number) => void
}

export default function Calendar({ events, onMonthChange }: CalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [view, setView] = useState<'month' | 'week' | 'day'>('month')

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const eventsMap = new Map(events.map(e => [e.fecha, e]))

    const handlePrevMonth = () => {
        const newDate = subMonths(currentDate, 1)
        setCurrentDate(newDate)
        onMonthChange?.(newDate.getFullYear(), newDate.getMonth())
    }

    const handleNextMonth = () => {
        const newDate = addMonths(currentDate, 1)
        setCurrentDate(newDate)
        onMonthChange?.(newDate.getFullYear(), newDate.getMonth())
    }

    const handleToday = () => {
        const today = new Date()
        setCurrentDate(today)
        onMonthChange?.(today.getFullYear(), today.getMonth())
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">
                        {format(currentDate, 'MMMM yyyy', { locale: es })}
                    </h2>
                    <button
                        onClick={handleToday}
                        className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Hoy
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid (Desktop) */}
            <div className="hidden md:block glass rounded-2xl p-4">
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                        <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd')
                        const event = eventsMap.get(dateStr)
                        const isToday = isSameDay(day, new Date())
                        const isCurrentMonth = isSameMonth(day, currentDate)
                        const status = event ? getCultoStatus(event) : null

                        return (
                            <div
                                key={dateStr}
                                className={`
                  min-h-[100px] p-2 rounded-xl border transition-all
                  ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                  ${isToday ? 'border-primary border-2' : 'border-border'}
                  ${event ? 'hover:shadow-lg cursor-pointer' : ''}
                `}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-sm font-medium ${!isCurrentMonth ? 'text-muted-foreground' : ''}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {event && (
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: event.tipo_culto?.color || '#888' }}
                                        />
                                    )}
                                </div>

                                {event && (
                                    <Link href={`/dashboard/cultos/${event.id}`}>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold truncate">
                                                {event.tipo_culto?.nombre}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {event.hora_inicio}
                                                {event.es_laborable_festivo && ' ⚠️'}
                                            </p>
                                            <div className={`
                        text-xs px-1.5 py-0.5 rounded inline-block
                        ${status === 'complete' ? 'bg-green-500/20 text-green-700 dark:text-green-300' : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'}
                      `}>
                                                {status === 'complete' ? '✓ Completo' : '○ Pendiente'}
                                            </div>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Calendar List (Mobile) */}
            <div className="md:hidden space-y-3">
                {events
                    .filter(e => isSameMonth(new Date(e.fecha), currentDate))
                    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                    .map(event => {
                        const status = getCultoStatus(event)
                        return (
                            <Link href={`/dashboard/cultos/${event.id}`} key={event.id}>
                                <div className="glass rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col items-center justify-center bg-muted/50 rounded-lg p-2 min-w-[60px]">
                                        <span className="text-xs font-bold text-muted-foreground uppercase">{format(new Date(event.fecha), 'MMM', { locale: es })}</span>
                                        <span className="text-xl font-bold">{format(new Date(event.fecha), 'd')}</span>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-bold text-lg">{event.tipo_culto?.nombre}</h3>
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: event.tipo_culto?.color || '#888' }}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            {event.hora_inicio} {event.es_laborable_festivo && '⚠️'}
                                            <span className="text-border">|</span>
                                            <span className={`${status === 'complete' ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {status === 'complete' ? 'Completo' : 'Pendiente'}
                                            </span>
                                        </p>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </Link>
                        )
                    })}

                {events.filter(e => isSameMonth(new Date(e.fecha), currentDate)).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground glass rounded-xl">
                        No hay cultos programados para este mes.
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Estudio Bíblico</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Alabanza</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span>Enseñanza</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Laborable festivo (1h antes)</span>
                </div>
            </div>
        </div>
    )
}
