'use client'

/**
 * AuditClient - IDMJI Gestor de Púlpito
 *
 * Historial de auditoría: filtros, búsqueda por descripción/usuario,
 * rango de fechas, exportación total, responsive (cards móvil, tabla desktop).
 *
 * @author Antigravity AI
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getMovimientos, getMovimientosForExport, MovimientoData } from './actions'
import {
    FileText,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Search,
    Download,
    RefreshCcw,
    Filter,
    ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Button } from '@/components/ui/Button'
import { useDebounce } from '@/hooks/use-debounce'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import type { TranslationKey } from '@/lib/i18n/types'

const TIPO_TO_KEY: Record<string, string> = {
    cambio_asignacion: 'audit.type.cambio_asignacion',
    cambio_festivo: 'audit.type.cambio_festivo',
    cambio_himnos_coros: 'audit.type.cambio_himnos_coros',
    asignacion: 'audit.type.assignment',
    lectura: 'audit.type.reading',
    himno: 'audit.type.hymn',
    coro: 'audit.type.chorus',
    culto: 'audit.type.culto'
}

function getTipoColor(tipo: string): string {
    const t = tipo.toLowerCase()
    if (t.includes('asignacion') || t === 'assignment') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    if (t.includes('festivo')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    if (t.includes('himnos') || t.includes('coros') || t === 'himno' || t === 'chorus')
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
    if (t === 'lectura' || t === 'reading') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    if (t === 'culto') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    return 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
}

interface AuditClientProps {
    initialData: MovimientoData[]
    initialTotal: number
    initialTipos: string[]
}

export default function AuditClient({ initialData, initialTotal, initialTipos }: AuditClientProps) {
    const { t, language } = useI18n()
    const [movimientos, setMovimientos] = useState<MovimientoData[]>(initialData)
    const [total, setTotal] = useState(initialTotal)
    const [tipos] = useState<string[]>(initialTipos)
    const [page, setPage] = useState(1)
    const [tipoFilter, setTipoFilter] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const debouncedSearch = useDebounce(searchQuery, 500)

    const limit = 20
    const totalPages = Math.ceil(total / limit)
    const dateLocale = language === 'ca-ES' ? ca : es

    const loadData = useCallback(
        async (pageOverride?: number) => {
            setIsLoading(true)
            const p = pageOverride ?? page
            const result = await getMovimientos(
                p,
                limit,
                tipoFilter || undefined,
                debouncedSearch || undefined,
                dateFrom || undefined,
                dateTo || undefined
            )
            if (result.success && result.data) {
                setMovimientos(result.data.data)
                setTotal(result.data.total)
            } else {
                toast.error(t('audit.errorLoad'))
            }
            setIsLoading(false)
        },
        [page, limit, tipoFilter, debouncedSearch, dateFrom, dateTo, t]
    )

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleFilterChange = useCallback((newTipo: string) => {
        setTipoFilter(newTipo)
        setPage(1)
    }, [])

    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value)
        setPage(1)
    }, [])

    const handleDateFromChange = useCallback((value: string) => {
        setDateFrom(value)
        setPage(1)
    }, [])

    const handleDateToChange = useCallback((value: string) => {
        setDateTo(value)
        setPage(1)
    }, [])

    const getTipoLabel = (tipo: string) => t((TIPO_TO_KEY[tipo] || tipo) as TranslationKey)

    const exportToExcel = useCallback(
        async (exportAll: boolean) => {
            setIsExporting(true)
            try {
                let rows: MovimientoData[]
                if (exportAll) {
                    const result = await getMovimientosForExport(
                        tipoFilter || undefined,
                        debouncedSearch || undefined,
                        dateFrom || undefined,
                        dateTo || undefined
                    )
                    if (!result.success || !result.data) {
                        toast.error(result.error || t('audit.errorLoad'))
                        return
                    }
                    rows = result.data
                } else {
                    rows = movimientos
                }
                const headers = [
                    t('audit.tableDate'),
                    t('audit.tableUser'),
                    t('audit.tableType'),
                    t('audit.tableDescription'),
                    t('audit.tableCulto')
                ]
                const dataRows = rows.map((m) => [
                    format(new Date(m.fecha_hora), 'dd/MM/yyyy HH:mm'),
                    m.usuario ? `${m.usuario.nombre} ${m.usuario.apellidos}` : t('audit.system'),
                    getTipoLabel(m.tipo),
                    m.descripcion || '',
                    m.culto ? format(new Date(m.culto.fecha), 'dd/MM/yyyy') : ''
                ])
                const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoría')
                worksheet['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 50 }, { wch: 15 }]
                XLSX.writeFile(workbook, `auditoria_idmji_${format(new Date(), 'yyyyMMdd')}.xlsx`)
                toast.success(exportAll ? t('audit.exportAll') : t('audit.exportPage'))
            } catch (err) {
                toast.error(t('audit.errorLoad'))
            } finally {
                setIsExporting(false)
            }
        },
        [movimientos, tipoFilter, debouncedSearch, dateFrom, dateTo, t]
    )

    return (
        <div data-testid="audit-page" className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center shadow-xl"
            >
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="p-4 md:p-5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl md:rounded-[1.5rem]">
                        <FileText className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tight">
                            {t('audit.title')}
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base mt-1">
                            {t('audit.desc')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <Button
                        onClick={() => exportToExcel(false)}
                        disabled={isExporting || movimientos.length === 0}
                        variant="outline"
                        className="rounded-xl md:rounded-2xl h-12 px-4 md:px-6 font-bold text-xs"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {t('audit.exportPage')}
                    </Button>
                    <Button
                        onClick={() => exportToExcel(true)}
                        disabled={isExporting}
                        className="rounded-xl md:rounded-2xl h-12 px-4 md:px-6 font-black uppercase tracking-widest text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {isExporting ? (
                            <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        {t('audit.exportAll')}
                    </Button>
                </div>
            </motion.div>

            {/* Filtros */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-panel rounded-2xl p-4 md:p-6 space-y-4"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4"
                            aria-hidden
                        />
                        <input
                            data-testid="audit-search"
                            type="search"
                            placeholder={t('audit.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            aria-label={t('audit.searchPlaceholder')}
                            className="w-full pl-10 pr-4 h-12 rounded-xl border border-border bg-muted/30 text-sm font-medium"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-primary w-4 h-4" aria-hidden />
                        <select
                            data-testid="audit-filter-type"
                            value={tipoFilter}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            aria-label={t('audit.filterType')}
                            className="w-full pl-10 pr-10 h-12 rounded-xl border border-border bg-muted/30 text-sm font-bold appearance-none cursor-pointer"
                        >
                            <option value="">{t('audit.filterType')}</option>
                            {tipos.map((tipo) => (
                                <option key={tipo} value={tipo}>
                                    {getTipoLabel(tipo)}
                                </option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rotate-90 pointer-events-none" />
                    </div>

                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => handleDateFromChange(e.target.value)}
                        aria-label={t('audit.datesFrom')}
                        className="h-12 rounded-xl border border-border bg-muted/30 px-4 text-sm font-medium"
                    />

                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => handleDateToChange(e.target.value)}
                        aria-label={t('audit.datesTo')}
                        className="h-12 rounded-xl border border-border bg-muted/30 px-4 text-sm font-medium"
                    />
                </div>

                <div className="flex items-center justify-between pt-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {t('audit.totalRecords')}: <span className="text-primary text-lg">{total}</span>
                    </p>
                </div>
            </motion.div>

            {/* Contenido: Cards móvil / Tabla desktop */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-panel rounded-2xl overflow-hidden shadow-xl"
            >
                {isLoading ? (
                    <div className="p-16 md:p-20 flex flex-col items-center gap-4">
                        <RefreshCcw className="w-10 h-10 text-primary/40 animate-spin" aria-hidden />
                        <p className="text-muted-foreground font-medium">{t('common.loading')}</p>
                    </div>
                ) : movimientos.length === 0 ? (
                    <div className="p-16 md:p-20 flex flex-col items-center gap-4 text-muted-foreground/60">
                        <Search className="w-12 h-12" aria-hidden />
                        <p className="text-lg font-bold">{t('audit.noResults')}</p>
                    </div>
                ) : (
                    <>
                        {/* Vista móvil: cards */}
                        <div data-testid="audit-cards" className="block md:hidden divide-y divide-border/50">
                            {movimientos.map((m, index) => (
                                <AuditCard
                                    key={m.id}
                                    m={m}
                                    index={index}
                                    getTipoLabel={getTipoLabel}
                                    getTipoColor={getTipoColor}
                                    t={t}
                                    dateLocale={dateLocale}
                                />
                            ))}
                        </div>

                        {/* Vista desktop: tabla */}
                        <div data-testid="audit-table" className="hidden md:block overflow-x-auto">
                            <table className="w-full border-collapse" role="table">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border/20">
                                        <th scope="col" className="p-4 lg:p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {t('audit.tableDate')}
                                        </th>
                                        <th scope="col" className="p-4 lg:p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {t('audit.tableUser')}
                                        </th>
                                        <th scope="col" className="p-4 lg:p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {t('audit.tableType')}
                                        </th>
                                        <th scope="col" className="p-4 lg:p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {t('audit.tableDescription')}
                                        </th>
                                        <th scope="col" className="p-4 lg:p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {t('audit.tableCulto')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {movimientos.map((m, index) => (
                                        <motion.tr
                                            key={m.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.2 }}
                                            className="hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="p-4 lg:p-6">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-bold">
                                                            {format(new Date(m.fecha_hora), 'dd MMM yyyy', { locale: dateLocale })}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {format(new Date(m.fecha_hora), 'HH:mm')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 lg:p-6">
                                                {m.usuario ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[10px] text-primary shrink-0">
                                                            {m.usuario.nombre[0]}
                                                            {m.usuario.apellidos[0]}
                                                        </div>
                                                        <span className="text-sm font-bold">
                                                            {m.usuario.nombre} {m.usuario.apellidos}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm italic text-muted-foreground">{t('audit.system')}</span>
                                                )}
                                            </td>
                                            <td className="p-4 lg:p-6">
                                                <span
                                                    className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${getTipoColor(m.tipo)}`}
                                                >
                                                    {getTipoLabel(m.tipo)}
                                                </span>
                                            </td>
                                            <td className="p-4 lg:p-6">
                                                <p className="text-sm text-muted-foreground max-w-xs line-clamp-2">
                                                    {m.descripcion || '—'}
                                                </p>
                                            </td>
                                            <td className="p-4 lg:p-6">
                                                {m.culto ? (
                                                    m.culto.id ? (
                                                        <Link
                                                            href={`/dashboard/cultos/${m.culto.id}`}
                                                            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                                                        >
                                                            {format(new Date(m.culto.fecha), 'dd/MM/yyyy')}
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Link>
                                                    ) : (
                                                        <span className="text-sm font-mono">
                                                            {format(new Date(m.culto.fecha), 'dd/MM/yyyy')}
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground/50">—</span>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 md:p-6 bg-muted/30 border-t border-border/10 gap-4">
                        <p className="text-xs font-bold text-muted-foreground">
                            Página {page} / {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                                variant="outline"
                                className="h-10 w-10 p-0 rounded-xl"
                                aria-label="Página anterior"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <Button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isLoading}
                                variant="outline"
                                className="h-10 w-10 p-0 rounded-xl"
                                aria-label="Página siguiente"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

function AuditCard({
    m,
    index,
    getTipoLabel,
    getTipoColor,
    t,
    dateLocale
}: {
    m: MovimientoData
    index: number
    getTipoLabel: (t: string) => string
    getTipoColor: (t: string) => string
    t: (k: TranslationKey) => string
    dateLocale: Locale
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4"
        >
            <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                        <p className="text-sm font-bold">
                            {format(new Date(m.fecha_hora), 'dd MMM yyyy', { locale: dateLocale })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                            {format(new Date(m.fecha_hora), 'HH:mm')}
                        </p>
                    </div>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${getTipoColor(m.tipo)}`}>
                    {getTipoLabel(m.tipo)}
                </span>
            </div>
            <p className="text-sm font-medium mb-1">
                {m.usuario ? `${m.usuario.nombre} ${m.usuario.apellidos}` : t('audit.system')}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{m.descripcion || '—'}</p>
            {m.culto && (
                <div className="flex items-center gap-1">
                    {m.culto.id ? (
                        <Link
                            href={`/dashboard/cultos/${m.culto.id}`}
                            className="text-xs font-bold text-primary inline-flex items-center gap-1"
                        >
                            {format(new Date(m.culto.fecha), 'dd/MM/yyyy')}
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    ) : (
                        <span className="text-xs font-mono">{format(new Date(m.culto.fecha), 'dd/MM/yyyy')}</span>
                    )}
                </div>
            )}
        </motion.div>
    )
}
