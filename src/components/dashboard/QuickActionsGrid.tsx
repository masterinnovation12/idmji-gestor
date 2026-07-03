'use client'

import { Calendar, BookOpen, Users, MapPin, Gift } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/I18nProvider'

export function QuickActionsGrid() {
    const { t } = useI18n()

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <QuickActionLink href="/dashboard/cultos"   icon={<Calendar className="text-blue-500" />}    title={t('dashboard.calendar')} />
            <QuickActionLink href="/dashboard/lecturas" icon={<BookOpen className="text-purple-500" />}  title={t('dashboard.lecturas')} />
            <QuickActionLink href="/dashboard/ofrenda"  icon={<Gift className="text-emerald-500" />}     title={t('dashboard.ofrenda')} />
            <QuickActionLink href="/dashboard/festivos" icon={<MapPin className="text-amber-500" />}     title={t('dashboard.festivos')} />
            {/* En móvil (2 columnas) la 5ª tarjeta ocupa toda la fila para no quedar huérfana */}
            <QuickActionLink href="/dashboard/hermanos" icon={<Users className="text-slate-500" />}      title={t('dashboard.hermanos')} className="col-span-2 lg:col-span-1" />
        </div>
    )
}

function QuickActionLink({ href, icon, title, className }: Readonly<{ href: string, icon: React.ReactNode, title: string, className?: string }>) {
    return (
        <Link href={href} className={className}>
            <motion.div
                whileTap={{ scale: 0.95 }}
                className="ofrenda-liquid-card h-full rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
                <div className="p-3 bg-[#f8f3e8] border border-[rgba(184,150,74,0.28)] rounded-2xl">{icon}</div>
                <span className="font-bold text-sm text-[#1f2e85]">{title}</span>
            </motion.div>
        </Link>
    )
}
