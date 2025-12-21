/**
 * DashboardClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para el panel principal de la aplicación.
 * Muestra el resumen del culto del día, estadísticas rápidas y accesos directos.
 * 
 * Características:
 * - Visualización del culto actual con sus responsables
 * - Estadísticas generales (cultos, lecturas)
 * - Navegación rápida por secciones
 * - Soporte multiidioma (i18n)
 * 
 * @author Antigravity AI
 * @date 2024-12-18
 */

'use client'

import { Calendar, BookOpen, Users, TrendingUp, Clock, UserIcon, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Culto, Profile } from '@/types/database'

interface DashboardClientProps {
    user: {
        nombre: string
        apellidos: string
        rol: string
    } | null
    cultoHoy: Culto | null
    stats: {
        totalCultos: number
        totalLecturas: number
    }
}

/**
 * Componente interno para mostrar un responsable asignado de forma consistente
 */
function ResponsableCard({ label, usuario }: { label: string, usuario: Partial<Profile> | null | undefined }) {
    if (!usuario) return null
    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="p-4 bg-muted/30 dark:bg-muted/10 rounded-2xl border border-border/10 backdrop-blur-sm transition-all hover:bg-muted/50 hover:shadow-sm group"
        >
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black mb-2 opacity-70 group-hover:opacity-100 transition-opacity">{label}</p>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <UserIcon className="w-4 h-4" />
                </div>
                <p className="font-black text-sm tracking-tight text-foreground">
                    {usuario.nombre || ''} {usuario.apellidos || ''}
                </p>
            </div>
        </motion.div>
    )
}

export default function DashboardClient({ user, cultoHoy, stats }: DashboardClientProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Bienvenida y Fecha */}
            <div className="relative overflow-hidden glass rounded-4xl p-8 md:p-12 shadow-2xl border-white/20 dark:border-white/5 bg-linear-to-br from-white/40 to-white/10 dark:from-white/5 dark:to-transparent">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[100px] -z-10" />

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 bg-linear-to-r from-primary via-accent to-primary bg-size-[200%_100%] animate-gradient bg-clip-text text-transparent tracking-tighter">
                        {t('dashboard.welcome')}, {user?.nombre || 'Herman@'}!
                    </h1>
                    <div className="flex items-center gap-3 text-muted-foreground font-bold tracking-tight">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <span className="capitalize">{format(new Date(), 'PPPP', { locale })}</span>
                    </div>
                </motion.div>
            </div>

            {/* Culto de Hoy */}
            <AnimatePresence mode="wait">
                {cultoHoy ? (
                    <motion.div
                        key="culto-hoy"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden hover-lift bg-card/80 backdrop-blur-md">
                            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: cultoHoy.tipo_culto?.color || 'var(--color-primary)' }} />
                            <CardHeader className="pt-8 px-8 pb-4">
                                <CardTitle
                                    icon={<Calendar className="w-6 h-6 text-primary" />}
                                    className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground"
                                >
                                    {t('dashboard.todayCulto')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 space-y-8">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex items-center gap-6">
                                        <div
                                            className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl transform rotate-3 relative group"
                                            style={{ backgroundColor: `${cultoHoy.tipo_culto?.color || '#4A90E2'}20` }}
                                        >
                                            <div
                                                className="absolute inset-0 rounded-[1.5rem] bg-current opacity-10 animate-pulse"
                                                style={{ color: cultoHoy.tipo_culto?.color || '#4A90E2' }}
                                            />
                                            <Calendar className="w-8 h-8 relative z-10" style={{ color: cultoHoy.tipo_culto?.color || '#4A90E2' }} />
                                        </div>
                                        <div>
                                            <p className="font-black text-3xl md:text-4xl tracking-tighter uppercase italic">{cultoHoy.tipo_culto?.nombre}</p>
                                            <div className="flex items-center gap-2 text-primary font-black text-sm tracking-widest mt-1">
                                                <Clock className="w-4 h-4" />
                                                <span>{cultoHoy.hora_inicio.slice(0, 5)} {cultoHoy.hora_fin ? `- ${cultoHoy.hora_fin.slice(0, 5)}` : ''}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Link
                                        href={`/dashboard/cultos/${cultoHoy.id}`}
                                        className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all group tracking-widest text-xs uppercase"
                                    >
                                        {t('common.viewDetails')}
                                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>

                                {/* Asignaciones de Responsables */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                                    <ResponsableCard label={t('cultos.intro')} usuario={cultoHoy.usuario_intro} />
                                    <ResponsableCard label={t('cultos.finalizacion')} usuario={cultoHoy.usuario_finalizacion} />
                                    <ResponsableCard label={t('cultos.ensenanza')} usuario={cultoHoy.usuario_ensenanza} />
                                    <ResponsableCard label={t('cultos.testimonios')} usuario={cultoHoy.usuario_testimonios} />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="no-culto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass rounded-4xl p-16 text-center border border-dashed border-border/50 bg-muted/5"
                    >
                        <div className="w-20 h-20 bg-muted/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Calendar className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                        <p className="text-xl font-black tracking-tight text-muted-foreground uppercase">{t('dashboard.noCultoToday')}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Estadísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    icon={<Calendar className="w-6 h-6 text-primary" />}
                    label={t('dashboard.totalCultos')}
                    value={stats.totalCultos}
                    bgColor="bg-primary/10"
                />
                <StatCard
                    icon={<BookOpen className="w-6 h-6 text-secondary" />}
                    label={t('dashboard.totalLecturas')}
                    value={stats.totalLecturas}
                    bgColor="bg-secondary/10"
                />
                <StatCard
                    icon={<TrendingUp className="w-6 h-6 text-accent" />}
                    label={t('dashboard.yourRole')}
                    value={user?.rol || ''}
                    bgColor="bg-accent/10"
                />
            </div>

            {/* Acciones Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-8">
                <QuickActionLink
                    href="/dashboard/cultos"
                    icon={<Calendar className="text-primary" />}
                    title={t('dashboard.calendar')}
                    desc={t('dashboard.calendarDesc')}
                />
                <QuickActionLink
                    href="/dashboard/lecturas"
                    icon={<BookOpen className="text-secondary" />}
                    title={t('dashboard.lecturas')}
                    desc={t('dashboard.lecturasDesc')}
                />
                <QuickActionLink
                    href="/dashboard/festivos"
                    icon={<Calendar className="text-amber-500" />}
                    title={t('dashboard.festivos')}
                    desc={t('dashboard.festivosDesc')}
                />
                <QuickActionLink
                    href="/dashboard/hermanos"
                    icon={<Users className="text-emerald-500" />}
                    title={t('dashboard.hermanos')}
                    desc={t('dashboard.hermanosDesc')}
                />
            </div>
        </div>
    )
}

/**
 * Componentes auxiliares para el Dashboard
 */
function StatCard({ icon, label, value, bgColor }: { icon: React.ReactNode, label: string, value: string | number, bgColor: string }) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass rounded-3xl p-6 shadow-xl border border-white/20 dark:border-white/5 transition-all relative overflow-hidden group"
        >
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${bgColor} blur-2xl rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700`} />
            <div className="flex items-center gap-4 relative z-10">
                <div className={`p-4 ${bgColor} rounded-2xl shadow-inner group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</p>
                    <p className="text-3xl font-black tracking-tighter text-foreground">{value}</p>
                </div>
            </div>
        </motion.div>
    )
}

function QuickActionLink({ href, icon, title, desc }: { href: string, icon: React.ReactNode, title: string, desc: string }) {
    return (
        <Link
            href={href}
            className="group block h-full"
        >
            <motion.div
                whileHover={{ y: -8 }}
                whileTap={{ scale: 0.98 }}
                className="h-full glass rounded-4xl p-8 border border-white/20 dark:border-white/5 shadow-xl hover:shadow-2xl hover:shadow-primary/10 transition-all flex flex-col items-start text-left relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="w-14 h-14 bg-muted/40 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all shadow-inner relative z-10">
                    <div className="group-hover:scale-125 transition-transform">
                        {icon}
                    </div>
                </div>

                <div className="relative z-10 space-y-2">
                    <h3 className="font-black text-xl tracking-tight group-hover:text-primary transition-colors uppercase italic">{title}</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                        {desc}
                    </p>
                </div>

                <div className="mt-auto pt-6 w-full flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </div>
            </motion.div>
        </Link>
    )
}
