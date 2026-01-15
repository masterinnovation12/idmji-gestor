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

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useMotionValue, useDragControls } from 'framer-motion'
import { getHimnos, getCoros } from './actions'
import { Music, Search, Clock, Sparkles, AudioLines, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/I18nProvider'
import BackButton from '@/components/BackButton'
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
    const [isCalcModalOpen, setIsCalcModalOpen] = useState(false)


    // Guardar datos iniciales en refs (solo una vez, nunca actualizar - esto evita re-renders que interfieren con el scroll)
    const initialHimnosRef = useRef(initialHimnos)
    const initialCorosRef = useRef(initialCoros)

    // Efecto para recarga de datos con debounce
    // IMPORTANTE: Solo ejecutar cuando cambia searchTerm o activeTab, NO en cada render
    const prevSearchTermRef = useRef(searchTerm)
    const prevActiveTabRef = useRef(activeTab)
    const isInitialMount = useRef(true)
    
    useEffect(() => {
        // No hacer nada en el montaje inicial (los datos ya vienen de props)
        if (isInitialMount.current) {
            isInitialMount.current = false
            prevSearchTermRef.current = searchTerm
            prevActiveTabRef.current = activeTab
            return
        }

        // Solo ejecutar si realmente cambió la búsqueda o la pestaña
        const searchChanged = prevSearchTermRef.current !== searchTerm
        const tabChanged = prevActiveTabRef.current !== activeTab
        
        // Si no hay cambios, no hacer nada (evitar re-renders innecesarios que interfieren con el scroll)
        if (!searchChanged && !tabChanged) {
            return
        }
        
        prevSearchTermRef.current = searchTerm
        prevActiveTabRef.current = activeTab
        
        /**
         * Carga los datos filtrados basándose en la pestaña y búsqueda
         */
        async function loadData() {
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
        
        // Si se cambió la pestaña y no hay búsqueda, NO hacer nada (los datos ya están correctos)
        // Esto evita re-renders innecesarios que interfieren con el scroll
        if (tabChanged && !searchTerm) {
            // Los datos ya están correctos, no actualizar estado
            return
        }
        
        // Solo cargar datos si hay búsqueda
        if (searchTerm) {
            const timer = setTimeout(() => {
                loadData()
            }, 300)
            return () => clearTimeout(timer)
        } else {
            // Si no hay búsqueda y cambió la búsqueda (se limpió), restaurar datos iniciales
            // Pero solo si realmente cambió la búsqueda (no en cada render)
            if (searchChanged) {
                if (activeTab === 'himnos') {
                    setHimnos(initialHimnosRef.current)
                } else {
                    setCoros(initialCorosRef.current)
                }
            }
        }
    }, [searchTerm, activeTab]) // SOLO estas dos dependencias - nada más

    // Bloquear scroll del body cuando modal de calculadora está abierto
    useEffect(() => {
        if (isCalcModalOpen && window.innerWidth < 1024) {
            if (typeof document !== 'undefined' && document.body) {
                const originalOverflow = document.body.style.overflow
                document.body.style.overflow = 'hidden'
                return () => {
                    if (document.body) {
                        document.body.style.overflow = originalOverflow
                    }
                }
            }
        }
    }, [isCalcModalOpen])



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

    // Usar useMemo para evitar re-renders innecesarios que interfieren con el scroll
    const currentData = useMemo(() => {
        return activeTab === 'himnos' ? himnos : coros
    }, [activeTab, himnos, coros])

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 px-4">
            {/* Breadcrumb y Header */}
            <div className="space-y-4">
                <BackButton fallbackUrl="/dashboard" />

                <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-center">
                    <div className="space-y-2">
                        <h1 suppressHydrationWarning className="text-4xl lg:text-5xl font-black bg-linear-to-br from-primary via-accent to-primary bg-clip-text text-transparent tracking-tight">
                            {t('himnario.title')}
                        </h1>
                        <p suppressHydrationWarning className="text-muted-foreground font-medium flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-accent" />
                            {t('himnario.desc')}
                        </p>
                    </div>

                    <div className="relative w-full lg:w-96 group">
                        <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-focus-within:bg-primary/30 transition-all opacity-0 group-focus-within:opacity-100" />
                        <div className="relative bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-2xl flex items-center px-4 h-14 shadow-lg focus-within:border-blue-500 transition-all">
                            <Search className="w-5 h-5 text-gray-400 dark:text-zinc-500 mr-3" />
                            <input
                                type="text"
                                placeholder={t('himnario.searchPlaceholder')}
                                className="w-full bg-transparent border-none outline-none font-bold placeholder:text-gray-400 dark:placeholder:text-zinc-500 text-gray-900 dark:text-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex p-1.5 bg-white dark:bg-zinc-800 rounded-2xl w-fit mx-auto sm:mx-0 shadow-lg border border-gray-200 dark:border-zinc-700">
                {[
                    { id: 'himnos', label: t('himnario.tabsHimnos'), icon: Music, count: counts.himnos },
                    { id: 'coros', label: t('himnario.tabsCoros'), icon: AudioLines, count: counts.coros }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'himnos' | 'coros')}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black transition-all ${activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span suppressHydrationWarning className="uppercase tracking-widest text-xs">{tab.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.id
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-zinc-300'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>



            <div className="grid lg:grid-cols-12 gap-8">
                {/* List Table */}
                <div className="lg:col-span-7">
                    <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden min-h-[500px] h-full flex flex-col">
                        <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
                            <div className="overflow-x-hidden overflow-y-auto no-scrollbar max-w-full flex-1">
                                <table className="w-full table-fixed">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border/50 text-left">
                                            <th suppressHydrationWarning className="hidden sm:table-cell px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground w-24">
                                                {t('himnario.tableNumber')}
                                            </th>
                                            <th suppressHydrationWarning className="px-6 sm:px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground w-full">
                                                {t('himnario.tableTitle')}
                                            </th>
                                            <th suppressHydrationWarning className="hidden sm:table-cell px-8 py-6 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground text-right w-32">
                                                {t('himnario.tableDuration')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        <AnimatePresence>
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
                                                        className="group hover:bg-muted/20 transition-all cursor-pointer border-b border-border/10 last:border-0"
                                                    >
                                                        <td className="hidden sm:table-cell px-8 py-6">
                                                            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#0660c6] to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all">
                                                                {item.numero}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 sm:px-8 py-5 sm:py-6 wrap-break-word">
                                                            <div className="flex flex-col gap-1 max-w-full">
                                                                <div className="flex items-center gap-2 sm:hidden mb-1">
                                                                    <span className="text-[10px] font-black tracking-widest text-white bg-blue-500 px-2 py-0.5 rounded-full uppercase">
                                                                        #{item.numero}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {formatDuration(item.duracion_segundos || 0)}
                                                                    </span>
                                                                </div>
                                                                <p className="font-black text-base sm:text-lg tracking-tight uppercase group-hover:text-primary transition-colors leading-tight text-foreground">
                                                                    {highlightText(item.titulo, searchTerm)}
                                                                </p>
                                                            </div>
                                                        </td>
                                                        <td className="hidden sm:table-cell px-8 py-6 text-right">
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
                                <span suppressHydrationWarning>
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

                {/* Sidebar Calculator (Desktop Only) */}
                <div className="hidden lg:block lg:col-span-5">
                    <div className="sticky top-6 max-h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar">
                        <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 overflow-hidden">
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <h3 suppressHydrationWarning className="text-xl font-black tracking-tighter flex items-center gap-3 text-foreground uppercase italic">
                                        <Clock className="w-6 h-6 text-primary" />
                                        {t('himnario.calculator')}
                                    </h3>
                                    <p suppressHydrationWarning className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                        {t('himnario.calculatorDesc')}
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

            {/* Mobile Calculator FAB */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsCalcModalOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-2xl shadow-blue-500/40 flex items-center justify-center z-50 border-2 border-white/30"
            >
                <div className="relative">
                    <Clock className="w-7 h-7" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                </div>
            </motion.button>

            {/* Mobile Calculator Modal */}
            <AnimatePresence>
                {isCalcModalOpen && (
                    <div className="fixed inset-0 z-110 lg:hidden flex items-end justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsCalcModalOpen(false)}
                        />
                        <CalculatorModal
                            onClose={() => setIsCalcModalOpen(false)}
                        >
                            <div className="overflow-y-auto max-h-[80vh] no-scrollbar pb-6 px-1">
                                <HimnoCoroSelector
                                    maxHimnos={10}
                                    maxCoros={10}
                                />
                            </div>
                        </CalculatorModal>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

function CalculatorModal({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
    const controls = useDragControls()
    const y = useMotionValue(0)

    return (
        <motion.div
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(e, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                    onClose()
                }
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ y }}
            className="relative bg-white dark:bg-zinc-900 w-full rounded-t-4xl shadow-2xl overflow-hidden border-t border-white/20 z-10"
        >
            {/* Handle */}
            <div
                className="pt-4 pb-2 w-full flex justify-center touch-none cursor-grab active:cursor-grabbing bg-white dark:bg-zinc-900"
                onPointerDown={(e) => controls.start(e)}
            >
                <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-zinc-700" />
            </div>

            {/* Content */}
            <div className="px-6 pb-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black italic uppercase tracking-tight">Calculadora</h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full">
                        <Plus className="w-5 h-5 rotate-45 text-gray-500" />
                    </button>
                </div>
                {children}
            </div>
        </motion.div>
    )
}

