'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, Check, X, ChevronDown, ChevronUp, Clock, Info, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getDay, parseISO } from 'date-fns'
import { es, ca } from 'date-fns/locale'

interface AssignmentAvailability {
    intro?: boolean
    finalization?: boolean
    teaching?: boolean
    testimonies?: boolean
}

interface AvailabilityData {
    template?: Record<string, AssignmentAvailability>
    exceptions?: Record<string, AssignmentAvailability>
}

interface AvailabilityManagerProps {
    value?: AvailabilityData
    onChange: (newValue: AvailabilityData) => void
    isDark?: boolean
}

// Días de la semana para el Template (0=Domingo, 1=Lunes...)
const TEMPLATE_DAYS = [
    { key: '1', label: 'Lunes' },
    { key: '2', label: 'Martes' },
    { key: '3', label: 'Miércoles' },
    { key: '4', label: 'Jueves' },
    { key: '5', label: 'Viernes' },
    { key: '6', label: 'Sábado' },
    { key: '0', label: 'Domingo' }
]

const ASSIGNMENTS = [
    { key: 'intro', label: 'Intro' },
    { key: 'finalization', label: 'Fin' },
    { key: 'teaching', label: 'Ens' },
    { key: 'testimonies', label: 'Test' },
]

export default function AvailabilityManager({ value = {}, onChange, isDark }: AvailabilityManagerProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es

    const [mode, setMode] = useState<'calendar' | 'template'>('calendar')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [expandedDay, setExpandedDay] = useState<string | null>(null)
    const [cultosMap, setCultosMap] = useState<Record<string, any>>({})
    const [isLoadingParams, setIsLoadingParams] = useState(false)

    // Fetch cultos context
    const fetchCultos = async (date: Date) => {
        setIsLoadingParams(true)
        const start = format(startOfWeek(date, { locale, weekStartsOn: 1 }), 'yyyy-MM-dd')
        const end = format(endOfWeek(date, { locale, weekStartsOn: 1 }), 'yyyy-MM-dd')

        try {
            // Import dynamic execution to avoid build issues if file structure varies, 
            // but standard import is better. 
            // Assuming getCultosForRange is available via absolute import or passed prop.
            // Since we can't easily add import to top, we use dynamic import here as a safe patch pattern for this specific tool usage context
            const { getCultosForRange } = await import('@/app/dashboard/cultos/actions')

            const { success, data } = await getCultosForRange(start, end)
            if (success && data) {
                const map: Record<string, any> = {}
                data.forEach((c: any) => map[c.fecha] = c)
                setCultosMap(map)
            }
        } catch (e) {
            console.error("Failed to fetch cultos context", e)
        } finally {
            setIsLoadingParams(false)
        }
    }

    // Effect for mounting and date changes
    useState(() => {
        fetchCultos(currentDate)
    })

    const handleWeekChange = (newDate: Date) => {
        setCurrentDate(newDate)
        fetchCultos(newDate)
    }

    // --- Helpers ---

    const getTemplateAvailability = (dayIndex: number): AssignmentAvailability => {
        return value.template?.[dayIndex.toString()] || {}
    }

    const getExceptionAvailability = (dateStr: string): AssignmentAvailability | undefined => {
        return value.exceptions?.[dateStr]
    }

    const getEffectiveAvailability = (date: Date): AssignmentAvailability => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const exception = getExceptionAvailability(dateStr)
        if (exception) return exception
        return getTemplateAvailability(getDay(date))
    }

    const updateTemplate = (dayIndex: string, type: keyof AssignmentAvailability) => {
        const current = value.template?.[dayIndex] || {}
        const newTemplate = {
            ...value.template,
            [dayIndex]: {
                ...current,
                [type]: !current[type]
            }
        }
        onChange({ ...value, template: newTemplate })
    }

    const updateException = (date: Date, type: keyof AssignmentAvailability) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const currentEffective = getEffectiveAvailability(date)

        // Toggle the specific type
        const newAvailability = {
            ...currentEffective,
            [type]: !currentEffective[type]
        }

        const newExceptions = {
            ...value.exceptions,
            [dateStr]: newAvailability
        }

        // Clean up if it matches template to save space? 
        // For now, explicit exception is better for clarity.

        onChange({ ...value, exceptions: newExceptions })
    }

    // --- Calendar Navigation ---

    const weekStart = startOfWeek(currentDate, { locale, weekStartsOn: 1 }) // Monday start
    const weekEnd = endOfWeek(currentDate, { locale, weekStartsOn: 1 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
        .filter(d => {
            const day = getDay(d)
            const dateStr = format(d, 'yyyy-MM-dd')
            const isToday = isSameDay(d, new Date())
            const hasCulto = !!cultosMap[dateStr]

            // Show if it's a standard day, OR today, OR has a scheduled culto (exception/holiday)
            return (day === 1 || day === 3 || day === 5 || day === 0) || isToday || hasCulto
        })

    const nextWeek = () => handleWeekChange(addWeeks(currentDate, 1))
    const prevWeek = () => handleWeekChange(subWeeks(currentDate, 1))
    const goToToday = () => handleWeekChange(new Date())

    return (
        <Card className="rounded-[2.5rem] border-none shadow-xl glass overflow-hidden">
            <CardContent className="p-0">
                {/* Header / Tabs */}
                <div className="bg-muted/30 border-b border-border/50 p-2 flex gap-2">
                    <button
                        onClick={() => setMode('calendar')}
                        className={cn(
                            "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            mode === 'calendar'
                                ? "bg-white dark:bg-zinc-800 shadow-md text-primary"
                                : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/5"
                        )}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Calendario
                    </button>
                    <button
                        onClick={() => setMode('template')}
                        className={cn(
                            "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            mode === 'template'
                                ? "bg-white dark:bg-zinc-800 shadow-md text-amber-500"
                                : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/5"
                        )}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Patrón Habitual
                    </button>
                </div>
                <div className="bg-muted/30 border-b border-border/50 p-2 flex gap-2">
                    <button
                        onClick={() => {
                            toast.success(t('availability.confirmed'), {
                                description: "Tu disponibilidad para esta semana ha sido registrada."
                            })
                        }}
                        className="w-full py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all mb-2 flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Confirmar Semana
                    </button>
                </div>


                <div className="p-6">
                    {mode === 'template' ? (
                        <div className="space-y-6">
                            <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    <span className="font-bold text-amber-600 block mb-1">Define tu Rutina</span>
                                    Configura los días que <strong>normalmente</strong> estás disponible. Esto servirá de base para el calendario.
                                </p>
                            </div>

                            <div className="grid gap-3">
                                {TEMPLATE_DAYS.map(day => {
                                    const availability = getTemplateAvailability(parseInt(day.key))
                                    const isActive = Object.values(availability).some(Boolean)

                                    return (
                                        <div key={day.key} className="rounded-2xl border border-border/50 overflow-hidden">
                                            <div className="flex items-stretch min-h-16">
                                                {/* Day Label */}
                                                <div className={cn(
                                                    "w-24 bg-muted/30 flex items-center justify-center border-r border-border/50",
                                                    isActive && "bg-amber-500/10 text-amber-600"
                                                )}>
                                                    <span className="font-black uppercase text-sm tracking-tight">{day.label}</span>
                                                </div>

                                                {/* Toggles */}
                                                <div className="flex-1 p-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
                                                    {ASSIGNMENTS.map(assignment => {
                                                        const isSelected = availability[assignment.key as keyof AssignmentAvailability]

                                                        // Static configuration for 'Standard Pattern'
                                                        // Mon-Sat: Intro/Finalization (Noches de Culto)
                                                        // Sun: Intro/Teaching/Testimonies (Escuela Dominical - No Finalization)
                                                        const validAssignments = {
                                                            '1': ['intro', 'finalization'],
                                                            '2': ['intro', 'finalization'],
                                                            '3': ['intro', 'finalization'],
                                                            '4': ['intro', 'finalization'],
                                                            '5': ['intro', 'finalization'],
                                                            '6': ['intro', 'finalization'],
                                                            '0': ['intro', 'teaching', 'testimonies']
                                                        }

                                                        const isValidForDay = validAssignments[day.key as keyof typeof validAssignments]?.includes(assignment.key)

                                                        if (!isValidForDay) {
                                                            return (
                                                                <div key={assignment.key} className="flex-1 h-10 rounded-xl bg-muted/20 border border-transparent flex items-center justify-center opacity-30 cursor-not-allowed min-w-18">
                                                                    <span className="text-[8px] font-black uppercase text-muted-foreground scale-75 opacity-50">N/A</span>
                                                                </div>
                                                            )
                                                        }

                                                        return (
                                                            <button
                                                                key={assignment.key}
                                                                onClick={() => updateTemplate(day.key, assignment.key as keyof AssignmentAvailability)}
                                                                className={cn(
                                                                    "flex-1 h-10 rounded-xl border flex items-center justify-center gap-1.5 transition-all min-w-18",
                                                                    isSelected
                                                                        ? "bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/20"
                                                                        : "bg-transparent border-transparent hover:bg-muted"
                                                                )}
                                                            >
                                                                <span className="text-[10px] font-black uppercase">{assignment.label}</span>
                                                                {isSelected && <Check className="w-3 h-3 stroke-4" />}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {weekDays.map(date => {
                                const dateStr = format(date, 'yyyy-MM-dd')
                                const dayName = format(date, 'EEEE', { locale })
                                const dayNum = format(date, 'd', { locale })
                                const availability = getEffectiveAvailability(date)
                                const isException = !!getExceptionAvailability(dateStr)
                                const isActive = Object.values(availability).some(Boolean)

                                // Get Culto info for this date
                                const cultoInfo = cultosMap[dateStr]
                                const hasCulto = !!cultoInfo

                                // Filter out days without cultos in the real calendar?
                                // User requirement: "si yo en mi disppnibilidad digo q solo puedo la semana q viene..."
                                // "que veo q no esta sincronizado con el calendario por que veo q pne lunes 'intro,'fin''enseñanza''testimonios, y asi toda la semana"
                                // So yes, hide if no culto or hide irrelevant toggles.

                                if (!hasCulto && !isLoadingParams) {
                                    return (
                                        <div key={dateStr} className="rounded-2xl border border-border/50 bg-muted/20 opacity-50 p-4 flex items-center justify-between min-h-18">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{dayName.substring(0, 3)} {dayNum}</span>
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground/50">Sin Actividad</span>
                                            </div>
                                        </div>
                                    )
                                }

                                return (
                                    <div key={dateStr} className={cn(
                                        "rounded-2xl border border-border/50 overflow-hidden transition-all",
                                        isException ? "ring-2 ring-emerald-500/30 border-emerald-500/50" : ""
                                    )}>
                                        <div className="flex items-stretch min-h-18">
                                            {/* Date Label */}
                                            <div className={cn(
                                                "w-20 bg-muted/30 flex flex-col items-center justify-center border-r border-border/50 gap-0.5",
                                                isSameDay(date, new Date()) && "bg-blue-500/10 text-blue-600",
                                                isActive && !isSameDay(date, new Date()) && "bg-emerald-500/5 text-emerald-600"
                                            )}>
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{dayName.substring(0, 3)}</span>
                                                <span className="text-xl font-black">{dayNum}</span>
                                                {isException && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-2 left-2" />
                                                )}
                                            </div>

                                            {/* Toggles */}
                                            <div className="flex-1 p-2 grid grid-cols-4 gap-1.5 items-center">
                                                {ASSIGNMENTS.map(assignment => {
                                                    const isSelected = availability[assignment.key as keyof AssignmentAvailability]

                                                    // Check if this assignment exists in the culto type
                                                    // Fallback to true if loading or map not ready, to avoid flash of disabled state? 
                                                    // No, default to false/loading state is better.

                                                    const typeKey = assignment.key === 'intro' ? 'tiene_lectura_introduccion' :
                                                        assignment.key === 'finalization' ? 'tiene_lectura_finalizacion' :
                                                            assignment.key === 'teaching' ? 'tiene_ensenanza' :
                                                                assignment.key === 'testimonies' ? 'tiene_testimonios' : null;

                                                    const isAvailableInCulto = cultoInfo ? (typeKey && cultoInfo.tipo_culto?.[typeKey]) : false

                                                    if (!isAvailableInCulto) {
                                                        return <div key={assignment.key} className="h-full rounded-xl bg-muted/20 border border-transparent flex items-center justify-center opacity-30 cursor-not-allowed">
                                                            <span className="text-[8px] font-black uppercase text-muted-foreground scale-75 opacity-50">N/A</span>
                                                        </div>
                                                    }

                                                    return (
                                                        <button
                                                            key={assignment.key}
                                                            onClick={() => updateException(date, assignment.key as keyof AssignmentAvailability)}
                                                            className={cn(
                                                                "flex flex-col items-center justify-center h-full rounded-xl border transition-all",
                                                                isSelected
                                                                    ? "bg-emerald-500 border-emerald-600 text-white shadow-sm"
                                                                    : "bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground/50 hover:text-muted-foreground"
                                                            )}
                                                        >
                                                            <span className="text-[9px] font-black uppercase">{assignment.label}</span>
                                                            <div className={cn(
                                                                "w-1.5 h-1.5 rounded-full mt-1",
                                                                isSelected ? "bg-white" : "bg-border"
                                                            )} />
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card >
    )
}
