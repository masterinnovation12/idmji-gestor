'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Sparkles, Filter, X, Calendar, ChevronLeft, ChevronRight,
    BarChart3, User, BookOpen, ExternalLink
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useI18n } from '@/lib/i18n/I18nProvider'
import BackButton from '@/components/BackButton'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    getAllTemasAlabanza,
    getTemasAlabanzaStats,
    getHermanosConTemas,
    getTemasAlabanzaKeys,
    type TemaAlabanzaRegistro,
    type LecturaIntro,
    type TemaAlabanzaStats,
    type HermanosConTemas
} from './actions'

function formatCita(lectura: LecturaIntro): string {
    if (lectura.capitulo_inicio === lectura.capitulo_fin && lectura.versiculo_inicio === lectura.versiculo_fin) {
        return `${lectura.libro} ${lectura.capitulo_inicio}:${lectura.versiculo_inicio}`
    }
    if (lectura.capitulo_inicio === lectura.capitulo_fin) {
        return `${lectura.libro} ${lectura.capitulo_inicio}:${lectura.versiculo_inicio}-${lectura.versiculo_fin}`
    }
    return `${lectura.libro} ${lectura.capitulo_inicio}:${lectura.versiculo_inicio} - ${lectura.capitulo_fin}:${lectura.versiculo_fin}`
}

interface TemasAlabanzaClientProps {
    initialData: TemaAlabanzaRegistro[]
    initialTotalPages: number
    initialPage: number
}

export default function TemasAlabanzaClient({
    initialData,
    initialTotalPages,
    initialPage
}: TemasAlabanzaClientProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')
    const [temaKey, setTemaKey] = useState(searchParams.get('temaKey') || '')
    const [hermanoId, setHermanoId] = useState(searchParams.get('hermanoId') || '')
    const [showFilters, setShowFilters] = useState(false)
    const [showStats, setShowStats] = useState(false)
    const [mounted, setMounted] = useState(false)
    const filtersPanelRef = useRef<HTMLDivElement>(null)

    const [data, setData] = useState<TemaAlabanzaRegistro[]>(initialData)
    const [totalPages, setTotalPages] = useState(initialTotalPages)
    const [currentPage, setCurrentPage] = useState(initialPage)
    const [hermanos, setHermanos] = useState<HermanosConTemas[]>([])
    const [stats, setStats] = useState<TemaAlabanzaStats | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const [temasKeys, setTemasKeys] = useState<string[]>([])
    const [selectedRegistro, setSelectedRegistro] = useState<TemaAlabanzaRegistro | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        getTemasAlabanzaKeys().then(setTemasKeys)
    }, [])

    const loadHermanos = useCallback(async () => {
        const { data: h } = await getHermanosConTemas()
        setHermanos(h || [])
    }, [])

    const loadStats = useCallback(async () => {
        if (!mounted) return
        const filters = {
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            temaKey: temaKey || undefined,
            hermanoId: hermanoId || undefined
        }
        const s = await getTemasAlabanzaStats(filters)
        setStats(s)
    }, [mounted, startDate, endDate, temaKey, hermanoId])

    useEffect(() => {
        loadHermanos()
    }, [loadHermanos])

    useEffect(() => {
        if (mounted) loadStats()
    }, [mounted, startDate, endDate, temaKey, hermanoId, loadStats])

    useEffect(() => {
        setData(initialData)
        setTotalPages(initialTotalPages)
        setCurrentPage(initialPage)
        setIsLoading(false)
    }, [initialData, initialTotalPages, initialPage])

    const searchParamsString = searchParams.toString()
    const prevSearchParamsRef = useRef(searchParamsString)
    const isManualNavigation = useRef(false)

    useEffect(() => {
        if (isManualNavigation.current) {
            isManualNavigation.current = false
            prevSearchParamsRef.current = searchParamsString
            return
        }
        if (prevSearchParamsRef.current === searchParamsString) return
        prevSearchParamsRef.current = searchParamsString
        setStartDate(searchParams.get('startDate') || '')
        setEndDate(searchParams.get('endDate') || '')
        setTemaKey(searchParams.get('temaKey') || '')
        setHermanoId(searchParams.get('hermanoId') || '')
    }, [searchParamsString])

    const updateURL = useCallback((newParams: Record<string, string | null>) => {
        isManualNavigation.current = true
        const params = new URLSearchParams(searchParams)
        Object.entries(newParams).forEach(([key, value]) => {
            if (value && value !== '') params.set(key, value)
            else params.delete(key)
        })
        if (!newParams.page) params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }, [searchParams, pathname, router])

    const applyFilters = useCallback(() => {
        updateURL({
            startDate: startDate || null,
            endDate: endDate || null,
            temaKey: temaKey || null,
            hermanoId: hermanoId || null
        })
        setShowFilters(false)
        toast.success('Filtros aplicados correctamente')
    }, [startDate, endDate, temaKey, hermanoId, updateURL])

    const clearFilters = useCallback(() => {
        setStartDate('')
        setEndDate('')
        setTemaKey('')
        setHermanoId('')
        isManualNavigation.current = true
        router.push(pathname, { scroll: false })
        setShowFilters(false)
        toast.success('Filtros limpiados correctamente')
    }, [pathname, router])

    const changePage = useCallback((newPage: number) => {
        updateURL({ page: newPage.toString() })
    }, [updateURL])

    useEffect(() => {
        if (!mounted || !showFilters) return
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('[data-filter-button]') && !filtersPanelRef.current?.contains(target)) {
                setShowFilters(false)
            }
        }
        const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 100)
        return () => {
            clearTimeout(timer)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showFilters, mounted])

    const hasActiveFilters = !!(startDate || endDate || temaKey || hermanoId)

    return (
        <div suppressHydrationWarning className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-8 sm:pb-12">
            <div suppressHydrationWarning className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 space-y-4 sm:space-y-6 pt-4 sm:pt-6">
                <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <BackButton fallbackUrl="/dashboard" />
                            <div>
                                <h1 suppressHydrationWarning className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight">
                                    {t('temasAlabanza.title')}
                                </h1>
                                <p suppressHydrationWarning className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">
                                    {t('temasAlabanza.desc')}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowStats(!showStats)}
                                disabled={!stats}
                                className="text-xs sm:text-sm px-3 sm:px-4"
                            >
                                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span suppressHydrationWarning className="hidden sm:inline">{t('temasAlabanza.stats')}</span>
                            </Button>
                            <Button
                                variant={showFilters ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                data-filter-button
                                className={`text-xs sm:text-sm px-3 sm:px-4 ${showFilters ? 'bg-primary text-primary-foreground' : ''}`}
                            >
                                <Filter className={`w-3 h-3 sm:w-4 sm:h-4 ${showFilters ? 'animate-pulse' : ''}`} />
                                <span suppressHydrationWarning className="hidden sm:inline">{t('temasAlabanza.filters')}</span>
                                {hasActiveFilters && (
                                    <span className="ml-1 w-2 h-2 rounded-full bg-blue-500" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                ref={filtersPanelRef}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <Card className="border-border/50">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border/50">
                                        <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                            <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span suppressHydrationWarning>{t('temasAlabanza.filters')}</span>
                                        </CardTitle>
                                        <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)} className="h-8 w-8 p-0 rounded-full">
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span suppressHydrationWarning>{t('temasAlabanza.filtersDateRange')}</span>
                                                </label>
                                                <div className="space-y-2">
                                                    <input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm"
                                                    />
                                                    <input
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                                                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span suppressHydrationWarning>{t('temasAlabanza.filtersTema')}</span>
                                                </label>
                                                <select
                                                    value={temaKey}
                                                    onChange={(e) => setTemaKey(e.target.value)}
                                                    className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm"
                                                >
                                                    <option value="" suppressHydrationWarning>{t('temasAlabanza.filtersTemaAll')}</option>
                                                    {temasKeys.map((key) => (
                                                        <option key={key} value={key} suppressHydrationWarning>{t(key)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                                                    <User className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span suppressHydrationWarning>{t('temasAlabanza.filtersHermano')}</span>
                                                </label>
                                                <select
                                                    value={hermanoId}
                                                    onChange={(e) => setHermanoId(e.target.value)}
                                                    className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm"
                                                >
                                                    <option value="" suppressHydrationWarning>{t('temasAlabanza.filtersHermanoAll')}</option>
                                                    {hermanos.map((h) => (
                                                        <option key={h.id} value={h.id}>
                                                            {h.nombre} {h.apellidos}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 border-t border-border/50">
                                            <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto text-xs sm:text-sm">
                                                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                                <span suppressHydrationWarning>{t('temasAlabanza.clearFilters')}</span>
                                            </Button>
                                            <Button onClick={applyFilters} className="w-full sm:w-auto text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white font-black">
                                                <span suppressHydrationWarning>{t('temasAlabanza.applyFilters')}</span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {showStats && stats && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <Card className="border-border/50">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
                                            <span suppressHydrationWarning>{t('temasAlabanza.stats')}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl text-white shadow-xl">
                                                <span className="text-xs font-black uppercase tracking-widest opacity-80">
                                                    {t('temasAlabanza.statsTotal')}
                                                </span>
                                                <p className="text-3xl sm:text-4xl font-black mt-1">{stats.totalUsos}</p>
                                            </div>
                                            <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl text-white shadow-xl">
                                                <span className="text-xs font-black uppercase tracking-widest opacity-80">
                                                    {t('temasAlabanza.statsTemaMasUsado')}
                                                </span>
                                                <p className="text-lg sm:text-2xl font-black mt-1 truncate">
                                                    {stats.temaMasUsado ? t(stats.temaMasUsado.temaKey) : '---'}
                                                </p>
                                                <p className="text-xs opacity-80 mt-1">
                                                    {stats.temaMasUsado?.count ?? 0} usos
                                                </p>
                                            </div>
                                            {stats.hermanoMasUsaTema && (
                                                <div className="p-4 sm:p-6 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl text-white shadow-xl sm:col-span-2">
                                                    <span className="text-xs font-black uppercase tracking-widest opacity-80">
                                                        {t('temasAlabanza.statsHermanoMasUsa')}
                                                    </span>
                                                    <p className="text-lg sm:text-xl font-black mt-1 truncate">
                                                        {stats.hermanoMasUsaTema.hermanoNombre}
                                                    </p>
                                                    <p className="text-xs opacity-80 mt-1">
                                                        {t(stats.hermanoMasUsaTema.temaKey)} · {stats.hermanoMasUsaTema.count} veces
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {stats.temasPorUso.length > 0 && (
                                            <div className="mt-6 pt-6 border-t border-border/50">
                                                <h3 className="text-sm font-semibold mb-3">Temas por uso</h3>
                                                <div className="space-y-2">
                                                    {stats.temasPorUso.slice(0, 6).map((item) => (
                                                        <div key={item.temaKey} className="flex items-center justify-between gap-2 text-sm">
                                                            <span className="truncate">{t(item.temaKey)}</span>
                                                            <span className="font-bold text-primary">{item.count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Tabla / Lista responsive */}
                <div className="rounded-2xl border border-border/50 bg-card shadow-lg overflow-hidden">
                    {data.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center">
                            <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground/50 mb-4" />
                            <h3 suppressHydrationWarning className="text-lg font-bold text-foreground">
                                {t('temasAlabanza.noResults')}
                            </h3>
                            <p suppressHydrationWarning className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                                {t('temasAlabanza.noResultsDesc')}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop: tabla */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border/50 bg-muted/30">
                                            <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                {t('temasAlabanza.tableFecha')}
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                {t('temasAlabanza.tableCulto')}
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                {t('temasAlabanza.tableTema')}
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                {t('temasAlabanza.tableLectura')}
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                {t('temasAlabanza.tableHermano')}
                                            </th>
                                            <th className="w-12" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((r) => (
                                            <tr
                                                key={r.id}
                                                className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                                                onClick={() => setSelectedRegistro(r)}
                                            >
                                                <td className="py-3 px-4 text-sm font-medium">
                                                    {format(parseISO(r.fecha), 'PP', { locale })}
                                                </td>
                                                <td className="py-3 px-4 text-sm">
                                                    {r.tipo_culto?.nombre || 'Alabanza'}
                                                </td>
                                                <td className="py-3 px-4 text-sm font-semibold text-primary">
                                                    {t(r.tema_key)}
                                                </td>
                                                <td className="py-3 px-4 text-sm">
                                                    {r.lectura_intro ? formatCita(r.lectura_intro) : t('temasAlabanza.noLectura')}
                                                </td>
                                                <td className="py-3 px-4 text-sm">
                                                    {r.usuario_intro
                                                        ? `${r.usuario_intro.nombre || ''} ${r.usuario_intro.apellidos || ''}`.trim() || '—'
                                                        : '—'}
                                                </td>
                                                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                                    <Link
                                                        href={`/dashboard/cultos/${r.culto_id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        {t('temasAlabanza.verCulto')}
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Móvil/Tablet: tarjetas */}
                            <div className="md:hidden divide-y divide-border/30">
                                {data.map((r) => (
                                    <div
                                        key={r.id}
                                        onClick={() => setSelectedRegistro(r)}
                                        className="flex items-start justify-between gap-2 p-4 hover:bg-muted/20 transition-colors cursor-pointer touch-manipulation"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-primary">{t(r.tema_key)}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {format(parseISO(r.fecha), 'PP', { locale })} · {r.tipo_culto?.nombre || 'Alabanza'}
                                            </p>
                                            {r.lectura_intro && (
                                                <p className="text-xs font-medium mt-1 flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3 shrink-0" />
                                                    {formatCita(r.lectura_intro)}
                                                </p>
                                            )}
                                            <p className="text-xs font-medium mt-1">
                                                {r.usuario_intro
                                                    ? `${r.usuario_intro.nombre || ''} ${r.usuario_intro.apellidos || ''}`.trim()
                                                    : '—'}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/dashboard/cultos/${r.culto_id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="shrink-0 p-2 -m-2 rounded-lg hover:bg-muted/50 transition-colors"
                                            aria-label={t('temasAlabanza.verCulto')}
                                        >
                                            <ExternalLink className="w-4 h-4 text-primary" />
                                        </Link>
                                    </div>
                                ))}
                            </div>

                            {/* Paginación */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border/50 bg-muted/20">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => changePage(currentPage - 1)}
                                        disabled={currentPage <= 1 || isLoading}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span suppressHydrationWarning className="hidden sm:inline">{t('temasAlabanza.previous')}</span>
                                    </Button>
                                    <span suppressHydrationWarning className="text-sm font-medium">
                                        {t('temasAlabanza.pageOf').replace('{current}', String(currentPage)).replace('{total}', String(totalPages))}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => changePage(currentPage + 1)}
                                        disabled={currentPage >= totalPages || isLoading}
                                    >
                                        <span suppressHydrationWarning className="hidden sm:inline">{t('temasAlabanza.next')}</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Modal de detalles */}
                <Modal
                    isOpen={!!selectedRegistro}
                    onClose={() => setSelectedRegistro(null)}
                    title={selectedRegistro ? t(selectedRegistro.tema_key) : ''}
                    size="md"
                    keyPrefix="temas-alabanza-detail"
                >
                    {selectedRegistro && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="font-semibold text-muted-foreground">{t('temasAlabanza.tableFecha')}:</span>
                                    <p className="font-medium mt-0.5">{format(parseISO(selectedRegistro.fecha), 'PP', { locale })}</p>
                                </div>
                                <div>
                                    <span className="font-semibold text-muted-foreground">{t('temasAlabanza.tableCulto')}:</span>
                                    <p className="font-medium mt-0.5">{selectedRegistro.tipo_culto?.nombre || 'Alabanza'}</p>
                                </div>
                                <div>
                                    <span className="font-semibold text-muted-foreground">{t('temasAlabanza.tableHermano')}:</span>
                                    <p className="font-medium mt-0.5">
                                        {selectedRegistro.usuario_intro
                                            ? `${selectedRegistro.usuario_intro.nombre || ''} ${selectedRegistro.usuario_intro.apellidos || ''}`.trim() || '—'
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <span className="font-semibold text-muted-foreground">{t('temasAlabanza.tableLectura')}:</span>
                                    <p className="font-medium mt-0.5 flex items-center gap-1.5">
                                        {selectedRegistro.lectura_intro ? (
                                            <>
                                                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                                                {formatCita(selectedRegistro.lectura_intro)}
                                            </>
                                        ) : (
                                            t('temasAlabanza.noLectura')
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-border/50">
                                <Link
                                    href={`/dashboard/cultos/${selectedRegistro.culto_id}`}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    {t('temasAlabanza.verCulto')}
                                </Link>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </div>
    )
}
