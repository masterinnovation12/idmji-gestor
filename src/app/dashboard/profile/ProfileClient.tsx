/**
 * ProfileClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para la gestión del perfil del usuario.
 * Permite visualizar información personal, rol y configurar preferencias.
 * 
 * Características:
 * - Visualización de Avatar y datos básicos
 * - Integración con sistema de notificaciones Push
 * - Soporte multiidioma (ES/CA)
 * - Diseño Premium con micro-interacciones
 * 
 * @author Antigravity AI
 * @date 2024-12-18
 */

'use client'

import { motion } from 'framer-motion'
import { User, Mail, Shield, Moon, Globe, Sun, ChevronLeft, Sparkles } from 'lucide-react'
import { PushNotificationToggle } from '@/components/PushNotificationToggle'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { Profile } from '@/types/database'
import { Card, CardContent } from '@/components/ui/Card'

interface ProfileClientProps {
    profile: Profile | null
    email: string
}

export default function ProfileClient({ profile, email }: ProfileClientProps) {
    const { t } = useI18n()
    const { theme, setTheme } = useTheme()

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 px-4">
            {/* Breadcrumb y Header */}
            <div className="space-y-4">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-bold group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {t('dashboard.title')}
                </Link>

                <div className="space-y-1">
                    <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent tracking-tight">
                        {t('profile.title')}
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        {t('profile.desc')}
                    </p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Lateral: Avatar y Rol */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-1 space-y-6"
                >
                    <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden group">
                        <CardContent className="p-8 text-center space-y-6">
                            <div className="relative mx-auto w-40 h-40">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/40 transition-all" />
                                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-accent to-primary p-1 shadow-xl group-hover:scale-105 transition-transform">
                                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden border-4 border-background">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-16 h-16 text-muted-foreground/30" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h2 className="text-2xl font-black tracking-tight">{profile?.nombre} {profile?.apellidos}</h2>
                                <p className="text-sm text-muted-foreground font-medium">{email}</p>
                            </div>

                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                                <Shield className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-widest">{profile?.rol || 'EDITOR'}</span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Principal: Formulario y Preferencias */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 space-y-6"
                >
                    {/* Información Personal */}
                    <Card className="rounded-[2.5rem] border-none shadow-xl">
                        <CardContent className="p-8 space-y-8">
                            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <User className="w-5 h-5 text-primary" />
                                </div>
                                {t('profile.info')}
                            </h3>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                                        {t('profile.firstName')}
                                    </label>
                                    <div className="glass h-14 rounded-2xl flex items-center px-4 border border-border/50 opacity-60">
                                        <span className="font-bold">{profile?.nombre || '—'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                                        {t('profile.lastName')}
                                    </label>
                                    <div className="glass h-14 rounded-2xl flex items-center px-4 border border-border/50 opacity-60">
                                        <span className="font-bold">{profile?.apellidos || '—'}</span>
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                                        {t('profile.email')}
                                    </label>
                                    <div className="glass h-14 rounded-2xl flex items-center px-4 gap-3 border border-border/50 opacity-60">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-bold">{email}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preferencias */}
                    <Card className="rounded-[2.5rem] border-none shadow-xl">
                        <CardContent className="p-8 space-y-8">
                            <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                <div className="p-2 bg-accent/10 rounded-xl">
                                    <Globe className="w-5 h-5 text-accent" />
                                </div>
                                {t('profile.preferences')}
                            </h3>

                            <div className="space-y-4">
                                {/* Theme Switcher */}
                                <motion.div
                                    className="flex items-center justify-between p-6 rounded-3xl glass border border-border/50 hover:border-primary/30 transition-all group"
                                    whileHover={{ y: -2 }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform">
                                            {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                                        </div>
                                        <div>
                                            <p className="font-black text-sm uppercase tracking-tight">{t('profile.darkMode')}</p>
                                            <p className="text-xs text-muted-foreground font-medium">{t('profile.darkModeDesc')}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/20'
                                            }`}
                                    >
                                        <motion.div
                                            className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                                            animate={{ x: theme === 'dark' ? 24 : 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </motion.div>

                                {/* Push Notifications */}
                                <div className="p-2 rounded-3xl glass border border-border/50">
                                    <PushNotificationToggle />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    )
}
