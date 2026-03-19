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
        <div className="space-y-4 sm:space-y-6">
            {/* Tabs premium */}
            <div className="flex p-1.5 bg-white dark:bg-zinc-800 rounded-2xl w-fit shadow-lg border border-gray-200 dark:border-zinc-700">
                <Link
                    href="/dashboard/historial/lecturas"
                    className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                        isLecturas
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700'
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span suppressHydrationWarning>{t('nav.lecturas')}</span>
                </Link>
                <Link
                    href="/dashboard/historial/temas-alabanza"
                    className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                        isTemasAlabanza
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700'
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
