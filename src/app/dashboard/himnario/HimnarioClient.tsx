/**
 * HimnarioClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para explorar el catálogo de himnos y coros.
 * Permite filtrar por tipo, número o título y visualizar duraciones.
 * 
 * Características:
 * - Cambio de pestañas (Himnos/Coros) con animaciones fluidas
 * - Buscador en tiempo real
 * - Lista optimizada con duraciones y numeración visual
 * - Soporte multiidioma (ES/CA)
 * 
 * @author Antigravity AI
 * @date 2024-12-18
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getHimnos, getCoros } from './actions'
import { Music, Search, Clock, ChevronLeft, Sparkles, AudioLines } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/I18nProvider'
import Link from 'next/link'
import { Himno, Coro } from '@/types/database'
import HimnoCoroSelector from '@/components/HimnoCoroSelector'

interface HimnarioClientProps {
    initialHimnos: Himno[]
    initialCoros: Coro[]
    counts: { himnos: number, coros: number }
}

export default function HimnarioClient({ initialHimnos, initialCoros, counts }: HimnarioClientProps) {
    const { t } = useI18n()
    const [himnos, setHimnos] = useState<Himno[]>(initialHimnos)
    const [coros, setCoros] = useState<Coro[]>(initialCoros)
    const [activeTab, setActiveTab] = useState<'himnos' | 'coros'>('himnos')
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // Efecto para recarga de datos con debounce
    useEffect(() => {
        /**
         * Carga los datos filtrados basándose en la pestaña y búsqueda
         */
        async function loadData() {
            if (!searchTerm && activeTab === 'himnos' && himnos.length === initialHimnos.length) return
            if (!searchTerm && activeTab === 'coros' && coros.length === initialCoros.length) return

            setIsLoading(true)

            if (activeTab === 'himnos') {
                const result = await getHimnos(searchTerm || undefined)
                if (result.success && result.data) {
                    setHimnos(result.data)
                }
            } else {
                const result = await getCoros(searchTerm || undefined)
                if (result.success && result.data) {
                    setCoros(result.data)
                }
            }

            setIsLoading(false)
        }

        const timer = setTimeout(() => {
            loadData()
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm, activeTab, himnos.length, coros.length, initialHimnos.length, initialCoros.length])

    /**
     * Formatea segundos a formato MM:SS
     */
    function formatDuration(seconds: number): string {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    /**
     * Resalta el término de búsqueda en los títulos
     */
    function highlightText(text: string, search: string) {
        if (!search.trim()) return text

        const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        const parts = text.split(regex)

        return parts.map((part, index) =>
            regex.test(part)
                ? <strong key={index} className="text-primary font-black bg-primary/10 px-0.5 rounded shadow-sm">{part}</strong>
                : part
        )
    }

    const currentData = activeTab === 'himnos' ? himnos : coros

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 px-4">
            {/* Breadcrumb y Header */}
            <div className="space-y-4">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-bold group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {t('dashboard.title')}
                </Link>

                <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-center">
                    <div className="space-y-2">
                        <h1 className="text-4xl lg:text-5xl font-black bg-linear-to-br from-primary via-accent to-primary bg-clip-text text-transparent tracking-tight">
                            {t('himnario.title')}
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-accent" />
                            {t('himnario.desc')}
                        </p>
                    </div>

                    <div className="relative w-full lg:w-96 group">
                        <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-focus-within:bg-primary/30 transition-all opacity-0 group-focus-within:opacity-100" />
                        <div className="relative glass border border-border/50 rounded-2xl flex items-center px-4 h-14 shadow-lg focus-within:border-primary transition-all">
                            <Search className="w-5 h-5 text-muted-foreground mr-3" />
                            <input
                                type="text"
                                placeholder={t('himnario.searchPlaceholder')}
                                className="w-full bg-transparent border-none outline-none font-bold placeholder:text-muted-foreground/50 text-foreground"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex p-2 bg-muted/30 rounded-3xl w-fit mx-auto sm:mx-0 shadow-inner">
                {[
                    { id: 'himnos', label: t('himnario.tabsHimnos'), icon: Music, count: counts.himnos },
                    { id: 'coros', label: t('himnario.tabsCoros'), icon: AudioLines, count: counts.coros }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all group ${activeTab === tab.id ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabBadge"
                                className="absolute inset-0 bg-primary rounded-2xl shadow-lg -z-10"
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        )}
                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'animate-bounce' : ''}`} />
                        <span className="uppercase tracking-widest text-xs">{tab.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${activeTab === tab.id ? 'bg-white/20 border-white/30' : 'bg-muted/50 border-border'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* List Table */}
                <div className="lg:col-span-8">
                    <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden min-h-[500px] h-full">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border/50 text-left">
                                            <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground w-24">
                                                {t('himnario.tableNumber')}
                                            </th>
                                            <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                                                {t('himnario.tableTitle')}
                                            </th>
                                            <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground text-right w-32">
                                                {t('himnario.tableDuration')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        <AnimatePresence mode="wait">
                                            {isLoading ? (
                                                <motion.tr
                                                    key="loading"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    <td colSpan={3} className="py-40 text-center">
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                            <p className="font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">
                                                                {t('common.loading')}
                                                            </p>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ) : currentData.length === 0 ? (
                                                <motion.tr
                                                    key="empty"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    <td colSpan={3} className="py-40 text-center">
                                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                                            <Music className="w-20 h-20" />
                                                            <p className="font-black text-xl tracking-tight uppercase italic text-muted-foreground">
                                                                {t('himnario.noResults')}
                                                            </p>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ) : (
                                                currentData.map((item, index) => (
                                                    <motion.tr
                                                        key={item.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.02 }}
                                                        className="group hover:bg-muted/20 transition-all cursor-pointer"
                                                    >
                                                        <td className="px-8 py-6">
                                                            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:rotate-6 transition-all">
                                                                {item.numero}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="font-black text-lg tracking-tight uppercase group-hover:text-primary transition-colors">
                                                                {highlightText(item.titulo, searchTerm)}
                                                            </p>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 text-muted-foreground font-black text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {formatDuration(item.duracion_segundos || 0)}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))
                                            )}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>

                        {/* Footer del Listado */}
                        {!isLoading && currentData.length > 0 && (
                            <div className="px-8 py-6 bg-muted/30 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground text-center sm:text-left flex items-center justify-between">
                                <span>
                                    {t('himnario.showing')
                                        .replace('{count}', currentData.length.toString())
                                        .replace('{type}', activeTab === 'himnos' ? t('himnario.tabsHimnos') : t('himnario.tabsCoros'))}
                                </span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px]">Real-time DB Sync</span>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Sidebar Calculator */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="rounded-[2.5rem] border-none shadow-xl bg-linear-to-br from-card to-muted/20 sticky top-6">
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    Calculadora de Tiempo
                                </h3>
                                <p className="text-sm text-muted-foreground font-medium">
                                    Planifica la duración total añadiendo hasta 10 himnos y 10 coros.
                                </p>
                            </div>

                            <HimnoCoroSelector
                                maxHimnos={10}
                                maxCoros={10}
                                className="bg-transparent"
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

