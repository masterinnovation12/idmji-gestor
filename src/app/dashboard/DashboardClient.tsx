/**
 * DashboardClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente principal con Diseño Premium.
 * 
 * @author Antigravity AI
 */

'use client'

import { useState } from 'react'
import { Calendar, BookOpen, Users, Clock, UserIcon, ChevronRight, ChevronLeft, MapPin } from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Culto, Profile } from '@/types/database'
import { getUserAssignments } from './cultos/actions'
import { toast } from 'sonner'
import NextImage from 'next/image'

// --- Sub-componentes ---

function UserAvatar({ usuario, size = 'md' }: { usuario: Partial<Profile> | null | undefined, size?: 'sm' | 'md' | 'lg' | 'xl' }) {
    if (!usuario) return null

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-base', // Increased from 10
        lg: 'w-16 h-16 text-lg',   // Increased from 14
        xl: 'w-20 h-20 text-xl'    // New extra large size
    }

    const initials = `${usuario.nombre?.[0] || ''}${usuario.apellidos?.[0] || ''}`.toUpperCase()

    return (
        <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden shadow-md ring-2 ring-white/20 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold`}>
            {usuario.avatar_url ? (
                <NextImage
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

function AssignmentPill({ label, usuario }: { label: string, usuario: Partial<Profile> | null | undefined }) {
    if (!usuario) return null
    return (
        <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-sm">
            <UserAvatar usuario={usuario} size="md" />
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-blue-600 dark:text-blue-300 font-black uppercase tracking-wider mb-0.5">{label}</p>
                <p className="font-bold text-sm truncate text-slate-800 dark:text-slate-100">
                    {usuario.nombre} {usuario.apellidos?.split(' ')[0]}
                </p>
            </div>
        </div>
    )
}

interface DashboardClientProps {
    user: Profile & { id: string }
    culto: Culto | null
    esHoy: boolean
    initialAssignments: Culto[]
    stats: {
        totalCultos: number
        totalLecturas: number
    }
}

export default function DashboardClient({ user, culto, esHoy, initialAssignments }: DashboardClientProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es

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
            toast.error("Error al cargar asignaciones")
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
                    <h1 className="text-5xl font-black mb-4 text-slate-900 dark:text-white tracking-tighter">
                        {t('dashboard.welcome')}, <span className="text-blue-600 dark:text-blue-400">{user.nombre}</span>
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
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Hola, {user.nombre}
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {format(new Date(), 'EEEE, d MMM', { locale })}
                    </p>
                </div>
                <Link href="/dashboard/profile">
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
                                                {esHoy ? 'CULTO DE HOY' : 'PRÓXIMO CULTO'}
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
                                                {culto.tipo_culto?.nombre}
                                            </h2>
                                            <div className="flex items-center gap-2 text-slate-500 font-bold mb-4">
                                                <Clock className="w-5 h-5 text-blue-500" />
                                                <span className="text-lg">{culto.hora_inicio.slice(0, 5)}</span>
                                            </div>
                                        </div>

                                        {/* Grid de Responsables (Compacto y Visual) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                                            {culto.tipo_culto?.tiene_lectura_introduccion && (
                                                <AssignmentPill label="Introducción" usuario={culto.usuario_intro} />
                                            )}
                                            {culto.tipo_culto?.tiene_ensenanza && (
                                                <AssignmentPill label="Enseñanza" usuario={culto.usuario_ensenanza} />
                                            )}
                                            {culto.tipo_culto?.tiene_lectura_finalizacion && (
                                                <AssignmentPill label="Finalización" usuario={culto.usuario_finalizacion} />
                                            )}
                                            {culto.tipo_culto?.tiene_testimonios && (
                                                <AssignmentPill label="Testimonios" usuario={culto.usuario_testimonios} />
                                            )}
                                        </div>

                                        {/* Botón de Acción */}
                                        <Link href={`/dashboard/cultos/${culto.id}`} className="block w-full">
                                            <button className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                                                Ver Detalles Completos
                                            </button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <div className="glass rounded-[2.5rem] p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
                                <p className="text-slate-400 font-bold">No hay cultos programados próximamente.</p>
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
                                Mis Asignaciones
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
                                        if (asg.id_usuario_intro === user.id) roles.push('Intro')
                                        if (asg.id_usuario_ensenanza === user.id) roles.push('Enseñanza')
                                        if (asg.id_usuario_finalizacion === user.id) roles.push('Final')
                                        if (asg.id_usuario_testimonios === user.id) roles.push('Testimonios')

                                        return (
                                            <Link key={asg.id} href={`/dashboard/cultos/${asg.id}`}>
                                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-400 uppercase">{format(new Date(asg.fecha), 'EEE d', { locale })}</span>
                                                            <span className="font-black text-slate-800 dark:text-slate-100">{asg.tipo_culto?.nombre}</span>
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
                                        <p className="text-xs font-medium">Sin asignaciones esta semana</p>
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
                <QuickActionLink href="/dashboard/festivos" icon={<MapPin className="text-amber-500" />} title="Festivos" />
                <QuickActionLink href="/dashboard/hermanos" icon={<Users className="text-emerald-500" />} title="Hermanos" />
            </div>
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
