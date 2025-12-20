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

import { Calendar, BookOpen, Users, TrendingUp, Clock, UserIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import Link from 'next/link'
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
        <div className="p-3 bg-muted/50 rounded-xl transition-all hover:bg-muted/80">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">{label}</p>
            <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-primary/70" />
                <p className="font-medium text-sm">
                    {usuario.nombre || ''} {usuario.apellidos || ''}
                </p>
            </div>
        </div>
    )
}

export default function DashboardClient({ user, cultoHoy, stats }: DashboardClientProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es

    return (
        <div className="space-y-6">
            {/* Bienvenida y Fecha */}
            <div className="glass rounded-2xl p-6 shadow-sm">
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {t('dashboard.welcome')}, {user?.nombre}!
                </h1>
                <p className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {format(new Date(), 'PPPP', { locale })}
                </p>
            </div>

            {/* Culto de Hoy */}
            {cultoHoy && (
                <Card className="border-l-4" style={{ borderLeftColor: cultoHoy.tipo_culto?.color || '#4A90E2' }}>
                    <CardHeader>
                        <CardTitle icon={<Calendar className="w-5 h-5 text-primary" />}>
                            {t('dashboard.todayCulto')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3"
                                    style={{ backgroundColor: `${cultoHoy.tipo_culto?.color || '#4A90E2'}20` }}
                                >
                                    <Calendar className="w-6 h-6" style={{ color: cultoHoy.tipo_culto?.color || '#4A90E2' }} />
                                </div>
                                <div>
                                    <p className="font-bold text-2xl tracking-tight">{cultoHoy.tipo_culto?.nombre}</p>
                                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {cultoHoy.hora_inicio} - {cultoHoy.hora_fin}
                                    </p>
                                </div>
                            </div>

                            {/* Asignaciones de Responsables */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <ResponsableCard label={t('cultos.intro')} usuario={cultoHoy.usuario_intro} />
                                <ResponsableCard label={t('cultos.finalizacion')} usuario={cultoHoy.usuario_finalizacion} />
                                <ResponsableCard label={t('cultos.ensenanza')} usuario={cultoHoy.usuario_ensenanza} />
                                <ResponsableCard label={t('cultos.testimonios')} usuario={cultoHoy.usuario_testimonios} />
                            </div>

                            <Link
                                href={`/dashboard/cultos/${cultoHoy.id}`}
                                className="block w-full text-center py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all transform"
                            >
                                {t('common.viewDetails')}
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!cultoHoy && (
                <div className="glass rounded-2xl p-10 text-center border border-dashed border-border">
                    <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">{t('dashboard.noCultoToday')}</p>
                </div>
            )}

            {/* Estadísticas Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    icon={<Calendar className="w-6 h-6 text-primary" />}
                    label={t('dashboard.totalCultos')}
                    value={stats.totalCultos}
                    bgColor="bg-primary/10"
                />
                <StatCard
                    icon={<BookOpen className="w-6 h-6 text-blue-500" />}
                    label={t('dashboard.totalLecturas')}
                    value={stats.totalLecturas}
                    bgColor="bg-blue-500/10"
                />
                <StatCard
                    icon={<TrendingUp className="w-6 h-6 text-purple-500" />}
                    label={t('dashboard.yourRole')}
                    value={user?.rol || ''}
                    bgColor="bg-purple-500/10"
                />
            </div>

            {/* Acciones Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
                <QuickActionLink
                    href="/dashboard/cultos"
                    icon={<Calendar className="text-primary" />}
                    title={t('dashboard.calendar')}
                    desc={t('dashboard.calendarDesc')}
                />
                <QuickActionLink
                    href="/dashboard/lecturas"
                    icon={<BookOpen className="text-blue-500" />}
                    title={t('dashboard.lecturas')}
                    desc={t('dashboard.lecturasDesc')}
                />
                <QuickActionLink
                    href="/dashboard/festivos"
                    icon={<Calendar className="text-yellow-500" />}
                    title={t('dashboard.festivos')}
                    desc={t('dashboard.festivosDesc')}
                />
                <QuickActionLink
                    href="/dashboard/hermanos"
                    icon={<Users className="text-green-500" />}
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
        <div className="glass rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border/50">
            <div className="flex items-center gap-4">
                <div className={`p-3 ${bgColor} rounded-xl`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold tracking-tight">{value}</p>
                </div>
            </div>
        </div>
    )
}

function QuickActionLink({ href, icon, title, desc }: { href: string, icon: React.ReactNode, title: string, desc: string }) {
    return (
        <Link
            href={href}
            className="glass rounded-xl p-6 hover:shadow-xl transition-all group border border-border/50 active:scale-95"
        >
            <div className="w-12 h-12 bg-muted/30 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                {icon}
            </div>
            <h3 className="font-bold mb-1 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </Link>
    )
}
