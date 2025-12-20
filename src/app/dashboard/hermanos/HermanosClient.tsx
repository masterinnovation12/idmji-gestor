/**
 * HermanosClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para visualizar el directorio de hermanos de púlpito.
 * Permite buscar por nombre, apellidos o email y ver estadísticas de asignación.
 * 
 * Características:
 * - Buscado en tiempo real con debounce
 * - Tarjetas de perfil detalladas con roles resaltados
 * - Estadísticas rápidas de participación
 * - Soporte multiidioma (ES/CA)
 * 
 * @author Antigravity AI
 * @date 2024-12-18
 */

'use client'

import { useState, useEffect } from 'react'
import { getHermanos } from './actions'
import { Search, Users, User, ChevronLeft, ShieldCheck, Mail, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/I18nProvider'
import Link from 'next/link'
import { Profile } from '@/types/database'

interface HermanosClientProps {
    initialHermanos: Profile[]
    stats: { pulpito: number; total: number }
}

export default function HermanosClient({ initialHermanos, stats }: HermanosClientProps) {
    const { t } = useI18n()
    const [hermanos, setHermanos] = useState<Profile[]>(initialHermanos)
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // Efecto para búsqueda con debounce
    useEffect(() => {
        async function handleSearch() {
            if (!searchTerm && hermanos.length === initialHermanos.length) return

            setIsLoading(true)
            const result = await getHermanos(searchTerm || undefined)
            if (result.success && result.data) {
                setHermanos(result.data as Profile[])
            }
            setIsLoading(false)
        }

        const timer = setTimeout(() => {
            handleSearch()
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm, hermanos.length, initialHermanos.length])

    /**
     * Resalta el término buscado en los textos de la interfaz
     */
    function highlightText(text: string | null, search: string) {
        if (!text || !search.trim()) return text || ''

        const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        const parts = text.split(regex)

        return parts.map((part, index) =>
            regex.test(part)
                ? <strong key={index} className="text-primary font-black bg-primary/10 px-0.5 rounded shadow-sm">{part}</strong>
                : part
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 px-4">
            {/* Breadcrumb */}
            <div className="px-2">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-bold group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {t('dashboard.title')}
                </Link>
            </div>

            {/* Header y Buscador */}
            <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-center">
                <div className="space-y-2">
                    <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent tracking-tight">
                        {t('hermanos.title')}
                    </h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        {t('hermanos.desc')}
                    </p>
                </div>

                <div className="relative w-full lg:w-96 group">
                    <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-focus-within:bg-primary/30 transition-all opacity-0 group-focus-within:opacity-100" />
                    <div className="relative glass border border-border/50 rounded-2xl flex items-center px-4 h-14 shadow-lg focus-within:border-primary transition-all">
                        <Search className="w-5 h-5 text-muted-foreground mr-3" />
                        <input
                            type="text"
                            placeholder={t('hermanos.searchPlaceholder')}
                            className="w-full bg-transparent border-none outline-none font-bold placeholder:text-muted-foreground/50 text-foreground"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass rounded-[2rem] p-8 border border-primary/10 flex items-center justify-between group hover:border-primary/30 transition-all cursor-default overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-125 transition-transform">
                        <Users className="w-32 h-32" />
                    </div>
                    <div className="relative">
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-primary mb-2">
                            {t('hermanos.statsPulpito')}
                        </p>
                        <p className="text-5xl font-black">{stats.pulpito}</p>
                    </div>
                    <Users className="w-12 h-12 text-primary opacity-20" />
                </div>

                <div className="glass rounded-[2rem] p-8 border border-accent/10 flex items-center justify-between group hover:border-accent/30 transition-all cursor-default overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-125 transition-transform">
                        <ShieldCheck className="w-32 h-32" />
                    </div>
                    <div className="relative">
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-accent mb-2">
                            {t('hermanos.statsTotal')}
                        </p>
                        <p className="text-5xl font-black">{stats.total}</p>
                    </div>
                    <ShieldCheck className="w-12 h-12 text-accent opacity-20" />
                </div>
            </div>

            {/* List Table/Grid */}
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden min-h-[400px]">
                <CardContent className="p-4 sm:p-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <p className="text-muted-foreground font-bold animate-pulse">{t('common.loading')}</p>
                        </div>
                    ) : hermanos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <Search className="w-16 h-16 text-muted-foreground/20" />
                            <p className="text-muted-foreground font-black text-xl tracking-tight">
                                {t('hermanos.noResults')}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {hermanos.map((hermano) => (
                                <div
                                    key={hermano.id}
                                    className="group flex items-center gap-5 p-6 bg-muted/20 border border-border/50 rounded-3xl hover:bg-white dark:hover:bg-muted/40 transition-all hover:shadow-xl hover:-translate-y-1"
                                >
                                    {/* Avatar Visual */}
                                    <div className="relative flex-shrink-0">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-0.5 border border-white/20 overflow-hidden flex items-center justify-center shadow-lg">
                                            {hermano.avatar_url ? (
                                                <img
                                                    src={hermano.avatar_url}
                                                    alt={hermano.nombre || 'Avatar'}
                                                    className="w-full h-full object-cover rounded-[14px]"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-primary/5 flex items-center justify-center rounded-[14px]">
                                                    <User className="w-8 h-8 text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Info Detallada */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <p className="font-black text-lg tracking-tight truncate uppercase">
                                            {highlightText(hermano.nombre, searchTerm)}{' '}
                                            {highlightText(hermano.apellidos, searchTerm)}
                                        </p>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium truncate">
                                            <Mail className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{hermano.email}</span>
                                        </div>

                                        <div className="pt-2">
                                            <span className={`inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm border ${hermano.rol === 'ADMIN'
                                                ? 'bg-red-500/10 text-red-600 border-red-100 dark:border-red-900/30'
                                                : hermano.rol === 'EDITOR'
                                                    ? 'bg-blue-500/10 text-blue-600 border-blue-100 dark:border-blue-900/30'
                                                    : 'bg-muted/50 text-muted-foreground border-border'
                                                }`}>
                                                {hermano.rol}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>

                {/* Footer del Listado */}
                {!isLoading && hermanos.length > 0 && (
                    <div className="px-8 py-6 bg-muted/20 border-t border-border/50 text-sm font-bold text-muted-foreground uppercase tracking-widest text-center sm:text-left">
                        {t('hermanos.showing')
                            .replace('{count}', hermanos.length.toString())
                            .replace('{plural}', hermanos.length !== 1 ? 's' : '')}
                    </div>
                )}
            </Card>
        </div>
    )
}
