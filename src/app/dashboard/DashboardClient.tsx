/**
 * DashboardClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente principal con Diseño Premium.
 * 
 * @author Antigravity AI
 */

'use client'

import { useState } from 'react'
import { Calendar, BookOpen, Users, Clock, UserIcon, ChevronRight, ChevronLeft, MapPin, Plus, Music, Bell } from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, getHours } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { TranslationKey } from '@/lib/i18n/translations'
import { Culto, Profile } from '@/types/database'
import { getUserAssignments } from './cultos/actions'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { NotificationPrompt } from '@/components/NotificationPrompt'

// --- Sub-componentes ---

function UserAvatar({ usuario, size = 'md' }: { usuario: Partial<Profile> | null | undefined, size?: 'sm' | 'md' | 'lg' | 'xl' }) {
    if (!usuario) return null

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-base',
        lg: 'w-16 h-16 text-lg',
        xl: 'w-20 h-20 text-xl'
    }

    const initials = `${usuario.nombre?.[0] || ''}${usuario.apellidos?.[0] || ''}`.toUpperCase()

    return (
        <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden shadow-sm ring-2 ring-white/20 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold`}>
            {usuario.avatar_url ? (
                <Image
                    src={usuario.avatar_url}
                    alt={initials}
                    fill
                    className="object-cover"
                />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    )
}

function AssignmentPill({ label, usuario, lectura, himnario, tipoCulto }: { label: string, usuario: Partial<Profile> | null | undefined, lectura?: any, himnario?: any[], tipoCulto?: string }) {
    const { t } = useI18n()
    if (!usuario && !lectura && (!himnario || himnario.length === 0)) return null

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const hasHimnos = himnario?.some(item => item.tipo === 'himno')
    const hasCoros = himnario?.some(item => item.tipo === 'coro')
    const totalSeconds = himnario?.reduce((acc, item) => acc + (item.himno?.duracion_segundos || item.coro?.duracion_segundos || 0), 0) || 0

    const tiempoLabel = () => {
        if (hasHimnos && hasCoros) return t('dashboard.himnario.totalTime')
        if (hasHimnos) return t('dashboard.himnario.totalTimeHymns')
        if (hasCoros) return t('dashboard.himnario.totalTimeChoruses')
        return ""
    }

    const himnarioTitle = tipoCulto?.toLowerCase().includes('enseñanza') || tipoCulto?.toLowerCase().includes('ensenanza')
        ? t('dashboard.himnario.timeEnsenanza')
        : t('dashboard.himnario.timeAlabanza')

    const hasExtraContent = lectura || (himnario && himnario.length > 0)

    return (
        <div className={`flex flex-col p-4 bg-white/50 dark:bg-black/20 rounded-3xl border border-black/5 dark:border-white/5 backdrop-blur-sm transition-all shadow-sm ${hasExtraContent ? 'gap-3 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30' : 'flex-row items-center gap-3'}`}>
            {usuario ? (
                <div className={`flex items-center gap-3 w-full ${hasExtraContent ? 'border-b border-black/5 dark:border-white/5 pb-2.5' : ''}`}>
                    <UserAvatar usuario={usuario} size="md" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-blue-600 dark:text-blue-300 font-black uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="font-bold text-sm truncate text-slate-800 dark:text-slate-100">
                            {usuario.nombre} {usuario.apellidos?.split(' ')[0]}
                        </p>
                    </div>
                </div>
            ) : (
                <div className={`flex items-center gap-3 w-full ${hasExtraContent ? 'border-b border-black/5 dark:border-white/5 pb-2.5' : ''}`}>
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold border-2 border-dashed border-slate-300 dark:border-slate-700 shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-blue-600 dark:text-blue-300 font-black uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="font-bold text-sm truncate text-slate-400 italic">
                            {t('dashboard.himnario.unassigned')}
                        </p>
                    </div>
                </div>
            )}

            {/* Lectura integrada */}
            {lectura && (
                <div className="flex items-center gap-3 p-3.5 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/60 dark:border-white/10 shadow-sm relative group w-full min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 text-white border border-white/20">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <div className="flex items-center flex-wrap gap-1.5 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">{t('dashboard.himnario.reading')}</span>
                            <div className="w-1 h-1 rounded-full bg-blue-300 hidden xs:block" />
                            <div className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{t('dashboard.himnario.registered')}</span>
                            </div>
                        </div>
                        <p className="font-black text-[13px] sm:text-sm text-slate-800 dark:text-slate-100 leading-tight truncate">
                            {lectura.libro} {lectura.capitulo_inicio}:{lectura.versiculo_inicio}
                            {(lectura.capitulo_fin !== lectura.capitulo_inicio || lectura.versiculo_fin !== lectura.versiculo_inicio) && (
                                <>
                                    {' - '}
                                    {lectura.capitulo_fin === lectura.capitulo_inicio
                                        ? lectura.versiculo_fin
                                        : `${lectura.capitulo_fin}:${lectura.versiculo_fin}`}
                                </>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Himnario integrado */}
            {himnario && himnario.length > 0 && (
                <div className={`flex flex-col gap-4 p-4 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/60 dark:border-white/10 shadow-sm relative w-full ${lectura ? 'mt-1' : ''}`}>
                    {/* Header del Himnario - Ahora más integrado */}
                    <div className="flex items-center gap-3 pb-3 border-b border-black/5 dark:border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 text-white">
                            <Music className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 leading-none">{himnarioTitle}</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tight">{himnario.length} {t('dashboard.himnario.pieces')}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {himnario.map((item, idx) => {
                            const details = item.tipo === 'himno' ? item.himno : item.coro
                            if (!details) return null
                            return (
                                <div key={idx} className="flex flex-col gap-2 group/item p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl transition-all">
                                    <div className="flex items-center gap-3 min-w-0 w-full">
                                        {/* Número redondo y limpio */}
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shadow-sm ${item.tipo === 'himno' ? 'bg-indigo-500 text-white' : 'bg-purple-500 text-white'}`}>
                                            {details.numero}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${item.tipo === 'himno' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/30' : 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800/30'}`}>
                                                    {item.tipo}
                                                </span>
                                            </div>
                                            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                                                {details.titulo}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Duración debajo del título */}
                                    <div className="flex items-center gap-1.5 ml-11 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-black/5 dark:border-white/10 shadow-sm w-fit">
                                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                        <span className="font-mono text-[11px] font-black text-slate-600 dark:text-slate-300">
                                            {formatDuration(details.duracion_segundos)}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Pie inteligente Flotante */}
                    <div className="flex items-center justify-center mt-3 pt-4 border-t border-indigo-500/10 dark:border-indigo-400/10">
                        <div className="px-5 py-2.5 bg-slate-900 dark:bg-white rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center gap-3 border border-white/10 dark:border-black/5 hover:scale-105 transition-transform cursor-default group/total">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 dark:bg-blue-100 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-blue-400 dark:text-blue-600 animate-pulse" />
                            </div>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[8px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1">
                                    {tiempoLabel()}
                                </span>
                                <span className="text-white dark:text-slate-900 font-mono text-sm font-black tracking-tighter">
                                    {formatDuration(totalSeconds)} <span className="text-[9px] opacity-60">min</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

interface DashboardClientProps {
    user: Profile & { id: string }
    culto: (Culto & { lecturas?: any[] }) | null
    esHoy: boolean
    lecturaData: { showAddButton: boolean; lecturaIntro: any; lecturaFinal: any } | null
    estudioBiblicoData: {
        esEstudio: boolean
        oracionInicio: boolean
        congregacionPie: boolean
        inicioAnticipado: { activo: boolean; minutos: number; horaReal: string; observaciones?: string } | null
    } | null
    observacionesData: string
    initialAssignments: Culto[]
    stats: {
        totalCultos: number
        totalLecturas: number
    }
}

export default function DashboardClient({ user, culto, esHoy, lecturaData, estudioBiblicoData, observacionesData, initialAssignments }: DashboardClientProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour >= 6 && hour < 12) return t('dashboard.greeting.morning')
        if (hour >= 12 && hour < 20) return t('dashboard.greeting.afternoon')
        return t('dashboard.greeting.night')
    }

    const greeting = getGreeting()

    const getTranslatedCultoName = (name: string | undefined) => {
        if (!name) return ''
        const lower = name.toLowerCase()
        if (lower.includes('estudio')) return t('culto.estudio')
        if (lower.includes('alabanza')) return t('culto.alabanza')
        if (lower.includes('enseñanza') || lower.includes('ensenanza')) return t('culto.ensenanza')
        if (lower.includes('testimonios')) return t('culto.testimonios')
        return name
    }

    // State for assignments navigation
    const [assignments, setAssignments] = useState<Culto[]>(initialAssignments)
    const [currentWeekDate, setCurrentWeekDate] = useState(new Date())
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)

    // Handlers for assignments navigation
    const changeWeek = async (direction: 'prev' | 'next') => {
        setIsLoadingAssignments(true)
        const newDate = direction === 'next' ? addWeeks(currentWeekDate, 1) : subWeeks(currentWeekDate, 1)
        setCurrentWeekDate(newDate)

        const start = startOfWeek(newDate, { weekStartsOn: 1 })
        const end = endOfWeek(newDate, { weekStartsOn: 1 })

        try {
            const { data } = await getUserAssignments(
                user.id,
                format(start, 'yyyy-MM-dd'),
                format(end, 'yyyy-MM-dd')
            )
            if (data) setAssignments(data)
        } catch {
            toast.error(t('dashboard.toast.loadError'))
        } finally {
            setIsLoadingAssignments(false)
        }
    }

    const weekLabel = `${format(startOfWeek(currentWeekDate, { weekStartsOn: 1 }), 'd MMM', { locale })} - ${format(endOfWeek(currentWeekDate, { weekStartsOn: 1 }), 'd MMM', { locale })}`

    return (
        <div className="space-y-4 md:space-y-8 animate-fade-in-up pb-20">

            {/* 1. Header Premium (Adaptive) */}
            {/* Desktop Version */}
            <div className="hidden md:flex relative overflow-hidden glass rounded-4xl p-12 shadow-2xl border-white/20 bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-slate-800 items-center justify-between">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl lg:text-5xl font-black mb-4 text-slate-900 dark:text-white tracking-tighter">
                        <span>{greeting}</span> <span className="text-blue-600 dark:text-blue-400">{t('dashboard.greeting.brother')} {user.nombre}</span>
                    </h1>
                    <div className="flex items-center gap-3 text-slate-500 font-bold">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <span className="capitalize">{format(new Date(), 'PPPP', { locale })}</span>
                    </div>
                </motion.div>

                {/* Avatar Desktop con Link */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10"
                >
                    <Link href="/dashboard/profile">
                        <UserAvatar usuario={user} size="xl" />
                    </Link>
                </motion.div>
            </div>

            {/* Mobile Version (Compact Header) */}
            <div className="md:hidden flex items-center justify-between px-2 pt-2">
                <div className="min-w-0 flex-1 pr-4">
                    <h1 className="text-3xl xs:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                        {greeting}
                    </h1>
                    <p className="text-xs xs:text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest truncate">
                        {t('dashboard.greeting.brother')} {user.nombre}
                    </p>
                </div>
                <Link href="/dashboard/profile" className="shrink-0">
                    <UserAvatar usuario={user} size="md" />
                </Link>
            </div>

            {/* 2. Main Action Area: Next/Today Culto & Assignments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Culto Card (Takes 2 cols on Desktop) */}
                <div className="lg:col-span-2 space-y-6">
                    <AnimatePresence mode="wait">
                        {culto ? (
                            <motion.div
                                key={culto.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative group"
                            >
                                <div className="absolute inset-0 bg-blue-600/20 blur-2xl rounded-[2.5rem] transform group-hover:scale-105 transition-transform duration-500 -z-10" />
                                <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
                                    {/* Banner Superior */}
                                    <div className={`h-2 w-full`} style={{ backgroundColor: culto.tipo_culto?.color || '#3b82f6' }} />

                                    <CardContent className="p-6 md:p-8">
                                        {/* Badge de Estado */}
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${esHoy ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-blue-600 text-white shadow-blue-500/30'}`}>
                                                {esHoy ? t('dashboard.today') : t('dashboard.next')}
                                            </div>
                                            {!esHoy && (
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-slate-300 dark:text-slate-600 leading-none">
                                                        {format(new Date(culto.fecha), 'd', { locale })}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                        {format(new Date(culto.fecha), 'MMM', { locale })}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info Principal */}
                                        <div className="mb-8">
                                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">
                                                {getTranslatedCultoName(culto.tipo_culto?.nombre)}
                                            </h2>

                                            {/* Hora - con inicio anticipado si aplica */}
                                            <div className="flex items-center gap-2 text-slate-500 font-bold mb-4">
                                                <Clock className="w-5 h-5 text-blue-500" />
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {estudioBiblicoData?.inicioAnticipado ? (
                                                        <>
                                                            <span className="text-lg line-through opacity-50">{(culto.hora_inicio || '').slice(0, 5)}</span>
                                                            <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                                                                {estudioBiblicoData.inicioAnticipado.horaReal}
                                                            </span>
                                                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-black uppercase">
                                                                {estudioBiblicoData.inicioAnticipado.minutos} {t('dashboard.minBefore')}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-lg">{(culto.hora_inicio || '').slice(0, 5)}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Protocol Badges - Solo Estudio Bíblico */}
                                            {estudioBiblicoData?.esEstudio && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${estudioBiblicoData.oracionInicio
                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                                        }`}>
                                                        <span>🙏</span>
                                                        <span>{t('dashboard.oracion')}: {estudioBiblicoData.oracionInicio ? t('dashboard.yes') : t('dashboard.no')}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${estudioBiblicoData.congregacionPie
                                                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                                        }`}>
                                                        <span>🪑</span>
                                                        <span>{estudioBiblicoData.congregacionPie ? t('dashboard.standing') : t('dashboard.seated')}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Observaciones (Universal - para TODOS los cultos) */}
                                            {(() => {
                                                const obsContent = observacionesData?.trim()
                                                const hasObs = !!obsContent && obsContent.length > 0

                                                return (
                                                    <div className={`mt-3 p-3 rounded-xl border ${hasObs
                                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
                                                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
                                                        }`}>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${hasObs
                                                            ? 'text-amber-600 dark:text-amber-400'
                                                            : 'text-slate-400 dark:text-slate-500'
                                                            }`}>
                                                            📝 {t('dashboard.observaciones')}
                                                        </p>
                                                        <p className={`text-sm font-medium leading-snug ${hasObs
                                                            ? 'text-amber-800 dark:text-amber-200'
                                                            : 'text-slate-400 dark:text-slate-500 italic'
                                                            }`}>
                                                            {hasObs ? obsContent : t('dashboard.noObservaciones')}
                                                        </p>
                                                    </div>
                                                )
                                            })()}
                                        </div>

                                        {/* Distribución de Responsables (Diseño Premium Asimétrico) */}
                                        <div className="flex flex-col md:flex-row gap-6 mb-10 items-start">
                                            {/* Columna Principal: Introducción (Suele ser la más larga por el Himnario) */}
                                            {culto.tipo_culto?.tiene_lectura_introduccion && (
                                                <div className="w-full md:w-1/2 lg:w-[58%] shrink-0">
                                                    <AssignmentPill
                                                        label={t('cultos.intro')}
                                                        usuario={culto.usuario_intro}
                                                        lectura={lecturaData?.lecturaIntro}
                                                        himnario={(culto as any).plan_himnos_coros}
                                                        tipoCulto={culto.tipo_culto?.nombre}
                                                    />
                                                </div>
                                            )}

                                            {/* Columna Secundaria: El resto de asignaciones apiladas */}
                                            <div className="flex-1 w-full space-y-4">
                                                {culto.tipo_culto?.tiene_ensenanza && (
                                                    <AssignmentPill label={t('cultos.ensenanza')} usuario={culto.usuario_ensenanza} />
                                                )}
                                                {culto.tipo_culto?.tiene_testimonios && (
                                                    <AssignmentPill label={t('cultos.testimonios')} usuario={culto.usuario_testimonios} />
                                                )}
                                                {culto.tipo_culto?.tiene_lectura_finalizacion && (
                                                    <AssignmentPill
                                                        label={t('cultos.finalizacion')}
                                                        usuario={culto.usuario_finalizacion}
                                                        lectura={lecturaData?.lecturaFinal}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Lógica de Lectura y Botón de Acción (pre-computed on server) */}
                                        {lecturaData?.showAddButton ? (
                                            <Link href={`/dashboard/cultos/${culto.id}`} className="block w-full">
                                                <button className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 group relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                                    <Plus className="w-4 h-4" />
                                                    <span>{t('dashboard.addReading')}</span>
                                                </button>
                                            </Link>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* Lectura moved to AssignmentPill */}
                                                <Link href={`/dashboard/cultos/${culto.id}`} className="block w-full">
                                                    <button className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-lg">
                                                        {t('dashboard.viewFullDetails')}
                                                    </button>
                                                </Link>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <div className="glass rounded-[2.5rem] p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
                                <p className="text-slate-400 font-bold">{t('dashboard.noCultosScheduled')}</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: My Assignments (New Section) */}
                <div className="lg:col-span-1">
                    <Card className="h-full rounded-[2.5rem] border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <UserIcon className="w-4 h-4" />
                                {t('dashboard.myAssignments')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            {/* Week Navigation */}
                            <div className="flex items-center justify-between mb-6 bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                                <button onClick={() => changeWeek('prev')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all shadow-sm">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-bold uppercase tracking-wider">{weekLabel}</span>
                                <button onClick={() => changeWeek('next')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all shadow-sm">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Assignments List */}
                            <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                                {isLoadingAssignments ? (
                                    <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-blue-500 rounded-full border-t-transparent" /></div>
                                ) : assignments.length > 0 ? (
                                    assignments.map((asg) => {
                                        // Determine Role
                                        const roles = []
                                        if (asg.id_usuario_intro === user.id) roles.push(t('cultos.role.intro'))
                                        if (asg.id_usuario_ensenanza === user.id) roles.push(t('cultos.role.teaching'))
                                        if (asg.id_usuario_finalizacion === user.id) roles.push(t('cultos.role.final'))
                                        if (asg.id_usuario_testimonios === user.id) roles.push(t('cultos.role.testimonies'))

                                        return (
                                            <Link key={asg.id} href={`/dashboard/cultos/${asg.id}`}>
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-400 uppercase">{format(new Date(asg.fecha), 'EEE d', { locale })}</span>
                                                            <span className="font-black text-slate-800 dark:text-slate-100">{getTranslatedCultoName(asg.tipo_culto?.nombre)}</span>
                                                        </div>
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asg.tipo_culto?.color }} />
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {roles.map(r => (
                                                            <span key={r} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                                {r}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    })
                                ) : (
                                    <div className="text-center py-8 opacity-50">
                                        <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p className="text-xs font-medium">{t('dashboard.noAssignmentsWeek')}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 3. Quick Actions Grid (Restored & Improved) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickActionLink href="/dashboard/cultos" icon={<Calendar className="text-blue-500" />} title={t('dashboard.calendar')} />
                <QuickActionLink href="/dashboard/lecturas" icon={<BookOpen className="text-purple-500" />} title={t('dashboard.lecturas')} />
                <QuickActionLink href="/dashboard/festivos" icon={<MapPin className="text-amber-500" />} title={t('dashboard.festivos')} />
                <QuickActionLink href="/dashboard/hermanos" icon={<Users className="text-emerald-500" />} title={t('dashboard.hermanos')} />
            </div>

            <NotificationPrompt />
        </div>
    )
}

function QuickActionLink({ href, icon, title }: { href: string, icon: React.ReactNode, title: string }) {
    return (
        <Link href={href}>
            <motion.div
                whileTap={{ scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-3 text-center hover:shadow-xl transition-all"
            >
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">{icon}</div>
                <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{title}</span>
            </motion.div>
        </Link>
    )
}
