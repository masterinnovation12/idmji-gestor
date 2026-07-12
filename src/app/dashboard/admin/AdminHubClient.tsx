'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShieldCheck, UserCog, Building2, BarChart, FileText, ChevronRight, KeyRound } from 'lucide-react'
import PageHero from '@/components/PageHero'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { TranslationKey } from '@/lib/i18n/types'

interface AdminModule {
    href: string
    icon: React.ElementType
    titleKey: TranslationKey
    descKey: TranslationKey
    testId: string
}

const MODULES: AdminModule[] = [
    {
        href: '/dashboard/admin/users',
        icon: UserCog,
        titleKey: 'admin.hub.usuariosTitulo',
        descKey: 'admin.hub.usuariosDesc',
        testId: 'admin-mod-usuarios',
    },
    {
        href: '/dashboard/admin/sedes',
        icon: Building2,
        titleKey: 'admin.hub.sedesTitulo',
        descKey: 'admin.hub.sedesDesc',
        testId: 'admin-mod-sedes',
    },
    {
        href: '/dashboard/admin/stats',
        icon: BarChart,
        titleKey: 'admin.hub.statsTitulo',
        descKey: 'admin.hub.statsDesc',
        testId: 'admin-mod-stats',
    },
    {
        href: '/dashboard/admin/audit',
        icon: FileText,
        titleKey: 'admin.hub.auditTitulo',
        descKey: 'admin.hub.auditDesc',
        testId: 'admin-mod-audit',
    },
]

export default function AdminHubClient() {
    const { t } = useI18n()

    return (
        <div className="ofrenda-liquid-scope space-y-8 animate-in fade-in duration-500" data-page="admin-hub">
            <PageHero
                title={t('admin.hub.title')}
                subtitle={t('admin.hub.desc')}
                icon={ShieldCheck}
                animate={false}
                data-testid="admin-hub-hero"
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {MODULES.map((mod, index) => {
                    const Icon = mod.icon
                    return (
                        <motion.div
                            key={mod.href}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.06 }}
                        >
                            <Link
                                href={mod.href}
                                data-testid={mod.testId}
                                className="group flex h-full flex-col ofrenda-liquid-card rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-[#1f2e85]/15 hover:-translate-y-1"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="w-12 h-12 rounded-2xl bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] flex items-center justify-center">
                                        <Icon className="w-6 h-6 text-[#1f2e85]" />
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-[#b8964a] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </div>
                                <h3 className="mt-4 font-black text-lg text-slate-900" suppressHydrationWarning>
                                    {t(mod.titleKey)}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 leading-snug" suppressHydrationWarning>
                                    {t(mod.descKey)}
                                </p>
                            </Link>
                        </motion.div>
                    )
                })}
            </div>

            {/* Nota sobre permisos granulares */}
            <div className="ofrenda-liquid-card rounded-3xl p-6 flex items-start gap-4">
                <div className="shrink-0 w-11 h-11 rounded-2xl bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-[#b68f2f]" />
                </div>
                <div className="min-w-0">
                    <h4 className="font-black text-slate-900" suppressHydrationWarning>
                        {t('admin.hub.permisosTitulo')}
                    </h4>
                    <p className="text-sm text-slate-500 leading-snug mt-1" suppressHydrationWarning>
                        {t('admin.hub.permisosDesc')}
                    </p>
                </div>
            </div>
        </div>
    )
}
