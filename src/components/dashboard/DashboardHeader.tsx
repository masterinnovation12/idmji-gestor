'use client'

import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Profile } from '@/types/database'
import { UserAvatar } from '@/components/dashboard/cultos/UserAvatar'

interface DashboardHeaderProps {
    user: Profile & { id: string }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour >= 6 && hour < 12) return t('dashboard.greeting.morning')
        if (hour >= 12 && hour < 20) return t('dashboard.greeting.afternoon')
        return t('dashboard.greeting.night')
    }

    const greeting = getGreeting()

    return (
        <>
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
        </>
    )
}
