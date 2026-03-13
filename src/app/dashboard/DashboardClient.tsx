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
import type { TranslationKey } from '@/lib/i18n/types'
import { Culto, Profile } from '@/types/database'
import { getUserAssignments } from './cultos/actions'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { NotificationPrompt } from '@/components/NotificationPrompt'
import { isSonidoUser } from '@/lib/utils/isSonido'
import CultoNavigator from '@/components/CultoNavigator'
import { UserAvatar } from '@/components/dashboard/cultos/UserAvatar'
import { CultoCardRenderer } from '@/components/dashboard/cultos/CultoCardRenderer'
import { InstruccionesCultoModal } from '@/components/InstruccionesCultoModal'
import type { RolInstruccionCulto } from '@/types/database'

// --- Sub-componentes ---

// --- Sub-componentes (Refactorizados a archivos externos) ---

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
    initialDate: string
}

export default function DashboardClient({ user, culto, esHoy, lecturaData, estudioBiblicoData, observacionesData, initialAssignments, initialDate }: DashboardClientProps) {
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
    const [instruccionesModal, setInstruccionesModal] = useState<{ cultoTypeId: string; cultoTypeNombre: string; rol: RolInstruccionCulto } | null>(null)

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
            <div className="hidden md:flex relative overflow-hidden glass rounded-4xl p-12 shadow-2xl border-white/20 bg-linear-to-br from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-slate-800 items-center justify-between">
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

                {/* Left: Culto Card (Takes 2 cols on Desktop; full width for SONIDO) */}
                <div className={`${isSonidoUser(user) ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
                    <CultoNavigator
                        initialCulto={culto}
                        initialDate={initialDate}
                        esHoy={esHoy}
                    >
                        {(navCulto, isNavLoading, navEsHoy) => (
                            <>
                                {isNavLoading ? (
                                    <div className="relative">
                                        <div className="bg-slate-200 dark:bg-slate-800 rounded-[2.5rem] h-[500px] animate-pulse w-full"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-white/80 dark:bg-black/50 backdrop-blur-md px-6 py-3 rounded-full shadow-xl">
                                                <p className="text-sm font-black text-slate-500 animate-pulse uppercase tracking-widest">{t('dashboard.navigator.loading' as any)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : navCulto ? (
                                    /* Renderizado Delegado al Componente Renderer */
                                    <CultoCardRenderer culto={navCulto} esHoy={navEsHoy} currentUserId={user.id} />
                                ) : (
                                    <div className="glass rounded-[2.5rem] p-12 text-center border-dashed border-2 border-slate-200 dark:border-slate-800">
                                        <p className="text-slate-400 font-bold">{t('dashboard.navigator.noService' as any)}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </CultoNavigator>
                </div>

                {/* Right: My Assignments (Hidden for SONIDO role) */}
                {!isSonidoUser(user) && <div className="lg:col-span-1">
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
                                        const roles: string[] = []
                                        const rolesKeys: RolInstruccionCulto[] = []
                                        if (asg.id_usuario_intro === user.id) { roles.push(t('cultos.role.intro')); rolesKeys.push('introduccion') }
                                        if (asg.id_usuario_ensenanza === user.id) { roles.push(t('cultos.role.teaching')); rolesKeys.push('ensenanza') }
                                        if (asg.id_usuario_finalizacion === user.id) { roles.push(t('cultos.role.final')); rolesKeys.push('finalizacion') }
                                        if (asg.id_usuario_testimonios === user.id) { roles.push(t('cultos.role.testimonies')); rolesKeys.push('testimonios') }
                                        const firstRol = rolesKeys[0]

                                        return (
                                            <div key={asg.id} className="flex flex-col gap-1">
                                                <Link href={`/dashboard/cultos/${asg.id}`}>
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
                                                {firstRol && asg.tipo_culto_id && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setInstruccionesModal({ cultoTypeId: asg.tipo_culto_id, cultoTypeNombre: asg.tipo_culto?.nombre ?? '', rol: firstRol })}
                                                        className="min-h-[44px] py-2.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:underline text-left px-4 touch-manipulation rounded-lg hover:bg-primary/5 active:bg-primary/10 transition-colors"
                                                    >
                                                        {t('culto.instrucciones.ver')}
                                                    </button>
                                                )}
                                            </div>
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
                </div>}
            </div>

            {/* 3. Quick Actions Grid (Restored & Improved) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickActionLink href="/dashboard/cultos" icon={<Calendar className="text-blue-500" />} title={t('dashboard.calendar')} />
                <QuickActionLink href="/dashboard/lecturas" icon={<BookOpen className="text-purple-500" />} title={t('dashboard.lecturas')} />
                <QuickActionLink href="/dashboard/festivos" icon={<MapPin className="text-amber-500" />} title={t('dashboard.festivos')} />
                <QuickActionLink href="/dashboard/hermanos" icon={<Users className="text-emerald-500" />} title={t('dashboard.hermanos')} />
            </div>

            <NotificationPrompt />

            {instruccionesModal && (
                <InstruccionesCultoModal
                    isOpen
                    onClose={() => setInstruccionesModal(null)}
                    cultoTypeId={instruccionesModal.cultoTypeId}
                    cultoTypeNombre={instruccionesModal.cultoTypeNombre}
                    rol={instruccionesModal.rol}
                />
            )}
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
