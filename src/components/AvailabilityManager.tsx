'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Check, X, ChevronDown, ChevronUp, Clock, Info } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface Availability {
    [key: string]: {
        intro?: boolean
        finalization?: boolean
        teaching?: boolean
        testimonies?: boolean
    }
}

interface AvailabilityManagerProps {
    value?: Availability
    onChange: (newValue: Availability) => void
    isDark?: boolean
}

const DAYS = [
    { key: 1, label: 'Lunes' }, // 1 = Monday
    { key: 3, label: 'Miércoles' }, // 3 = Wednesday
    { key: 5, label: 'Viernes' }, // 5 = Friday
    { key: 0, label: 'Domingo' } // 0 = Sunday
]

const ASSIGNMENTS = [
    { key: 'intro', label: 'Introducción' },
    { key: 'finalization', label: 'Finalización' },
    { key: 'teaching', label: 'Enseñanza' },
    { key: 'testimonies', label: 'Testimonios' },
]

export default function AvailabilityManager({ value = {}, onChange, isDark }: AvailabilityManagerProps) {
    const { t } = useI18n()
    const [expandedDay, setExpandedDay] = useState<number | null>(null)

    const toggleAvailability = (day: number, type: string) => {
        const currentDay = value[day] || {}
        const newValue = {
            ...value,
            [day]: {
                ...currentDay,
                [type]: !currentDay[type as keyof typeof currentDay]
            }
        }
        onChange(newValue)
    }

    const toggleAllDay = (day: number) => {
        const currentDay = value[day] || {}
        const allActive = ASSIGNMENTS.every(a => currentDay[a.key as keyof typeof currentDay])

        const newValue = {
            ...value,
            [day]: {
                intro: !allActive,
                finalization: !allActive,
                teaching: !allActive,
                testimonies: !allActive
            }
        }
        onChange(newValue)
    }

    // Helper to count active slots for a day
    const getActiveCount = (day: number) => {
        const currentDay = value[day] || {}
        return Object.values(currentDay).filter(Boolean).length
    }

    return (
        <Card className="rounded-[2.5rem] border-none shadow-xl glass">
            <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <Clock className="w-5 h-5 text-emerald-500" />
                        </div>
                        Disponibilidad
                    </h3>
                    <div className="px-3 py-1 rounded-full bg-muted/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Gestión Semanal
                    </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-bold text-emerald-600 block mb-1">¿Cómo funciona?</span>
                        Marca los días y roles en los que puedes servir. Si estás ocupado (trabajo, viaje, etc), desmarca la casilla correspondiente para avisar al administrador.
                    </p>
                </div>

                <div className="space-y-4">
                    {DAYS.map((day) => {
                        const activeCount = getActiveCount(day.key)
                        const isExpanded = expandedDay === day.key

                        return (
                            <div key={day.key} className={cn(
                                "rounded-3xl border transition-all duration-300 overflow-hidden",
                                isExpanded
                                    ? "bg-muted/10 border-primary/20 shadow-lg"
                                    : "bg-muted/5 border-transparent hover:bg-muted/10 hover:border-border/50"
                            )}>
                                {/* Header del Día */}
                                <div
                                    onClick={() => setExpandedDay(isExpanded ? null : day.key)}
                                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all",
                                            activeCount > 0
                                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                                : "bg-muted text-muted-foreground"
                                        )}>
                                            {day.label.substring(0, 1)}
                                        </div>
                                        <div>
                                            <p className="font-black text-lg uppercase tracking-tight">{day.label}</p>
                                            <p className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider",
                                                activeCount > 0 ? "text-emerald-500" : "text-muted-foreground"
                                            )}>
                                                {activeCount === 0 ? 'No disponible' : activeCount === 4 ? 'Disponibilidad total' : `${activeCount} roles disponibles`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                        isExpanded ? "bg-primary/10 text-primary rotate-180" : "bg-transparent text-muted-foreground"
                                    )}>
                                        <ChevronDown className="w-5 h-5" />
                                    </div>
                                </div>

                                {/* Contenido Expandible */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="p-4 pt-0 space-y-3">
                                                <div className="h-px w-full bg-border/50 mb-4" />

                                                <div className="grid grid-cols-2 gap-3">
                                                    {ASSIGNMENTS.map((assignment) => {
                                                        const isSelected = value[day.key]?.[assignment.key as keyof typeof value[number]]

                                                        return (
                                                            <button
                                                                key={assignment.key}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    toggleAvailability(day.key, assignment.key)
                                                                }}
                                                                className={cn(
                                                                    "relative overflow-hidden p-3 rounded-2xl border-2 text-left transition-all duration-200 group",
                                                                    isSelected
                                                                        ? "bg-primary border-primary shadow-md shadow-primary/20"
                                                                        : "bg-muted/20 border-transparent hover:border-border"
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between relative z-10">
                                                                    <span className={cn(
                                                                        "text-xs font-black uppercase tracking-tight",
                                                                        isSelected ? "text-white" : "text-muted-foreground"
                                                                    )}>
                                                                        {assignment.label}
                                                                    </span>
                                                                    <div className={cn(
                                                                        "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                                                                        isSelected ? "bg-white text-primary" : "bg-muted text-muted-foreground/50"
                                                                    )}>
                                                                        {isSelected ? <Check className="w-3 h-3 stroke-[4]" /> : <X className="w-3 h-3" />}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        )
                                                    })}
                                                </div>

                                                <div className="pt-2 flex justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            toggleAllDay(day.key)
                                                        }}
                                                        className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
                                                    >
                                                        {activeCount === 4 ? 'Desmarcar todo' : 'Marcar todo'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
