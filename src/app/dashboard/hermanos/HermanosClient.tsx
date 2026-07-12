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

import { useState, useEffect, useMemo } from 'react'
import { Search, Users, ShieldCheck, Mail, Phone, Sparkles, Award, CheckCircle2, XCircle, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import PageHero from '@/components/PageHero'
import { Profile, UserRole } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import NextImage from 'next/image'
import type { TranslationKey } from '@/lib/i18n/types'

interface HermanosClientProps {
    initialHermanos: Profile[]
    stats: { pulpito: number; total: number }
}

/**
 * Componente para mostrar el avatar con iniciales y degradado dinámico
 */
function HermanoAvatar({ hermano, size = "md" }: { hermano: Profile, size?: "sm" | "md" | "lg" | "xl" }) {
    const initials = `${hermano.nombre?.[0] || ''}${hermano.apellidos?.[0] || ''}`.toUpperCase() || '?'

    // Generar un degradado basado en el nombre para que siempre sea el mismo para el mismo hermano
    const getGradient = (name: string) => {
        const colors = [
            'from-blue-500 to-cyan-400',
            'from-purple-500 to-pink-400',
            'from-emerald-500 to-teal-400',
            'from-orange-500 to-amber-400',
            'from-indigo-500 to-purple-400',
            'from-rose-500 to-orange-400'
        ]
        let hash = 0
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash)
        }
        return colors[Math.abs(hash) % colors.length]
    }

    const gradientClass = getGradient(hermano.nombre || 'Desconocido')

    const sizeClasses = {
        sm: "w-12 h-12 rounded-xl",
        md: "w-16 h-16 rounded-2xl",
        lg: "w-24 h-24 rounded-3xl",
        xl: "w-40 h-40 rounded-[2.5rem]"
    }

    return (
        <div className="relative group/avatar">
            <div className={cn(
                "absolute inset-0 blur-md opacity-0 group-hover/avatar:opacity-40 transition-opacity",
                sizeClasses[size],
                hermano.avatar_url ? "bg-primary" : "bg-linear-to-br " + gradientClass
            )} />
            <div className={cn(
                "relative border-2 border-white/20 overflow-hidden flex items-center justify-center shadow-lg transition-transform duration-300 group-hover/avatar:scale-105",
                sizeClasses[size],
                !hermano.avatar_url && "bg-linear-to-br " + gradientClass
            )}>
                {hermano.avatar_url ? (
                    <NextImage
                        src={hermano.avatar_url}
                        alt={hermano.nombre || 'Avatar'}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <span className={cn(
                        "font-black text-white tracking-tighter drop-shadow-sm",
                        size === "sm" ? "text-lg" : size === "md" ? "text-xl" : size === "lg" ? "text-3xl" : "text-5xl"
                    )}>
                        {initials}
                    </span>
                )}
            </div>
        </div>
    )
}

const ROLE_FILTERS: readonly ('ALL' | UserRole)[] = ['ALL', 'ADMIN', 'EDITOR', 'MIEMBRO', 'SONIDO'] as const
type FilterRole = (typeof ROLE_FILTERS)[number]

function getRoleLabelKey(role: string): TranslationKey {
    const map: Record<string, string> = {
        ALL: 'hermanos.filterAll',
        ADMIN: 'hermanos.filterAdmin',
        EDITOR: 'hermanos.filterEditor',
        MIEMBRO: 'hermanos.filterUser',
        SONIDO: 'hermanos.filterSonido',
    }
    return (map[role] || role) as TranslationKey
}

function getRoleStyles(rol: UserRole): { bg: string; border: string; text: string } {
    switch (rol) {
        case 'ADMIN': return { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500' }
        case 'EDITOR': return { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500' }
        case 'MIEMBRO': return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-500' }
        case 'SONIDO': return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500' }
        default: return { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' }
    }
}

function getRoleGlowColor(rol: UserRole): string {
    switch (rol) {
        case 'ADMIN': return 'bg-red-500'
        case 'EDITOR': return 'bg-blue-500'
        case 'MIEMBRO': return 'bg-emerald-500'
        case 'SONIDO': return 'bg-amber-500'
        default: return 'bg-primary'
    }
}

export default function HermanosClient({ initialHermanos, stats }: HermanosClientProps) {
    const { t } = useI18n()
    const [hermanos, setHermanos] = useState<Profile[]>(initialHermanos)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRole, setFilterRole] = useState<FilterRole>('ALL')
    const [selectedHermano, setSelectedHermano] = useState<Profile | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const openDetails = (hermano: Profile) => {
        setSelectedHermano(hermano)
        setIsModalOpen(true)
    }

    // Filtrado local para máxima velocidad
    const filteredHermanos = useMemo(() => {
        return hermanos.filter(h => {
            const fullName = `${h.nombre || ''} ${h.apellidos || ''}`.toLowerCase()
            const email = (h.email || '').toLowerCase()
            const search = searchTerm.toLowerCase()

            const matchesSearch = !searchTerm ||
                fullName.includes(search) ||
                email.includes(search)

            const matchesRole = filterRole === 'ALL' || h.rol === filterRole

            return matchesSearch && matchesRole
        })
    }, [hermanos, searchTerm, filterRole])

    // Efecto para sincronizar con el servidor si es necesario (ej. si initialHermanos cambia)
    useEffect(() => {
        setHermanos(initialHermanos)
    }, [initialHermanos])

    /**
     * Resalta el término buscado
     */
    function highlightText(text: string | null, search: string) {
        if (!text || !search.trim()) return text || ''
        const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        const parts = text.split(regex)
        const searchLower = search.toLowerCase()
        return parts.map((part, index) =>
            part.toLowerCase() === searchLower
                ? <strong key={index} className="text-[#1f2e85] font-black bg-[#b8964a]/20 px-0.5 rounded">{part}</strong>
                : part
        )
    }

    return (
        <div className="ofrenda-liquid-scope max-w-7xl mx-auto space-y-10 pb-32 px-4 md:px-6 no-scrollbar" data-page="hermanos">
            {/* Header hero liquid (marino + dorado) */}
            <PageHero
                title={t('hermanos.title').split(' ')[0]}
                titleAccent={t('hermanos.title').split(' ').slice(1).join(' ')}
                subtitle={t('hermanos.desc')}
                subtitleVariant="line"
                actions={
                    <div className="w-full xl:w-96 group">
                        <div className="relative bg-white rounded-2xl flex items-center px-5 h-16 shadow-2xl border-[1.5px] border-[rgba(184,150,74,0.45)] focus-within:border-[#b8964a] focus-within:ring-2 focus-within:ring-[rgba(184,150,74,0.25)] transition-all">
                            <Search className="w-5 h-5 text-[#b8964a] mr-3 shrink-0" />
                            <input
                                type="text"
                                placeholder={t('hermanos.searchPlaceholder')}
                                className="w-full bg-transparent border-none outline-none font-bold placeholder:text-slate-400 text-slate-800 text-lg"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                }
            />

            {/* Listado con Animación Stagger */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {t('hermanos.showing')
                            .replace('{count}', filteredHermanos.length.toString())
                            .replace('{plural}', filteredHermanos.length !== 1 ? 's' : '')}
                    </h2>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar w-full sm:w-auto -mx-2 sm:mx-0 px-2 sm:px-0">
                        {ROLE_FILTERS.map((role) => (
                            <button
                                key={role}
                                onClick={() => setFilterRole(role)}
                                className={cn(
                                    "px-5 py-3 sm:px-4 sm:py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap min-w-[80px] sm:min-w-0 flex items-center justify-center touch-manipulation",
                                    filterRole === role
                                        ? "bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]"
                                        : "bg-white border-[rgba(184,150,74,0.32)] text-slate-600 hover:bg-[#f8f3e8] hover:border-[#b8964a]"
                                )}
                            >
                                <span suppressHydrationWarning>{t(getRoleLabelKey(role))}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="popLayout">
                    {filteredHermanos.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center justify-center py-40 bg-white/60 rounded-[3rem] border-dashed border-2 border-[rgba(184,150,74,0.3)]"
                        >
                            <div className="relative">
                                <Search className="w-24 h-24 text-[#1f2e85]/10" />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#b8964a]/20 flex items-center justify-center"
                                >
                                    <Sparkles className="w-4 h-4 text-[#b68f2f]" />
                                </motion.div>
                            </div>
                            <p className="mt-6 text-2xl font-black tracking-tight text-slate-400 uppercase">
                                {t('hermanos.noResults')}
                            </p>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                            {filteredHermanos.map((hermano, index) => (
                                <motion.div
                                    layout
                                    key={hermano.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.03, duration: 0.4 }}
                                    className="group relative cursor-pointer"
                                    onClick={() => openDetails(hermano)}
                                >
                                    {/* Fondo de tarjeta con hover glow */}
                                    <div className={cn(
                                        "absolute inset-0 rounded-4xl blur-xl transition-all opacity-0 group-hover:opacity-10",
                                        getRoleGlowColor(hermano.rol)
                                    )} />

                                    <div className="relative h-full ofrenda-liquid-card rounded-4xl p-5 transition-all duration-500 hover:shadow-xl hover:shadow-[#1f2e85]/10 hover:-translate-y-1.5 flex flex-col items-center text-center overflow-hidden">

                                        {/* Decoración superior */}
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-15 transition-opacity text-[#1f2e85]">
                                            {hermano.rol === 'ADMIN' ? <ShieldCheck className="w-12 h-12" /> : <Award className="w-12 h-12" />}
                                        </div>

                                        {/* Avatar Component Compacto */}
                                        <HermanoAvatar hermano={hermano} size="sm" />

                                        {/* Info Hermano Compacta */}
                                        <div className="mt-4 space-y-1 w-full">
                                            <h3 className="text-sm font-black tracking-tight uppercase leading-tight truncate text-slate-900">
                                                {highlightText(hermano.nombre, searchTerm)}
                                            </h3>
                                            <p className="text-[10px] font-bold text-[#1f2e85]/80 uppercase truncate">
                                                {highlightText(hermano.apellidos, searchTerm)}
                                            </p>

                                            <div className="pt-2 flex flex-wrap justify-center gap-1">
                                                <span className={cn(
                                                    "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full border shadow-sm",
                                                    getRoleStyles(hermano.rol).bg,
                                                    getRoleStyles(hermano.rol).text,
                                                    getRoleStyles(hermano.rol).border
                                                )}>
                                                    <span suppressHydrationWarning>{t(getRoleLabelKey(hermano.rol))}</span>
                                                </span>

                                                {hermano.pulpito && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                        <CheckCircle2 className="w-2 h-2" />
                                                        <span suppressHydrationWarning>{t('hermanos.pulpitoBadge' as TranslationKey)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal de Detalles */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md p-0 overflow-visible bg-transparent border-none shadow-none">
                    {selectedHermano && (
                        <div className="relative ofrenda-liquid-card rounded-[3rem] p-8 md:p-10 shadow-[0_30px_100px_rgba(21,31,92,0.35)] overflow-hidden">
                            {/* Glow de fondo */}
                            <div className={cn(
                                "absolute -top-24 -right-24 w-64 h-64 blur-[100px] opacity-20 rounded-full",
                                getRoleGlowColor(selectedHermano.rol)
                            )} />

                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white border-[1.5px] border-[rgba(184,150,74,0.32)] flex items-center justify-center text-slate-500 hover:text-[#1f2e85] hover:border-[#b8964a] hover:bg-[#f8f3e8] transition-all hover:scale-110 z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex flex-col items-center text-center space-y-6">
                                <HermanoAvatar hermano={selectedHermano} size="xl" />

                                <div className="space-y-2">
                                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none text-slate-900">
                                        {selectedHermano.nombre}
                                        <span className="block text-[#1f2e85]">
                                            {selectedHermano.apellidos}
                                        </span>
                                    </h2>
                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        <span className={cn(
                                            "px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border shadow-sm",
                                            getRoleStyles(selectedHermano.rol).bg,
                                            getRoleStyles(selectedHermano.rol).text,
                                            getRoleStyles(selectedHermano.rol).border
                                        )}>
                                            <span suppressHydrationWarning>{t(getRoleLabelKey(selectedHermano.rol))}</span>
                                        </span>
                                        {selectedHermano.pulpito && (
                                            <div className="flex items-center gap-1.5 px-4 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span suppressHydrationWarning>{t('users.form.pulpit')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full space-y-4 pt-6">
                                    {/* Sección de Contacto */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 px-2">
                                            <div className="h-px flex-1 bg-[rgba(184,150,74,0.3)]" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#b68f2f]">{t('hermanos.contactInfo')}</span>
                                            <div className="h-px flex-1 bg-[rgba(184,150,74,0.3)]" />
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            {/* Teléfono */}
                                            {selectedHermano.telefono ? (
                                                <a
                                                    href={`tel:${selectedHermano.telefono}`}
                                                    className="bg-white/70 border border-[rgba(184,150,74,0.3)] rounded-2xl p-4 flex items-center gap-4 group hover:bg-[#f8f3e8] hover:border-[#b8964a] transition-all"
                                                >
                                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                                        <Phone className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('users.form.phone')}</p>
                                                        <p className="font-bold text-lg text-slate-800">{selectedHermano.telefono}</p>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="bg-white/70 border border-[rgba(184,150,74,0.25)] rounded-2xl p-4 opacity-50 flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-500">
                                                        <XCircle className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('users.form.phone')}</p>
                                                        <p className="font-bold text-slate-600" suppressHydrationWarning>{t('common.notAvailable' as TranslationKey)}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Email de Contacto */}
                                            {selectedHermano.email_contacto ? (
                                                <a
                                                    href={`mailto:${selectedHermano.email_contacto}`}
                                                    className="bg-white/70 border border-[rgba(184,150,74,0.3)] rounded-2xl p-4 flex items-center gap-4 group hover:bg-[#f8f3e8] hover:border-[#b8964a] transition-all"
                                                >
                                                    <div className="w-12 h-12 rounded-xl bg-[#1f2e85]/10 flex items-center justify-center text-[#1f2e85] group-hover:scale-110 transition-transform">
                                                        <Mail className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('users.form.contactEmail')}</p>
                                                        <p className="font-bold truncate max-w-[200px] text-slate-800">{selectedHermano.email_contacto}</p>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="bg-white/70 border border-[rgba(184,150,74,0.25)] rounded-2xl p-4 opacity-50 flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-500">
                                                        <Mail className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('users.form.contactEmail')}</p>
                                                        <p className="font-bold text-slate-600" suppressHydrationWarning>{t('common.notAvailable' as TranslationKey)}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Información de Sistema */}
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div className="bg-white/70 border border-[rgba(184,150,74,0.25)] rounded-2xl p-4 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('hermanos.registeredSince')}</p>
                                            <p className="font-bold text-sm text-slate-800">
                                                {new Date(selectedHermano.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        <div className="bg-white/70 border border-[rgba(184,150,74,0.25)] rounded-2xl p-4 text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('hermanos.emailAccess')}</p>
                                            <p className="font-bold text-[10px] truncate text-slate-600">
                                                {selectedHermano.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Stats Flotantes Mejoradas */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 sm:px-8 py-4 sm:py-5 ofrenda-liquid-card rounded-[2.5rem] shadow-[0_20px_50px_rgba(21,31,92,0.3)] flex items-center gap-8 sm:gap-12"
            >
                <div className="flex items-center gap-4 group cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-[#1f2e85]/10 flex items-center justify-center text-[#1f2e85] group-hover:scale-110 transition-transform">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-black leading-none text-[#1f2e85]">{stats.pulpito}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('hermanos.statsPulpito')}</p>
                    </div>
                </div>

                <div className="w-px h-10 bg-[rgba(184,150,74,0.35)]" />

                <div className="flex items-center gap-4 group cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-[#b8964a]/15 flex items-center justify-center text-[#b68f2f] group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-black leading-none text-[#1f2e85]">{stats.total}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('hermanos.statsTotal')}</p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
