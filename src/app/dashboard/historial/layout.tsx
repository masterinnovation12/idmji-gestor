'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Sparkles } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'

export default function HistorialLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { t } = useI18n()

    const isLecturas = pathname.includes('/historial/lecturas')
    const isTemasAlabanza = pathname.includes('/historial/temas-alabanza')

    return (
        <div className="ofrenda-liquid-scope space-y-4 sm:space-y-6">
            {/* Tabs liquid premium */}
            <div className="flex gap-1 p-1.5 rounded-2xl w-fit border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] shadow-sm">
                <Link
                    href="/dashboard/historial/lecturas"
                    className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                        isLecturas
                            ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]'
                            : 'text-slate-500 hover:text-[#1f2e85] hover:bg-white/60'
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span suppressHydrationWarning>{t('nav.lecturas')}</span>
                </Link>
                <Link
                    href="/dashboard/historial/temas-alabanza"
                    className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                        isTemasAlabanza
                            ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]'
                            : 'text-slate-500 hover:text-[#1f2e85] hover:bg-white/60'
                    }`}
                >
                    <Sparkles className="w-4 h-4" />
                    <span suppressHydrationWarning>{t('nav.temasAlabanza')}</span>
                </Link>
            </div>
            {children}
        </div>
    )
}
