'use client'

import { Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import Link from 'next/link'
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

    const fechaLarga = (() => {
        const f = format(new Date(), 'PPPP', { locale })
        return f.charAt(0).toUpperCase() + f.slice(1)
    })()

    return (
        // Tarjeta hero marino + dorado (misma piel que PageHero) pero con el
        // contenido compacto original: saludo, "Hermano {nombre}" y avatar en línea.
        <div data-testid="page-hero" className="relative overflow-hidden rounded-[2rem] md:rounded-[3rem] border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] via-[#283593] to-[#151f5c] p-6 md:p-8 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#b8964a]/25 rounded-full blur-[110px] -translate-y-1/2 translate-x-1/4" />
            <div
                className="absolute inset-x-[8%] top-0 h-0.5 rounded-full"
                style={{
                    background: 'linear-gradient(90deg,#b68f2f,#e3cc92 42%,#d4b86a 58%,#b68f2f)',
                    boxShadow: '0 0 12px rgba(227,204,146,0.6)',
                }}
            />
            <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <h1
                        className="text-3xl sm:text-4xl font-black text-white tracking-tighter leading-none mb-1"
                        suppressHydrationWarning
                    >
                        {greeting}
                    </h1>
                    <p
                        className="text-xs sm:text-sm font-bold text-[#e8d9a8] uppercase tracking-widest truncate"
                        suppressHydrationWarning
                    >
                        {t('dashboard.greeting.brother')} {user.nombre}
                    </p>
                    <div
                        className="mt-2 flex items-center gap-2 text-white/60 text-[11px] sm:text-xs font-semibold"
                        suppressHydrationWarning
                    >
                        <Calendar className="w-4 h-4 text-[#e8d9a8] shrink-0" />
                        <span className="truncate">{fechaLarga}</span>
                    </div>
                </div>
                <Link href="/dashboard/profile" className="shrink-0">
                    <UserAvatar usuario={user} size="md" />
                </Link>
            </div>
        </div>
    )
}
