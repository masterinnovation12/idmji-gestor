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
            <div className="hidden md:flex relative overflow-hidden rounded-4xl p-12 shadow-2xl border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] via-[#283593] to-[#151f5c] items-center justify-between">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#b8964a]/25 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute inset-x-[8%] top-0 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#b68f2f,#e3cc92 42%,#d4b86a 58%,#b68f2f)', boxShadow: '0 0 12px rgba(227,204,146,0.6)' }} />
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl lg:text-5xl font-black mb-4 text-white tracking-tighter">
                        <span>{greeting}</span> <span className="text-[#e8d9a8]">{t('dashboard.greeting.brother')} {user.nombre}</span>
                    </h1>
                    <div className="flex items-center gap-3 text-white/70 font-bold">
                        <Calendar className="w-5 h-5 text-[#e8d9a8]" />
                        <span suppressHydrationWarning>
                            {(() => {
                                const f = format(new Date(), 'PPPP', { locale })
                                return f.charAt(0).toUpperCase() + f.slice(1)
                            })()}
                        </span>
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
                    <p className="text-xs xs:text-sm font-bold text-[#b68f2f] uppercase tracking-widest truncate">
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
