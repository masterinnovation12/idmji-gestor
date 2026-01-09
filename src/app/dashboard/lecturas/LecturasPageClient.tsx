/**
 * LecturasPageClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para el historial general de lecturas bíblicas.
 * Permite filtrar por lecturas repetidas, paginación y visualización detallada.
 * 
 * Características:
 * - Listado cronológico de lecturas
 * - Filtro dinámico de lecturas repetidas (resaltado en rojo)
 * - Paginación integrada con URL
 * - Soporte multiidioma (ES/CA)
 * 
 * @author Antigravity AI
 * @date 2024-12-18
 */

'use client'

import { useState, useEffect } from 'react'
import { BookOpen, AlertCircle, ChevronLeft, ChevronRight, History, Calendar, Search as SearchIcon, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { LecturaBiblica } from '@/types/database'
import Link from 'next/link'

// Extendemos el tipo para incluir los JOINS de la consulta
interface LecturaExt extends LecturaBiblica {
    culto: {
        fecha: string
        tipo_culto: {
            nombre: string
        }
    }
    lector: {
        nombre: string
        apellidos: string
    }
}

interface LecturasPageClientProps {
    initialLecturas: LecturaExt[]
    initialTotalPages: number
    initialPage: number
}

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

    // Estado derivado de URL
    const soloRepetidas = searchParams.get('soloRepetidas') === 'true'
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

    // Debounce search update
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams)
            if (searchTerm) {
                params.set('search', searchTerm)
            } else {
                params.delete('search')
            }
            params.set('page', '1') // Reset page on search
            router.push(`${pathname}?${params.toString()}`)
        }, 500)

        return () => clearTimeout(timer)
    }, [searchTerm, searchParams, pathname, router])

    const updateFilter = (newSoloRepetidas: boolean) => {
        const params = new URLSearchParams(searchParams)
        if (newSoloRepetidas) {
            params.set('soloRepetidas', 'true')
        } else {
            params.delete('soloRepetidas')
        }
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const changePage = (newPage: number) => {
        const params = new URLSearchParams(searchParams)
        params.set('page', newPage.toString())
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header y Filtros */}
            <div className="px-4 md:px-6 py-6 bg-card/30 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 transition-all rounded-b-3xl -mx-2 md:mx-0 shadow-sm">
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors ring-1 ring-white/10"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                                    {t('lecturas.title')}
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        {/* Buscador Premium */}
                        <div className="relative group flex-1 max-w-lg">
                            <div className="absolute inset-0 bg-blue-500/10 blur-lg rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative flex items-center bg-card border border-white/10 shadow-lg rounded-xl h-12 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all overflow-hidden">
                                <SearchIcon className="w-5 h-5 text-muted-foreground ml-3 shrink-0 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder={t('lecturas.searchPlaceholder') || "Buscar por libro (ej. Mateo, Salmos)..."}
                                    className="w-full bg-transparent border-none outline-none px-3 text-base font-medium placeholder:text-muted-foreground/60 h-full text-foreground"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="p-2 mr-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Separador móvil */}
                        <div className="h-px bg-white/10 md:hidden w-full my-1" />

                        {/* Filtro Toggle Mejorado */}
                        <button
                            onClick={() => updateFilter(!soloRepetidas)}
                            className={`relative overflow-hidden h-12 px-6 rounded-xl border font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2 group md:w-auto w-full ${soloRepetidas
                                ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20'
                                : 'bg-card hover:bg-accent/50 border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20'
                                }`}
                        >
                            <span className={`flex items-center justify-center w-5 h-5 rounded-full ${soloRepetidas ? 'bg-white/20' : 'bg-muted/50'} group-hover:scale-110 transition-transform`}>
                                <AlertCircle className={`w-3.5 h-3.5 ${soloRepetidas ? 'text-white' : 'text-muted-foreground'}`} />
                            </span>
                            <span className="uppercase text-xs">{soloRepetidas ? t('lecturas.filterRepeated') : t('lecturas.filterAll')}</span>

                            {/* Indicador de estado */}
                            {soloRepetidas && (
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Listado Principal */}
            <Card className="mx-2 md:mx-6 overflow-hidden border border-white/5 shadow-2xl bg-card/40 backdrop-blur-xl ring-1 ring-white/5 rounded-3xl">
                <CardHeader className="border-b border-white/5 bg-white/[0.02] py-6 px-6 md:px-8">
                    <CardTitle className="text-xl md:text-2xl flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                            <History className="w-6 h-6" />
                        </div>
                        {t('lecturas.history')}
                        {searchTerm && (
                            <span className="text-sm font-medium text-muted-foreground ml-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                Resultados para &quot;{searchTerm}&quot;
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-white/5">
                        {initialLecturas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 px-4">
                                <div className="p-6 rounded-full bg-muted/5 ring-1 ring-white/10">
                                    <SearchIcon className="w-12 h-12 text-muted-foreground/30" />
                                </div>
                                <div className="space-y-2 max-w-sm">
                                    <h3 className="text-lg font-bold text-foreground">
                                        {searchTerm ? 'Sin coincidencias' : t('lecturas.noResults')}
                                    </h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {searchTerm
                                            ? `No hemos encontrado lecturas del libro "${searchTerm}". Intenta con otro nombre.`
                                            : t('lecturas.noResultsDesc') || "Aún no hay lecturas registradas en el historial."}
                                    </p>
                                </div>
                                {searchTerm && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setSearchTerm('')}
                                        className="rounded-full px-6 border-white/10 hover:bg-white/5"
                                    >
                                        Limpiar búsqueda
                                    </Button>
                                )}
                            </div>
                        ) : (
                            initialLecturas.map((lectura: LecturaExt) => (
                                <div
                                    key={lectura.id}
                                    className={`group relative p-6 transition-all hover:bg-muted/30 ${lectura.es_repetida ? 'bg-red-500/[0.03]' : ''
                                        }`}
                                >
                                    {/* Indicador de repetida lateral */}
                                    {lectura.es_repetida && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500 shadow-[2px_0_10px_rgba(239,68,68,0.3)]" />
                                    )}

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-1 p-3 rounded-2xl shadow-sm ${lectura.es_repetida
                                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                                : 'bg-primary/10 text-primary'
                                                }`}>
                                                {lectura.es_repetida ? <AlertCircle size={24} /> : <BookOpen size={24} />}
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className={`text-2xl font-black tracking-tight ${lectura.es_repetida ? 'text-red-600' : ''}`}>
                                                    {formatCita(lectura)}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-muted-foreground">
                                                    <span className="text-foreground font-bold flex items-center gap-1">
                                                        <UserIcon className="w-3 h-3" />
                                                        {lectura.lector.nombre} {lectura.lector.apellidos}
                                                    </span>
                                                    <span className="opacity-30">•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {lectura.culto.tipo_culto.nombre} ({format(new Date(lectura.culto.fecha), 'PP', { locale })})
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm ${lectura.tipo_lectura === 'introduccion'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                                                }`}>
                                                {lectura.tipo_lectura === 'introduccion' ? t('cultos.intro') : t('cultos.finalizacion')}
                                            </span>

                                            {lectura.es_repetida && (
                                                <span className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter animate-pulse shadow-lg shadow-red-500/20">
                                                    REPETIDA
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Paginación Mejorada */}
                    {initialTotalPages > 1 && (
                        <div className="p-8 bg-muted/10 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                {t('lecturas.pageOf')
                                    .replace('{current}', initialPage.toString())
                                    .replace('{total}', initialTotalPages.toString())}
                            </p>

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    className="rounded-xl font-bold px-6 h-12 glass border-border/50 hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95"
                                    disabled={initialPage <= 1}
                                    onClick={() => changePage(initialPage - 1)}
                                >
                                    <ChevronLeft className="w-5 h-5 mr-1" />
                                    {t('lecturas.previous')}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-xl font-bold px-6 h-12 glass border-border/50 hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95"
                                    disabled={initialPage >= initialTotalPages}
                                    onClick={() => changePage(initialPage + 1)}
                                >
                                    {t('lecturas.next')}
                                    <ChevronRight className="w-5 h-5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
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
