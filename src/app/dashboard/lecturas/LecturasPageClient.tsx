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

import { BookOpen, AlertCircle, ChevronLeft, ChevronRight, History, Calendar } from 'lucide-react'
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

    const soloRepetidas = searchParams.get('soloRepetidas') === 'true'

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
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Header y Filtros */}
            <div className="px-2 space-y-4">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {t('dashboard.title')}
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                            {t('lecturas.title')}
                        </h1>
                        <p className="text-muted-foreground font-medium">{t('lecturas.desc')}</p>
                    </div>

                    <button
                        onClick={() => updateFilter(!soloRepetidas)}
                        className={`px-6 py-3 rounded-2xl transition-all flex items-center gap-2 font-bold text-sm tracking-tight ${soloRepetidas
                            ? 'bg-red-500 text-white shadow-xl shadow-red-500/30 scale-105'
                            : 'glass border border-border/50 hover:bg-white/10'
                            }`}
                    >
                        <AlertCircle className={`w-4 h-4 ${soloRepetidas ? 'animate-pulse' : ''}`} />
                        {soloRepetidas ? t('lecturas.filterAll') : t('lecturas.filterRepeated')}
                    </button>
                </div>
            </div>

            {/* Listado Principal */}
            <Card className="mx-2 overflow-hidden border-none shadow-2xl">
                <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
                    <CardTitle icon={<History className="w-6 h-6 text-primary" />} className="text-xl">
                        {t('lecturas.history')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                        {initialLecturas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                                <SearchXIcon className="w-16 h-16 text-muted-foreground/20" />
                                <p className="text-muted-foreground font-medium max-w-xs">
                                    {t('lecturas.noResults')}
                                </p>
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

function SearchXIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
        </svg>
    )
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
    )
}
