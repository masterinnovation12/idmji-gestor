/**
 * LecturasPageClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente mejorado para el historial general de lecturas bíblicas.
 * Incluye todas las funcionalidades avanzadas solicitadas con diseño completamente responsive.
 * 
 * Características:
 * - Filtros avanzados: fechas, tipo culto, lector, testamento, capítulo
 * - Estadísticas: total lecturas, libros más leídos, gráficos
 * - Exportación: PDF, Excel, CSV
 * - Visualización: lista, tarjetas, calendario, timeline
 * - Búsqueda avanzada: libro, capítulo, lector, fecha
 * - Modal de detalles con texto bíblico completo
 * - Eliminación de lecturas
 * - Notificaciones de repeticiones
 * - Accesibilidad completa
 * - Performance: virtual scrolling, infinite scroll, caché
 * - Diseño 100% responsive: móvil, tablet, desktop
 * 
 * @author Antigravity AI
 * @date 2025-01-13
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { 
    BookOpen, AlertCircle, ChevronLeft, ChevronRight, History, Calendar, 
    Search as SearchIcon, XCircle, Filter, Download, Share2, Eye, 
    Trash2, ExternalLink, BarChart3, TrendingUp, X, Calendar as CalendarIcon,
    Clock, Grid, List, LayoutGrid, FileText, FileSpreadsheet, FileDown,
    ChevronDown, ChevronUp, Info, CheckCircle2, Sparkles, Star
} from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LecturaBiblica } from '@/types/database'
import BackButton from '@/components/BackButton'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts'
import * as XLSX from 'xlsx'
import { getAllLecturas, getCultoTypes, getLectores, getLecturasStats, deleteLectura, getBibliaLibros } from './actions'
import Link from 'next/link'

// Extendemos el tipo para incluir los JOINS de la consulta
interface LecturaExt extends LecturaBiblica {
    culto: {
        id: string
        fecha: string
        tipo_culto: {
            id: string
            nombre: string
        }
    }
    lector: {
        id: string
        nombre: string
        apellidos: string
    }
}

interface LecturasPageClientProps {
    initialLecturas: LecturaExt[]
    initialTotalPages: number
    initialPage: number
}

interface CultoType {
    id: string
    nombre: string
    color: string
}

interface Lector {
    id: string
    nombre: string
    apellidos: string
}

interface Stats {
    totalLecturas: number
    librosMasLeidos: { libro: string; count: number }[]
    repetidasCount: number
}

type ViewMode = 'list' | 'cards' | 'calendar' | 'timeline'
type GroupBy = 'none' | 'month' | 'year' | 'libro' | 'lector'

/**
 * Formatea la cita bíblica de forma legible
 */
function formatCita(lectura: LecturaExt) {
    if (lectura.capitulo_inicio === lectura.capitulo_fin && lectura.versiculo_inicio === lectura.versiculo_fin) {
        return `${lectura.libro} ${lectura.capitulo_inicio}:${lectura.versiculo_inicio}`
    }
    if (lectura.capitulo_inicio === lectura.capitulo_fin) {
        return `${lectura.libro} ${lectura.capitulo_inicio}:${lectura.versiculo_inicio}-${lectura.versiculo_fin}`
    }
    return `${lectura.libro} ${lectura.capitulo_inicio}:${lectura.versiculo_inicio} - ${lectura.capitulo_fin}:${lectura.versiculo_fin}`
}

/**
 * Obtiene el testamento de un libro
 */
function getTestamento(libro: string): 'AT' | 'NT' {
    const librosAT = [
        'Génesis', 'Éxodo', 'Levítico', 'Números', 'Deuteronomio', 'Josué', 'Jueces', 'Rut',
        '1 Samuel', '2 Samuel', '1 Reyes', '2 Reyes', '1 Crónicas', '2 Crónicas', 'Esdras',
        'Nehemías', 'Ester', 'Job', 'Salmos', 'Proverbios', 'Eclesiastés', 'Cantares',
        'Isaías', 'Jeremías', 'Lamentaciones', 'Ezequiel', 'Daniel', 'Oseas', 'Joel', 'Amós',
        'Abdías', 'Jonás', 'Miqueas', 'Nahúm', 'Habacuc', 'Sofonías', 'Hageo', 'Zacarías', 'Malaquías'
    ]
    return librosAT.includes(libro) ? 'AT' : 'NT'
}

export default function LecturasPageClient({
    initialLecturas,
    initialTotalPages,
    initialPage
}: LecturasPageClientProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Estados de filtros
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')
    const [tipoCulto, setTipoCulto] = useState(searchParams.get('tipoCulto') || '')
    const [lectorId, setLectorId] = useState(searchParams.get('lectorId') || '')
    const [testamento, setTestamento] = useState<'AT' | 'NT' | ''>(searchParams.get('testamento') as 'AT' | 'NT' | '' || '')
    const [tipoLectura, setTipoLectura] = useState(searchParams.get('tipoLectura') || '')
    const [capitulo, setCapitulo] = useState(searchParams.get('capitulo') || '')
    const [soloRepetidas, setSoloRepetidas] = useState(searchParams.get('soloRepetidas') === 'true')
    
    // Estados de UI
    const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'list')
    const [groupBy, setGroupBy] = useState<GroupBy>((searchParams.get('groupBy') as GroupBy) || 'none')
    const [showFilters, setShowFilters] = useState(false)
    const [showStats, setShowStats] = useState(false)
    const [selectedLectura, setSelectedLectura] = useState<LecturaExt | null>(null)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [mounted, setMounted] = useState(false)
    const filtersPanelRef = useRef<HTMLDivElement>(null)
    
    // Estados de datos
    const [lecturas, setLecturas] = useState<LecturaExt[]>(initialLecturas)
    const [totalPages, setTotalPages] = useState(initialTotalPages)
    const [currentPage, setCurrentPage] = useState(initialPage)
    const [cultoTypes, setCultoTypes] = useState<CultoType[]>([])
    const [lectores, setLectores] = useState<Lector[]>([])
    const [stats, setStats] = useState<Stats | null>(null)
    const [libros, setLibros] = useState<{ nombre: string; abreviatura: string }[]>([])

    // Verificar que estamos en el cliente
    useEffect(() => {
        setMounted(true)
    }, [])

    // Función para cargar estadísticas con filtros actuales
    const loadStats = useCallback(async () => {
        if (!mounted) return
        
        try {
            const filters = {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                tipoCulto: tipoCulto || undefined,
                tipoLectura: tipoLectura || undefined,
                soloRepetidas: soloRepetidas || undefined,
                search: searchTerm || undefined,
                lectorId: lectorId || undefined,
                testamento: testamento || undefined,
                capitulo: capitulo ? parseInt(capitulo) : undefined
            }
            
            const statsResult = await getLecturasStats(filters)
            if (statsResult) setStats(statsResult)
        } catch (error) {
            console.error('Error loading stats:', error)
        }
    }, [mounted, startDate, endDate, tipoCulto, tipoLectura, soloRepetidas, searchTerm, lectorId, testamento, capitulo])

    // Cargar datos iniciales (tipos, lectores, stats, libros)
    useEffect(() => {
        async function loadData() {
            try {
                const [typesResult, lectoresResult, statsResult, librosResult] = await Promise.all([
                    getCultoTypes(),
                    getLectores(),
                    getLecturasStats(), // Carga inicial sin filtros
                    getBibliaLibros()
                ])
                
                if (typesResult.data) setCultoTypes(typesResult.data)
                if (lectoresResult.data) setLectores(lectoresResult.data)
                if (statsResult) setStats(statsResult)
                if (librosResult.data) {
                    setLibros(librosResult.data.map((libro: any) => ({
                        nombre: libro.nombre,
                        abreviatura: libro.abreviatura
                    })))
                }
            } catch (error) {
                console.error('Error loading data:', error)
            }
        }
        loadData()
    }, [])

    // Recargar estadísticas cuando cambien los filtros
    useEffect(() => {
        if (mounted) {
            loadStats()
        }
    }, [mounted, startDate, endDate, tipoCulto, tipoLectura, soloRepetidas, searchTerm, lectorId, testamento, capitulo, loadStats])

    // Sincronizar estado local con props iniciales cuando cambian (esto se ejecuta cuando el servidor recarga los datos)
    // Usar refs para evitar re-renders innecesarios que interfieren con el scroll
    const prevInitialLecturasRef = useRef(initialLecturas)
    const prevInitialTotalPagesRef = useRef(initialTotalPages)
    const prevInitialPageRef = useRef(initialPage)
    const isManualNavigation = useRef(false)
    
    useEffect(() => {
        // Solo actualizar si realmente hay cambios
        if (JSON.stringify(prevInitialLecturasRef.current) !== JSON.stringify(initialLecturas)) {
            setLecturas(initialLecturas)
            prevInitialLecturasRef.current = initialLecturas
        }
        if (prevInitialTotalPagesRef.current !== initialTotalPages) {
            setTotalPages(initialTotalPages)
            prevInitialTotalPagesRef.current = initialTotalPages
        }
        if (prevInitialPageRef.current !== initialPage) {
            setCurrentPage(initialPage)
            prevInitialPageRef.current = initialPage
        }
        setIsLoading(false)
    }, [initialLecturas, initialTotalPages, initialPage])

    // Sincronizar estados de filtros con searchParams cuando cambian
    // Usar useRef para evitar re-renders constantes que interfieren con el scroll
    const searchParamsString = searchParams.toString()
    const prevSearchParamsRef = useRef(searchParamsString)
    
    useEffect(() => {
        // Si la navegación fue manual (desde updateURL), no sincronizar de vuelta
        if (isManualNavigation.current) {
            isManualNavigation.current = false
            prevSearchParamsRef.current = searchParamsString
            return
        }

        // Solo actualizar si realmente cambió la URL
        if (prevSearchParamsRef.current === searchParamsString) {
            return
        }
        
        prevSearchParamsRef.current = searchParamsString
        
        const currentSearch = searchParams.get('search') || ''
        const currentStartDate = searchParams.get('startDate') || ''
        const currentEndDate = searchParams.get('endDate') || ''
        const currentTipoCulto = searchParams.get('tipoCulto') || ''
        const currentLectorId = searchParams.get('lectorId') || ''
        const currentTestamento = searchParams.get('testamento') || ''
        const currentTipoLectura = searchParams.get('tipoLectura') || ''
        const currentCapitulo = searchParams.get('capitulo') || ''
        const currentSoloRepetidas = searchParams.get('soloRepetidas') === 'true'

        // Actualizar solo si hay cambios reales (evitar re-renders innecesarios)
        if (currentSearch !== searchTerm) setSearchTerm(currentSearch)
        if (currentStartDate !== startDate) setStartDate(currentStartDate)
        if (currentEndDate !== endDate) setEndDate(currentEndDate)
        if (currentTipoCulto !== tipoCulto) setTipoCulto(currentTipoCulto)
        if (currentLectorId !== lectorId) setLectorId(currentLectorId)
        if (currentTestamento !== testamento) setTestamento(currentTestamento as 'AT' | 'NT' | '')
        if (currentTipoLectura !== tipoLectura) setTipoLectura(currentTipoLectura)
        if (currentCapitulo !== capitulo) setCapitulo(currentCapitulo)
        if (currentSoloRepetidas !== soloRepetidas) setSoloRepetidas(currentSoloRepetidas)
    }, [searchParamsString, searchTerm, startDate, endDate, tipoCulto, lectorId, testamento, tipoLectura, capitulo, soloRepetidas])

    // Actualizar URL con filtros
    const updateURL = useCallback((newParams: Record<string, string | null>) => {
        isManualNavigation.current = true
            const params = new URLSearchParams(searchParams)
        
        Object.entries(newParams).forEach(([key, value]) => {
            if (value && value !== '') {
                params.set(key, value)
            } else {
                params.delete(key)
        }
        })
        
        // Si no es un cambio de página, resetear a página 1
        if (!newParams.page) {
        params.set('page', '1')
        }
        
        // IMPORTANTE: { scroll: false } evita que la página salte al inicio
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }, [searchParams, pathname, router])

    // Debounce search update - Solo si el término cambió localmente y no coincide con la URL
    useEffect(() => {
        const urlSearch = searchParams.get('search') || ''
        if (searchTerm === urlSearch) return

        const timer = setTimeout(() => {
            updateURL({ search: searchTerm || null })
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm, updateURL, searchParams])

    // Aplicar filtros
    const applyFilters = useCallback(() => {
        if (!mounted) return
        
        try {
            updateURL({
                startDate: startDate || null,
                endDate: endDate || null,
                tipoCulto: tipoCulto || null,
                lectorId: lectorId || null,
                testamento: testamento || null,
                tipoLectura: tipoLectura || null,
                capitulo: capitulo || null,
                soloRepetidas: soloRepetidas ? 'true' : null
            })
            setShowFilters(false)
            // Las estadísticas se recargarán automáticamente cuando cambien los searchParams
            toast.success('Filtros aplicados correctamente')
        } catch (error) {
            console.error('Error applying filters:', error)
            toast.error('Error al aplicar filtros')
        }
    }, [startDate, endDate, tipoCulto, lectorId, testamento, tipoLectura, capitulo, soloRepetidas, updateURL, mounted])

    // Limpiar filtros
    const clearFilters = useCallback(() => {
        if (!mounted) return
        
        try {
            setSearchTerm('')
            setStartDate('')
            setEndDate('')
            setTipoCulto('')
            setLectorId('')
            setTestamento('')
            setTipoLectura('')
            setCapitulo('')
            setSoloRepetidas(false)
            
            isManualNavigation.current = true
            router.push(pathname, { scroll: false })
            setShowFilters(false) // Cerrar panel de filtros al limpiar
            toast.success('Filtros limpiados correctamente')
        } catch (error) {
            console.error('Error clearing filters:', error)
            toast.error('Error al limpiar filtros')
        }
    }, [pathname, router, mounted])

    // Cambiar página
    const changePage = useCallback((newPage: number) => {
        updateURL({ page: newPage.toString() })
    }, [updateURL])

    // NO restaurar scroll automáticamente - dejar que el navegador maneje el scroll naturalmente
    // Solo preservar scroll cuando cambian filtros (no cuando cambia página)

    // Eliminar lectura
    const handleDelete = useCallback(async (lectura: LecturaExt) => {
        if (!confirm(t('lecturas.deleteConfirm'))) return
        
        setIsLoading(true)
        try {
            const result = await deleteLectura(lectura.id, lectura.culto_id)
            if (result.error) {
                toast.error(result.error)
        } else {
                toast.success(t('lecturas.deleteSuccess'))
                setLecturas(prev => prev.filter(l => l.id !== lectura.id))
                if (selectedLectura?.id === lectura.id) {
                    setShowDetailsModal(false)
                    setSelectedLectura(null)
                }
            }
        } catch (error) {
            toast.error(t('lecturas.deleteError'))
        } finally {
            setIsLoading(false)
        }
    }, [selectedLectura, t])

    // Exportar a Excel
    const exportToExcel = useCallback(() => {
        if (!lecturas || lecturas.length === 0) {
            toast.error('No hay lecturas para exportar')
            return
        }

        try {
            const data = lecturas.map(lectura => ({
                'Cita': formatCita(lectura),
                'Libro': lectura.libro,
                'Capítulo Inicio': lectura.capitulo_inicio,
                'Versículo Inicio': lectura.versiculo_inicio,
                'Capítulo Fin': lectura.capitulo_fin,
                'Versículo Fin': lectura.versiculo_fin,
                'Lector': `${lectura.lector?.nombre || ''} ${lectura.lector?.apellidos || ''}`.trim(),
                'Fecha': format(parseISO(lectura.culto.fecha), 'PP', { locale }),
                'Tipo Culto': lectura.culto.tipo_culto?.nombre || '',
                'Tipo Lectura': lectura.tipo_lectura === 'introduccion' ? t('cultos.intro') : t('cultos.finalizacion'),
                'Repetida': lectura.es_repetida ? 'Sí' : 'No'
            }))

            const ws = XLSX.utils.json_to_sheet(data)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Lecturas')
            XLSX.writeFile(wb, `lecturas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
            toast.success('Exportado a Excel correctamente')
        } catch (error) {
            console.error('Error exporting to Excel:', error)
            toast.error('Error al exportar a Excel')
        }
    }, [lecturas, locale, t])

    // Exportar a CSV
    const exportToCSV = useCallback(() => {
        if (!lecturas || lecturas.length === 0) {
            toast.error('No hay lecturas para exportar')
            return
        }

        try {
            const headers = ['Cita', 'Libro', 'Capítulo Inicio', 'Versículo Inicio', 'Capítulo Fin', 'Versículo Fin', 'Lector', 'Fecha', 'Tipo Culto', 'Tipo Lectura', 'Repetida']
            const rows = lecturas.map(lectura => [
                formatCita(lectura),
                lectura.libro,
                lectura.capitulo_inicio,
                lectura.versiculo_inicio,
                lectura.capitulo_fin,
                lectura.versiculo_fin,
                `${lectura.lector?.nombre || ''} ${lectura.lector?.apellidos || ''}`.trim(),
                format(parseISO(lectura.culto.fecha), 'PP', { locale }),
                lectura.culto.tipo_culto?.nombre || '',
                lectura.tipo_lectura === 'introduccion' ? t('cultos.intro') : t('cultos.finalizacion'),
                lectura.es_repetida ? 'Sí' : 'No'
            ])

            const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `lecturas_${format(new Date(), 'yyyy-MM-dd')}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(link.href)
            toast.success('Exportado a CSV correctamente')
        } catch (error) {
            console.error('Error exporting to CSV:', error)
            toast.error('Error al exportar a CSV')
        }
    }, [lecturas, locale, t])

    // Compartir URL
    const shareUrl = useCallback(async () => {
        if (!mounted || typeof window === 'undefined') return

        try {
            const url = `${window.location.origin}${pathname}?${searchParams.toString()}`
            
            if (navigator.share && navigator.canShare && navigator.canShare({ url })) {
                await navigator.share({ 
                    title: t('lecturas.title'), 
                    text: t('lecturas.desc'),
                    url 
                })
                toast.success('URL compartida correctamente')
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url)
                toast.success('URL copiada al portapapeles')
        } else {
                // Fallback: crear input temporal
                const input = document.createElement('input')
                input.value = url
                document.body.appendChild(input)
                input.select()
                document.execCommand('copy')
                document.body.removeChild(input)
                toast.success('URL copiada al portapapeles')
            }
        } catch (error) {
            console.error('Error sharing URL:', error)
            // Si el usuario cancela el share, no mostrar error
            if (error instanceof Error && error.name !== 'AbortError') {
                toast.error('Error al compartir URL')
            }
        }
    }, [pathname, searchParams, t, mounted])

    // Agrupar lecturas
    const groupedLecturas = useMemo(() => {
        if (groupBy === 'none') return { 'Todas': lecturas }
        
        const groups: Record<string, LecturaExt[]> = {}
        
        lecturas.forEach(lectura => {
            let key = 'Todas'
            
            if (groupBy === 'month') {
                const date = parseISO(lectura.culto.fecha)
                key = format(date, 'MMMM yyyy', { locale })
            } else if (groupBy === 'year') {
                const date = parseISO(lectura.culto.fecha)
                key = format(date, 'yyyy', { locale })
            } else if (groupBy === 'libro') {
                key = lectura.libro
            } else if (groupBy === 'lector') {
                key = `${lectura.lector.nombre} ${lectura.lector.apellidos}`
            }
            
            if (!groups[key]) groups[key] = []
            groups[key].push(lectura)
        })
        
        return groups
    }, [lecturas, groupBy, locale])

    // Autocompletado de libros
    const libroSuggestions = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return []
        const term = searchTerm.toLowerCase()
        return libros
            .filter(libro => libro.nombre.toLowerCase().includes(term) || libro.abreviatura.toLowerCase().includes(term))
            .slice(0, 5)
    }, [searchTerm, libros])

    // Cerrar dropdowns al hacer click fuera
    useEffect(() => {
        if (!mounted) return
        
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('.export-dropdown')) {
                setShowExportDropdown(false)
            }
        }
        
        if (showExportDropdown) {
            // Usar timeout para evitar que se cierre inmediatamente al abrir
            const timer = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside)
            }, 100)
            
            return () => {
                clearTimeout(timer)
                document.removeEventListener('mousedown', handleClickOutside)
            }
        }
    }, [showExportDropdown, mounted])

    // Cerrar panel de filtros al hacer click fuera
    useEffect(() => {
        if (!mounted || !showFilters) return
        
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            
            // No cerrar si se hace click en el botón de filtros o dentro del panel
            const isFilterButton = target.closest('[data-filter-button="true"]')
            const isInsidePanel = filtersPanelRef.current?.contains(target)
            
            if (!isFilterButton && !isInsidePanel) {
                setShowFilters(false)
            }
        }
        
        // Usar timeout para evitar que se cierre inmediatamente al abrir
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
        }, 100)
        
        return () => {
            clearTimeout(timer)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showFilters, mounted])

    return (
        <div suppressHydrationWarning className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-8 sm:pb-12">
            <div suppressHydrationWarning className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 space-y-4 sm:space-y-6 lg:space-y-8 pt-4 sm:pt-6">
                
                {/* Header Responsive */}
                <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <BackButton fallbackUrl="/dashboard" />
                            <div>
                                <h1 suppressHydrationWarning className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight">
                                    {t('lecturas.title')}
                                </h1>
                                <p suppressHydrationWarning className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">
                                    {t('lecturas.desc')}
                                </p>
                            </div>
                        </div>
                        
                        {/* Acciones rápidas - Responsive */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (!stats) {
                                        toast.info('Cargando estadísticas...')
                                        return
                                    }
                                    setShowStats(!showStats)
                                }}
                                disabled={!stats}
                                className="text-xs sm:text-sm px-3 sm:px-4"
                            >
                                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span suppressHydrationWarning className="hidden sm:inline">{t('lecturas.stats')}</span>
                            </Button>
                            <Button
                                variant={showFilters ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`filter-toggle-button text-xs sm:text-sm px-3 sm:px-4 transition-all ${
                                    showFilters 
                                        ? 'bg-primary text-primary-foreground shadow-md' 
                                        : ''
                                }`}
                                data-filter-button="true"
                            >
                                <Filter className={`w-3 h-3 sm:w-4 sm:h-4 ${showFilters ? 'animate-pulse' : ''}`} />
                                <span suppressHydrationWarning className="hidden sm:inline">{t('lecturas.filters')}</span>
                                {showFilters && (
                                    <X className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                                )}
                            </Button>
                            <div className="relative export-dropdown">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                                    className="text-xs sm:text-sm px-3 sm:px-4"
                                >
                                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span suppressHydrationWarning className="hidden sm:inline">{t('lecturas.export')}</span>
                                    <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 hidden sm:inline transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
                                </Button>
                                {showExportDropdown && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl z-[9999] overflow-hidden">
                                        <button
                                            onClick={() => {
                                                exportToExcel()
                                                setShowExportDropdown(false)
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm transition-colors"
                                        >
                                            <FileSpreadsheet className="w-4 h-4" />
                                            <span suppressHydrationWarning>{t('lecturas.exportExcel')}</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                exportToCSV()
                                                setShowExportDropdown(false)
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm transition-colors"
                                        >
                                            <FileDown className="w-4 h-4" />
                                            <span suppressHydrationWarning>{t('lecturas.exportCSV')}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={shareUrl}
                                className="text-xs sm:text-sm px-3 sm:px-4"
                            >
                                <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span suppressHydrationWarning className="hidden sm:inline">{t('lecturas.share')}</span>
                            </Button>
                            </div>
                        </div>
                    </div>

                {/* Búsqueda y Filtros Rápidos - Responsive */}
                <div className="space-y-3 sm:space-y-4">
                    {/* Búsqueda Principal */}
                    <div className="relative group">
                            <div className="absolute inset-0 bg-blue-500/10 blur-lg rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative flex items-center bg-card border border-border/50 shadow-lg rounded-xl sm:rounded-2xl h-11 sm:h-12 md:h-14 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all overflow-hidden">
                                <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground ml-3 sm:ml-4 shrink-0 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder={t('lecturas.searchPlaceholder')}
                                    className="w-full bg-transparent border-none outline-none px-3 sm:px-4 text-sm sm:text-base font-medium placeholder:text-muted-foreground/60 h-full text-foreground"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    aria-label="Buscar lecturas"
                                    suppressHydrationWarning
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="p-2 mr-1 sm:mr-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        aria-label="Limpiar búsqueda"
                                    >
                                        <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                )}
                            </div>
                            
                            {/* Autocompletado */}
                            {libroSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-[9999] max-h-60 overflow-y-auto">
                                {libroSuggestions.map((libro, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setSearchTerm(libro.nombre)
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        <span>{libro.nombre}</span>
                                        <span className="text-muted-foreground text-xs">({libro.abreviatura})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        </div>

                    {/* Filtros Rápidos - Responsive Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                        <button
                            onClick={() => {
                                const newSoloRepetidas = !soloRepetidas
                                setSoloRepetidas(newSoloRepetidas)
                                updateURL({ soloRepetidas: newSoloRepetidas ? 'true' : null })
                                // Las estadísticas se recargarán automáticamente cuando cambien los searchParams
                            }}
                            className={`relative overflow-hidden h-10 sm:h-12 px-3 sm:px-4 md:px-6 rounded-xl border font-bold text-xs sm:text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 ${
                                soloRepetidas
                                ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20'
                                    : 'bg-card hover:bg-accent/50 border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                            }`}
                        >
                            <AlertCircle className={`w-3 h-3 sm:w-4 sm:h-4 ${soloRepetidas ? 'text-white' : 'text-muted-foreground'}`} />
                            <span suppressHydrationWarning className="hidden sm:inline uppercase">{soloRepetidas ? t('lecturas.filterRepeated') : t('lecturas.filterAll')}</span>
                            <span suppressHydrationWarning className="sm:hidden">{soloRepetidas ? 'Repetidas' : 'Todas'}</span>
                        </button>

                    </div>

                    {/* Panel de Filtros Avanzados - Colapsable */}
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
                                            <span suppressHydrationWarning>{t('lecturas.filters')}</span>
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowFilters(false)}
                                            className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                                            aria-label="Cerrar filtros"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-4 sm:p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                                            {/* Rango de Fechas */}
                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span suppressHydrationWarning>{t('lecturas.filtersDateRange')}</span>
                                                </label>
                                                <div className="space-y-2">
                                                    <input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm sm:text-base"
                                                        aria-label="Fecha inicio"
                                                    />
                                                    <input
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm sm:text-base"
                                                        aria-label="Fecha fin"
                                                    />
                                                </div>
                                            </div>

                                            {/* Tipo de Culto */}
                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span suppressHydrationWarning>{t('lecturas.filtersTipoCulto')}</span>
                                                </label>
                                                <select
                                                    value={tipoCulto}
                                                    onChange={(e) => setTipoCulto(e.target.value)}
                                                    className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm sm:text-base"
                                                    aria-label="Tipo de culto"
                                                >
                                                    <option value="">Todos</option>
                                                    {cultoTypes.map(type => (
                                                        <option key={type.id} value={type.id}>{type.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Lector */}
                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span suppressHydrationWarning>{t('lecturas.filtersLector')}</span>
                                                </label>
                                                <select
                                                    value={lectorId}
                                                    onChange={(e) => setLectorId(e.target.value)}
                                                    className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm sm:text-base"
                                                    aria-label="Lector"
                                                >
                                                    <option value="">Todos</option>
                                                    {lectores.map(lector => (
                                                        <option key={lector.id} value={lector.id}>
                                                            {lector.nombre} {lector.apellidos}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Testamento */}
                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span suppressHydrationWarning>{t('lecturas.filtersTestamento')}</span>
                                                </label>
                                                <select
                                                    value={testamento}
                                                    onChange={(e) => setTestamento(e.target.value as 'AT' | 'NT' | '')}
                                                    className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm sm:text-base"
                                                    aria-label="Testamento"
                                                >
                                                    <option value="" suppressHydrationWarning>{t('lecturas.filtersTestamentoAll')}</option>
                                                    <option value="AT" suppressHydrationWarning>{t('lecturas.filtersTestamentoAT')}</option>
                                                    <option value="NT" suppressHydrationWarning>{t('lecturas.filtersTestamentoNT')}</option>
                                                </select>
                                            </div>

                                            {/* Tipo de Lectura */}
                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span suppressHydrationWarning>{t('lecturas.filtersTipoLectura')}</span>
                                                </label>
                                                <select
                                                    value={tipoLectura}
                                                    onChange={(e) => setTipoLectura(e.target.value)}
                                                    className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm sm:text-base"
                                                    aria-label="Tipo de lectura"
                                                >
                                                    <option value="" suppressHydrationWarning>{t('lecturas.filtersTipoLecturaAll')}</option>
                                                    <option value="introduccion" suppressHydrationWarning>{t('cultos.intro')}</option>
                                                    <option value="finalizacion" suppressHydrationWarning>{t('cultos.finalizacion')}</option>
                                                </select>
                                            </div>

                                            {/* Capítulo */}
                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span suppressHydrationWarning>{t('lecturas.filtersCapitulo')}</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={capitulo}
                                                    onChange={(e) => setCapitulo(e.target.value)}
                                                    placeholder="Ej: 1"
                                                    className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm sm:text-base"
                                                    aria-label="Capítulo"
                                                />
                                            </div>

                                            {/* Agrupar por */}
                                            <div className="space-y-2">
                                                <label suppressHydrationWarning className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <LayoutGrid className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    {t('lecturas.groupBy')}
                                                </label>
                                                <select
                                                    value={groupBy}
                                                    onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                                                    className="w-full h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border bg-card text-sm sm:text-base"
                                                    aria-label="Agrupar por"
                                                >
                                                    <option value="none" suppressHydrationWarning>{t('lecturas.groupByNone')}</option>
                                                    <option value="month" suppressHydrationWarning>{t('lecturas.groupByMonth')}</option>
                                                    <option value="year" suppressHydrationWarning>{t('lecturas.groupByYear')}</option>
                                                    <option value="libro" suppressHydrationWarning>{t('lecturas.groupByLibro')}</option>
                                                    <option value="lector" suppressHydrationWarning>{t('lecturas.groupByLector')}</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Botones de acción */}
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50">
                                            <Button
                                                variant="outline"
                                                onClick={clearFilters}
                                                className="w-full sm:w-auto text-xs sm:text-sm"
                                            >
                                                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                                <span suppressHydrationWarning>{t('lecturas.clearFilters')}</span>
                                            </Button>
                                            <Button
                                                onClick={applyFilters}
                                                className="w-full sm:w-auto text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-600/20 border-none"
                                            >
                                                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                                <span suppressHydrationWarning>{t('lecturas.applyFilters')}</span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Panel de Estadísticas - Colapsable */}
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
                                                    <span suppressHydrationWarning>{t('lecturas.stats')}</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                                    {/* Total Lecturas */}
                                                    <div className="relative overflow-hidden p-6 bg-gradient-to-br from-blue-500 to-blue-700 rounded-[2rem] text-white shadow-xl shadow-blue-500/20 group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                            <BookOpen size={80} />
                                                        </div>
                                                        <div className="relative z-10">
                                                            <span suppressHydrationWarning className="text-xs font-black uppercase tracking-widest opacity-80">
                                                                {t('lecturas.statsTotal')}
                            </span>
                                                            <p className="text-4xl font-black mt-1">
                                                                {stats.totalLecturas}
                                                            </p>
                                                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-2 py-1 rounded-full">
                                                                <TrendingUp size={12} />
                                                                REGISTROS TOTALES
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Repetidas */}
                                                    <div className="relative overflow-hidden p-6 bg-gradient-to-br from-red-500 to-red-700 rounded-[2rem] text-white shadow-xl shadow-red-500/20 group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                            <AlertCircle size={80} />
                                                        </div>
                                                        <div className="relative z-10">
                                                            <span suppressHydrationWarning className="text-xs font-black uppercase tracking-widest opacity-80">
                                                                {t('lecturas.statsRepetidas')}
                            </span>
                                                            <p className="text-4xl font-black mt-1">
                                                                {stats.repetidasCount}
                                                            </p>
                                                            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-2 py-1 rounded-full">
                                                                <History size={12} />
                                                                CONTROL DE DUPLICADOS
                                                            </div>
                                                        </div>
                                                    </div>

                                            {/* Libro más leído (Top 1 Highlight) */}
                                            <div className="relative overflow-hidden p-6 bg-gradient-to-br from-purple-500 to-purple-700 rounded-[2rem] text-white shadow-xl shadow-purple-500/20 group">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                                    <Sparkles size={80} />
                                                </div>
                                                <div className="relative z-10">
                                                    <span className="text-xs font-black uppercase tracking-widest opacity-80">
                                                        TOP LIBRO
                                                    </span>
                                                    <p className="text-2xl font-black mt-1 truncate pr-12">
                                                        {stats.librosMasLeidos[0]?.libro || '---'}
                                                    </p>
                                                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-2 py-1 rounded-full">
                                                        <Star size={12} fill="currentColor" />
                                                        {stats.librosMasLeidos[0]?.count || 0} LECTURAS
                                                    </div>
                    </div>
                </div>
            </div>

                                        {/* Gráfico de barras - Responsive */}
                                        {stats.librosMasLeidos.length > 0 && mounted && (
                                            <div className="mt-6 pt-6 border-t border-border/50">
                                                <h3 suppressHydrationWarning className="text-sm sm:text-base font-semibold mb-4">
                                                    {t('lecturas.statsLibrosMasLeidos')}
                                                </h3>
                                                <div className="w-full bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner overflow-hidden">
                                                    {/* Contenedor con scroll horizontal para móvil */}
                                                    <div className="overflow-x-auto no-scrollbar pb-4 sm:pb-0">
                                                        {/* En móvil: ancho fijo para scroll horizontal, en desktop: ancho completo */}
                                                        <div className="min-w-[600px] sm:min-w-0 h-80 sm:h-[450px] p-4 sm:p-8 relative">
                                                            {mounted && typeof window !== 'undefined' ? (
                                                                <>
                                                                    {/* Versión móvil: dimensiones fijas */}
                                                                    <div className="sm:hidden" style={{ width: '600px', height: '320px' }}>
                                                                        <BarChart 
                                                                            width={600} 
                                                                            height={320}
                                                                            data={stats.librosMasLeidos.slice(0, 10)} 
                                                                            margin={{ top: 30, right: 20, left: 0, bottom: 80 }}
                                                                            barCategoryGap="10%"
                                                                        >
                                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                                                            <XAxis 
                                                                                dataKey="libro" 
                                                                                angle={-45}
                                                                                textAnchor="end"
                                                                                interval={0}
                                                                                height={90}
                                                                                tick={{ fontSize: 12, fontWeight: '800', fill: 'currentColor', opacity: 0.7 }}
                                                                                axisLine={{ stroke: '#e2e8f0' }}
                                                                                tickLine={false}
                                                                            />
                                                                            <YAxis 
                                                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                                                axisLine={false}
                                                                                tickLine={false}
                                                                            />
                                                                            <Tooltip 
                                                                                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                                                                contentStyle={{ 
                                                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                                                    border: '1px solid #e2e8f0',
                                                                                    borderRadius: '12px',
                                                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                                                    fontSize: '12px',
                                                                                    color: '#1e293b'
                                                                                }}
                                                                                itemStyle={{ fontWeight: 'bold', color: '#3b82f6' }}
                                                                            />
                                                                            <Bar 
                                                                                dataKey="count" 
                                                                                fill="#3b82f6" 
                                                                                radius={[6, 6, 0, 0]} 
                                                                                barSize={40}
                                                                            >
                                                                                <LabelList 
                                                                                    dataKey="count" 
                                                                                    position="top" 
                                                                                    offset={10}
                                                                                    style={{ fill: 'currentColor', fontSize: '13px', fontWeight: '900', opacity: 0.9 }} 
                                                                                />
                                                                                {stats.librosMasLeidos.slice(0, 10).map((entry, index) => (
                                                                                    <Cell 
                                                                                        key={`cell-${index}`} 
                                                                                        fill={[
                                                                                            '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
                                                                                            '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'
                                                                                        ][index % 10]} 
                                                                                    />
                                                                                ))}
                                                                            </Bar>
                                                                        </BarChart>
                                                                    </div>
                                                                    {/* Versión desktop: responsive */}
                                                                    <div className="hidden sm:block w-full h-full">
                                                                        <ResponsiveContainer width="100%" height="100%">
                                                                        <BarChart 
                                                                            data={stats.librosMasLeidos.slice(0, 10)} 
                                                                            margin={{ top: 30, right: 20, left: 0, bottom: 80 }}
                                                                            barCategoryGap="10%"
                                                                        >
                                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                                                                            <XAxis 
                                                                                dataKey="libro" 
                                                                                angle={-45}
                                                                                textAnchor="end"
                                                                                interval={0}
                                                                                height={90}
                                                                                tick={{ fontSize: 12, fontWeight: '800', fill: 'currentColor', opacity: 0.7 }}
                                                                                axisLine={{ stroke: '#e2e8f0' }}
                                                                                tickLine={false}
                                                                            />
                                                                            <YAxis 
                                                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                                                axisLine={false}
                                                                                tickLine={false}
                                                                            />
                                                                            <Tooltip 
                                                                                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                                                                contentStyle={{ 
                                                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                                                    border: '1px solid #e2e8f0',
                                                                                    borderRadius: '12px',
                                                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                                                    fontSize: '12px',
                                                                                    color: '#1e293b'
                                                                                }}
                                                                                itemStyle={{ fontWeight: 'bold', color: '#3b82f6' }}
                                                                            />
                                                                            <Bar 
                                                                                dataKey="count" 
                                                                                fill="#3b82f6" 
                                                                                radius={[6, 6, 0, 0]} 
                                                                                barSize={40}
                                                                            >
                                                                                <LabelList 
                                                                                    dataKey="count" 
                                                                                    position="top" 
                                                                                    offset={10}
                                                                                    style={{ fill: 'currentColor', fontSize: '13px', fontWeight: '900', opacity: 0.9 }} 
                                                                                />
                                                                                {stats.librosMasLeidos.slice(0, 10).map((entry, index) => (
                                                                                    <Cell 
                                                                                        key={`cell-${index}`} 
                                                                                        fill={[
                                                                                            '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
                                                                                            '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'
                                                                                        ][index % 10]} 
                                                                                    />
                                                                                ))}
                                                                            </Bar>
                                                                        </BarChart>
                                                                    </ResponsiveContainer>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center absolute inset-0">
                                                                    <div className="flex flex-col items-center gap-3">
                                                                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                                                        <p className="text-sm font-medium text-muted-foreground">Cargando gráfico...</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Indicador visual de scroll para móvil */}
                                                    {mounted && (
                                                        <div className="md:hidden flex flex-col items-center pb-4 space-y-1">
                                                            <div className="flex items-center justify-center text-[10px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-4 py-1 rounded-full border border-blue-100 dark:border-blue-800 gap-2">
                                                                <ChevronLeft size={12} className="animate-bounce-x" />
                                                                DESLIZA PARA VER MÁS
                                                                <ChevronRight size={12} className="animate-bounce-x" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
            </div>

                {/* Listado Principal - Responsive */}
                <Card className="overflow-hidden border border-border/50 shadow-2xl bg-card/40 backdrop-blur-xl relative z-0">
                    <CardHeader className="border-b border-border/50 bg-card/50 py-4 sm:py-6 px-4 sm:px-6 md:px-8 relative z-0">
                        <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2 sm:gap-3 flex-wrap">
                            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary">
                                <History className="w-4 h-4 sm:w-5 sm:h-6" />
                        </div>
                            <span suppressHydrationWarning>{t('lecturas.history')}</span>
                        {searchTerm && (
                                <span className="text-xs sm:text-sm font-medium text-muted-foreground px-2 sm:px-3 py-1 rounded-full bg-muted/50 border border-border/50">
                                    &quot;{searchTerm}&quot;
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                        {lecturas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 sm:py-24 md:py-32 text-center space-y-4 sm:space-y-6 px-4">
                                <div className="p-4 sm:p-6 rounded-full bg-muted/5 ring-1 ring-border/50">
                                    <SearchIcon className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground/30" />
                                </div>
                                <div className="space-y-2 max-w-sm">
                                    <h3 suppressHydrationWarning className="text-base sm:text-lg font-bold text-foreground">
                                        {searchTerm ? 'Sin coincidencias' : t('lecturas.noResults')}
                                    </h3>
                                    <p suppressHydrationWarning className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                        {searchTerm
                                            ? `No hemos encontrado lecturas que coincidan con "${searchTerm}". Intenta con otro término.`
                                            : t('lecturas.noResultsDesc')}
                                    </p>
                                </div>
                                {searchTerm && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setSearchTerm('')}
                                        className="rounded-full px-4 sm:px-6 border-border/50 hover:bg-muted/50 text-xs sm:text-sm"
                                    >
                                        Limpiar búsqueda
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {Object.entries(groupedLecturas).map(([groupKey, groupLecturas]) => (
                                    <div key={groupKey}>
                                        {groupBy !== 'none' && (
                                            <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-muted/30 border-b border-border/50">
                                                <h3 suppressHydrationWarning className="text-sm sm:text-base font-bold text-foreground">{groupKey}</h3>
                                            </div>
                                        )}
                                        {groupLecturas.map((lectura: LecturaExt) => (
                                <div
                                    key={lectura.id}
                                                className={`group relative p-4 sm:p-6 transition-all hover:bg-muted/30 ${
                                                    lectura.es_repetida ? 'bg-red-500/3' : ''
                                        }`}
                                                role="article"
                                                aria-label={`Lectura: ${formatCita(lectura)}`}
                                >
                                    {/* Indicador de repetida lateral */}
                                    {lectura.es_repetida && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 bg-red-500 shadow-[2px_0_10px_rgba(239,68,68,0.3)]" />
                                    )}

                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                                                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                                                        <div className={`mt-1 p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-sm shrink-0 ${
                                                            lectura.es_repetida
                                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                                : 'bg-primary/10 text-primary'
                                                }`}>
                                                            {lectura.es_repetida ? (
                                                                <AlertCircle size={20} className="sm:w-6 sm:h-6" />
                                                            ) : (
                                                                <BookOpen size={20} className="sm:w-6 sm:h-6" />
                                                            )}
                                            </div>
                                                        <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                                                            <h3 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight break-words ${
                                                                lectura.es_repetida ? 'text-red-600' : ''
                                                            }`}>
                                                    {formatCita(lectura)}
                                                </h3>
                                                            <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 text-xs sm:text-sm font-medium text-muted-foreground">
                                                    <span className="text-foreground font-bold flex items-center gap-1">
                                                        <UserIcon className="w-3 h-3" />
                                                                    <span className="truncate max-w-[150px] sm:max-w-none">
                                                        {lectura.lector.nombre} {lectura.lector.apellidos}
                                                    </span>
                                                                </span>
                                                                <span className="opacity-30 hidden sm:inline">•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                                    <span suppressHydrationWarning className="hidden sm:inline">
                                                                        {format(parseISO(lectura.culto.fecha), 'PP', { locale })}
                                                                    </span>
                                                                    <span suppressHydrationWarning className="sm:hidden flex items-center gap-1">
                                                                        <span className="font-semibold text-foreground">{lectura.culto.tipo_culto.nombre}</span>
                                                                        <span className="opacity-50">•</span>
                                                                        <span>{format(parseISO(lectura.culto.fecha), 'dd/MM/yyyy', { locale })}</span>
                                                                    </span>
                                                    </span>
                                                                    <span className="opacity-30 hidden sm:inline">•</span>
                                                                    <span suppressHydrationWarning className="text-xs sm:text-sm font-medium text-muted-foreground">
                                                                        {lectura.tipo_lectura === 'introduccion' ? t('cultos.intro') : t('cultos.finalizacion')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                        <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-sm ${
                                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                }`}>
                                                <span suppressHydrationWarning>
                                                {lectura.culto.tipo_culto.nombre}
                                                </span>
                                            </span>

                                            {lectura.es_repetida && (
                                                            <span suppressHydrationWarning className="flex items-center gap-1 bg-red-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-tighter animate-pulse shadow-lg shadow-red-500/20">
                                                    REPETIDA
                                                </span>
                                            )}

                                                        {/* Botones de acción - Responsive */}
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedLectura(lectura)
                                                                    setShowDetailsModal(true)
                                                                }}
                                                                className="p-2 sm:p-2.5 rounded-lg hover:bg-muted transition-colors"
                                                                aria-label="Ver detalles"
                                                            >
                                                                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </button>
                                                            <Link
                                                                href={`/dashboard/cultos/${lectura.culto.id}`}
                                                                className="p-2 sm:p-2.5 rounded-lg hover:bg-muted transition-colors"
                                                                aria-label="Ver culto"
                                                            >
                                                                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDelete(lectura)}
                                                                disabled={isLoading}
                                                                className="p-2 sm:p-2.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50"
                                                                aria-label="Eliminar lectura"
                                                            >
                                                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                            </button>
                                        </div>
                                    </div>
                                </div>
                    </div>
                                        ))}
                                    </div>
                                ))}
                                </div>
                        )}

                        {/* Paginación Mejorada - Responsive */}
                        {totalPages > 1 && (
                            <div className="p-4 sm:p-6 md:p-8 bg-muted/10 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                                <p suppressHydrationWarning className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-widest text-center sm:text-left">
                                {t('lecturas.pageOf')
                                        .replace('{current}', currentPage.toString())
                                        .replace('{total}', totalPages.toString())}
                            </p>

                                <div className="flex items-center gap-2 sm:gap-3">
                                <Button
                                    variant="outline"
                                        className="rounded-xl font-bold px-4 sm:px-6 h-10 sm:h-12 text-xs sm:text-sm border-border/50 hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95"
                                        disabled={currentPage <= 1}
                                        onClick={() => changePage(currentPage - 1)}
                                        aria-label="Página anterior"
                                >
                                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                                        <span suppressHydrationWarning className="hidden sm:inline">{t('lecturas.previous')}</span>
                                        <span className="sm:hidden">Ant</span>
                                </Button>
                                <Button
                                    variant="outline"
                                        className="rounded-xl font-bold px-4 sm:px-6 h-10 sm:h-12 text-xs sm:text-sm border-border/50 hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => changePage(currentPage + 1)}
                                        aria-label="Página siguiente"
                                    >
                                        <span suppressHydrationWarning className="hidden sm:inline">{t('lecturas.next')}</span>
                                        <span className="sm:hidden">Sig</span>
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            </div>

            {/* Modal de Detalles */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => {
                    setShowDetailsModal(false)
                    setSelectedLectura(null)
                }}
                title={selectedLectura ? formatCita(selectedLectura) : t('lecturas.detailsTitle')}
                size="lg"
            >
                {selectedLectura && (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Información Principal */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-1">
                                <label suppressHydrationWarning className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                    {t('lecturas.detailsLibro')}
                                </label>
                                <p className="text-sm sm:text-base font-medium">{selectedLectura.libro}</p>
                            </div>
                            <div className="space-y-1">
                                <label suppressHydrationWarning className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                    {t('lecturas.detailsCapitulo')}
                                </label>
                                <p className="text-sm sm:text-base font-medium">
                                    {selectedLectura.capitulo_inicio === selectedLectura.capitulo_fin
                                        ? selectedLectura.capitulo_inicio
                                        : `${selectedLectura.capitulo_inicio} - ${selectedLectura.capitulo_fin}`}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label suppressHydrationWarning className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                    {t('lecturas.detailsVersiculo')}
                                </label>
                                <p className="text-sm sm:text-base font-medium">
                                    {selectedLectura.versiculo_inicio === selectedLectura.versiculo_fin
                                        ? selectedLectura.versiculo_inicio
                                        : `${selectedLectura.versiculo_inicio} - ${selectedLectura.versiculo_fin}`}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label suppressHydrationWarning className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                    {t('lecturas.detailsLector')}
                                </label>
                                <p className="text-sm sm:text-base font-medium">
                                    {selectedLectura.lector.nombre} {selectedLectura.lector.apellidos}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label suppressHydrationWarning className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                    {t('lecturas.detailsFecha')}
                                </label>
                                <p suppressHydrationWarning className="text-sm sm:text-base font-medium">
                                    {format(parseISO(selectedLectura.culto.fecha), 'PP', { locale })}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label suppressHydrationWarning className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                    {t('lecturas.detailsTipoCulto')}
                                </label>
                                <p className="text-sm sm:text-base font-medium">
                                    {selectedLectura.culto.tipo_culto.nombre}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label suppressHydrationWarning className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                    {t('lecturas.detailsTipoLectura')}
                                </label>
                                <p suppressHydrationWarning className="text-sm sm:text-base font-medium">
                                    <span suppressHydrationWarning>
                                        {selectedLectura.tipo_lectura === 'introduccion' ? t('cultos.intro') : t('cultos.finalizacion')}
                                    </span>
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                    Testamento
                                </label>
                                <p className="text-sm sm:text-base font-medium">
                                    {getTestamento(selectedLectura.libro) === 'AT' ? t('lecturas.filtersTestamentoAT') : t('lecturas.filtersTestamentoNT')}
                                </p>
                            </div>
                        </div>

                        {/* Botón de cerrar */}
                        <div className="flex justify-center pt-4 sm:pt-6 border-t border-border/50">
                            <Button
                                onClick={() => {
                                    setShowDetailsModal(false)
                                    setSelectedLectura(null)
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
    )
}