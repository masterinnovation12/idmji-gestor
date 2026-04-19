'use client'

import { Calendar, BookOpen, Users, MapPin } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/I18nProvider'

export function QuickActionsGrid() {
    const { t } = useI18n()

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionLink href="/dashboard/cultos" icon={<Calendar className="text-blue-500" />} title={t('dashboard.calendar')} />
            <QuickActionLink href="/dashboard/lecturas" icon={<BookOpen className="text-purple-500" />} title={t('dashboard.lecturas')} />
            <QuickActionLink href="/dashboard/festivos" icon={<MapPin className="text-amber-500" />} title={t('dashboard.festivos')} />
            <QuickActionLink href="/dashboard/hermanos" icon={<Users className="text-emerald-500" />} title={t('dashboard.hermanos')} />
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
