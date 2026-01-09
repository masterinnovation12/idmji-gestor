'use client'

/**
 * AuditClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para visualizar el historial de auditoría del sistema.
 * Permite filtrar por tipo de movimiento, buscar por descripción y exportar los datos.
 * 
 * Características:
 * - Filtrado dinámico por tipo de acción.
 * - Búsqueda en tiempo real con debounce.
 * - Exportación a formato CSV.
 * - Diseño Glassmorphism responsive con animaciones Framer Motion.
 * 
 * @author Antigravity AI
 * @date 2025-12-24
 */

import { useState, useEffect, useCallback } from 'react'
import { getMovimientos, MovimientoData } from './actions'
import { FileText, ChevronLeft, ChevronRight, Calendar, Search, Download, RefreshCcw, LayoutList, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Button } from '@/components/ui/Button'
import { useDebounce } from '@/hooks/use-debounce'
import * as XLSX from 'xlsx'

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
    const [isLoading, setIsLoading] = useState(false)
    const debouncedSearch = useDebounce(searchQuery, 500)

    const limit = 20
    const totalPages = Math.ceil(total / limit)
    const dateLocale = language === 'ca-ES' ? ca : es

    const loadData = useCallback(async () => {
        setIsLoading(true)
        const result = await getMovimientos(page, limit, tipoFilter || undefined, debouncedSearch || undefined)
        if (result.success && result.data) {
            setMovimientos(result.data.data)
            setTotal(result.data.total)
        }
        setIsLoading(false)
    }, [page, limit, tipoFilter, debouncedSearch])

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData()
        }, 0)
        return () => clearTimeout(timer)
    }, [loadData])

    // Reiniciar página al filtrar o buscar
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1)
        }, 0)
        return () => clearTimeout(timer)
    }, [tipoFilter, debouncedSearch])

    function getTipoColor(tipo: string): string {
        switch (tipo.toLowerCase()) {
            case 'asignacion':
            case 'assignment': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            case 'lectura':
            case 'reading': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            case 'himno':
            case 'hymn': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            case 'coro':
            case 'chorus': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            case 'culto': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
        }
    }

    const exportToExcel = () => {
        const headers = ["Fecha", "Usuario", "Tipo", "Descripción", "Culto"]
        const rows = movimientos.map(m => [
            format(new Date(m.fecha_hora), "dd/MM/yyyy HH:mm"),
            m.usuario ? `${m.usuario.nombre} ${m.usuario.apellidos}` : t('audit.system'),
            m.tipo,
            m.descripcion || "",
            m.culto ? format(new Date(m.culto.fecha), "dd/MM/yyyy") : ""
        ])

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoría")

        // Ajustar anchos de columna
        const wscols = [
            { wch: 20 },
            { wch: 30 },
            { wch: 15 },
            { wch: 50 },
            { wch: 15 }
        ]
        worksheet['!cols'] = wscols

        XLSX.writeFile(workbook, `auditoria_idmji_${format(new Date(), "yyyyMMdd")}.xlsx`)
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            {/* Header con estilo Premium */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[2.5rem] p-8 md:p-10 flex flex-col lg:flex-row gap-8 justify-between items-center shadow-2xl relative overflow-visible z-50"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                <div className="flex items-center gap-6 relative z-10">
                    <div className="p-5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-[1.5rem] shadow-inner-white">
                        <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            {t('audit.title')}
                        </h1>
                        <p className="text-muted-foreground font-medium mt-1">
                            {t('audit.desc')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto relative z-10">
                    <Button
                        onClick={exportToExcel}
                        className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:shadow-primary/40 bg-primary text-black dark:text-white hover:scale-105 transition-all duration-300 border-none"
                    >
                        <Download className="w-5 h-5 mr-2" />
                        {t('audit.export')}
                    </Button>
                </div>
            </motion.div>

            {/* Filtros y Búsqueda */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-40">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-3 glass rounded-[2rem] p-5 flex flex-col md:flex-row gap-5 shadow-xl border border-white/10"
                >
                    <div className="relative flex-1 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder={t('audit.searchPlaceholder')}
                            className="w-full pl-14 pr-6 h-14 bg-muted/30 dark:bg-muted/10 rounded-2xl border-none outline-none focus:ring-2 focus:ring-primary/30 transition-all font-bold tracking-tight text-sm placeholder:font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="relative min-w-[240px] group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 p-2 bg-primary/10 rounded-xl pointer-events-none group-focus-within:bg-primary/20 transition-all">
                            <Filter className="text-primary w-4 h-4" />
                        </div>
                        <select
                            className="w-full pl-16 pr-10 h-14 bg-white/80 dark:bg-muted/20 backdrop-blur-md rounded-2xl border-2 border-primary/20 outline-none appearance-none cursor-pointer focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-black uppercase tracking-widest text-[11px] text-primary shadow-sm"
                            value={tipoFilter}
                            onChange={(e) => {
                                setPage(1)
                                setTipoFilter(e.target.value)
                            }}
                        >
                            <option value="" className="font-bold text-foreground">{t('audit.filterType')}</option>
                            {tipos.map(t => (
                                <option key={t} value={t} className="font-bold text-foreground">{t.toUpperCase()}</option>
                            ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronRight className="w-4 h-4 text-primary rotate-90" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-[2rem] p-6 flex items-center justify-between shadow-xl border border-white/10 group hover:border-primary/30 transition-all"
                >
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                            {t('audit.totalRecords')}
                        </p>
                        <span className="text-4xl font-black text-primary drop-shadow-md group-hover:scale-110 transition-transform block">
                            {total}
                        </span>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary/20 transition-all">
                        <LayoutList className="w-8 h-8 text-primary" />
                    </div>
                </motion.div>
            </div>

            {/* Tabla de Resultados */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-[2.5rem] overflow-hidden shadow-2xl border-none no-scrollbar"
            >
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border/20">
                                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('audit.tableDate')}</th>
                                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('audit.tableUser')}</th>
                                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('audit.tableType')}</th>
                                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('audit.tableDescription')}</th>
                                <th className="p-6 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('audit.tableCulto')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10">
                            <AnimatePresence mode="popLayout">
                                {isLoading ? (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <td colSpan={5} className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <RefreshCcw className="w-10 h-10 text-primary/40 animate-spin" />
                                                <p className="text-muted-foreground font-medium animate-pulse">{t('common.loading')}</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : movimientos.length === 0 ? (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <td colSpan={5} className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-40">
                                                <Search className="w-12 h-12" />
                                                <p className="text-xl font-bold">{t('audit.noResults')}</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    movimientos.map((m, index) => (
                                        <motion.tr
                                            key={m.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="group hover:bg-primary/[0.02] transition-colors"
                                        >
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-muted/50 rounded-xl group-hover:bg-primary/10 transition-colors">
                                                        <Calendar className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{format(new Date(m.fecha_hora), "dd MMM yyyy", { locale: dateLocale })}</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium">{format(new Date(m.fecha_hora), "HH:mm")}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {m.usuario ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-black text-[10px] text-primary">
                                                            {m.usuario.nombre[0]}{m.usuario.apellidos[0]}
                                                        </div>
                                                        <span className="text-sm font-bold">{m.usuario.nombre} {m.usuario.apellidos}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 opacity-60">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                            <RefreshCcw className="w-4 h-4 text-slate-400" />
                                                        </div>
                                                        <span className="text-sm font-medium italic">{t('audit.system')}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getTipoColor(m.tipo)}`}>
                                                    {m.tipo}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-sm text-muted-foreground font-medium max-w-sm line-clamp-2">
                                                    {m.descripcion || '-'}
                                                </p>
                                            </td>
                                            <td className="p-6">
                                                {m.culto ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                        <span className="text-xs font-bold font-mono">
                                                            {format(new Date(m.culto.fecha), "dd/MM/yyyy")}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground/40">—</span>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Pagination Premium */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-8 bg-muted/30 border-t border-border/10 gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Página</span>
                            <div className="flex items-center justify-center w-8 h-8 bg-primary text-white rounded-lg font-black text-xs shadow-lg shadow-primary/30">
                                {page}
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">de {totalPages}</span>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                                variant="outline"
                                className="w-12 h-12 p-0 rounded-2xl hover:bg-primary hover:text-white transition-all duration-300 disabled:opacity-30 border-none shadow-lg"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </Button>
                            <Button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isLoading}
                                variant="outline"
                                className="w-12 h-12 p-0 rounded-2xl hover:bg-primary hover:text-white transition-all duration-300 disabled:opacity-30 border-none shadow-lg"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
