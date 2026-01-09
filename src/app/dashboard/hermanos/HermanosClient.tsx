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
import { Search, Users, ShieldCheck, Mail, Sparkles, Award, CheckCircle2, XCircle, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import BackButton from '@/components/BackButton'
import { Profile } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import NextImage from 'next/image'

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

export default function HermanosClient({ initialHermanos, stats }: HermanosClientProps) {
    const { t } = useI18n()
    const [hermanos, setHermanos] = useState<Profile[]>(initialHermanos)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRole, setFilterRole] = useState<'ALL' | 'ADMIN' | 'EDITOR' | 'VIEWER'>('ALL')
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
        return parts.map((part, index) =>
            regex.test(part)
                ? <strong key={index} className="text-primary font-black bg-primary/10 px-0.5 rounded">{part}</strong>
                : part
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4 md:px-6 no-scrollbar" data-page="hermanos">
            {/* Breadcrumb Mejorado */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between"
            >
                <BackButton fallbackUrl="/dashboard" />

                <div className="hidden sm:flex items-center gap-2 text-xs font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                    <Sparkles className="w-3 h-3 text-primary" />
                    IDMJI Sabadell
                </div>
            </motion.div>

            {/* Header Modernizado */}
            <div className="flex flex-col xl:flex-row gap-8 justify-between items-start xl:items-end">
                <div className="space-y-4 max-w-2xl">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-black tracking-tight leading-none"
                    >
                        {t('hermanos.title').split(' ')[0]}
                        <span className="block text-transparent bg-clip-text bg-linear-to-r from-primary via-accent to-primary animate-gradient-x">
                            {t('hermanos.title').split(' ').slice(1).join(' ')}
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg md:text-xl text-muted-foreground font-medium flex items-center gap-3"
                    >
                        <span className="w-10 h-[2px] bg-primary/30 hidden sm:block" />
                        {t('hermanos.desc')}
                    </motion.p>
                </div>

                {/* Buscador */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full xl:w-96 group"
                >
                    <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-focus-within:bg-primary/30 transition-all opacity-0 group-focus-within:opacity-100" />
                    <div className="relative glass border border-white/10 rounded-2xl flex items-center px-5 h-16 shadow-2xl focus-within:border-primary transition-all">
                        <Search className="w-5 h-5 text-primary/50 mr-3 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder={t('hermanos.searchPlaceholder')}
                            className="w-full bg-transparent border-none outline-none font-bold placeholder:text-muted-foreground/30 text-foreground text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </motion.div>
            </div>

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
                        {['ALL', 'ADMIN', 'EDITOR'].map((role) => (
                            <button
                                key={role}
                                onClick={() => setFilterRole(role as 'ALL' | 'ADMIN' | 'EDITOR')}
                                className={cn(
                                    "px-5 py-3 sm:px-4 sm:py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap min-w-[80px] sm:min-w-0 flex items-center justify-center",
                                    filterRole === role
                                        ? "bg-foreground text-background border-foreground shadow-lg"
                                        : "bg-white/60 dark:bg-white/5 border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-muted-foreground hover:bg-white/80 dark:hover:bg-white/10 backdrop-blur-md"
                                )}
                            >
                                {role === 'ALL' ? t('hermanos.filterAll') : role}
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
                            className="flex flex-col items-center justify-center py-40 glass rounded-[3rem] border-dashed border-2 border-white/5"
                        >
                            <div className="relative">
                                <Search className="w-24 h-24 text-primary/10" />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center"
                                >
                                    <Sparkles className="w-4 h-4 text-accent" />
                                </motion.div>
                            </div>
                            <p className="mt-6 text-2xl font-black tracking-tight text-muted-foreground/40 uppercase">
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
                                        hermano.rol === 'ADMIN' ? 'bg-red-500' : 'bg-primary'
                                    )} />

                                    <div className="relative h-full glass border border-white/10 rounded-4xl p-5 hover:bg-white/5 dark:hover:bg-muted/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 flex flex-col items-center text-center overflow-hidden">

                                        {/* Decoración superior */}
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                            {hermano.rol === 'ADMIN' ? <ShieldCheck className="w-12 h-12" /> : <Award className="w-12 h-12" />}
                                        </div>

                                        {/* Avatar Component Compacto */}
                                        <HermanoAvatar hermano={hermano} size="sm" />

                                        {/* Info Hermano Compacta */}
                                        <div className="mt-4 space-y-1 w-full">
                                            <h3 className="text-sm font-black tracking-tight uppercase leading-tight truncate">
                                                {highlightText(hermano.nombre, searchTerm)}
                                            </h3>
                                            <p className="text-[10px] font-bold text-primary/80 uppercase truncate">
                                                {highlightText(hermano.apellidos, searchTerm)}
                                            </p>

                                            <div className="pt-2 flex flex-wrap justify-center gap-1">
                                                <span className={cn(
                                                    "px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full border shadow-sm",
                                                    hermano.rol === 'ADMIN'
                                                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                        : 'bg-primary/10 text-primary border-primary/20'
                                                )}>
                                                    {hermano.rol}
                                                </span>

                                                {hermano.pulpito && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                        <CheckCircle2 className="w-2 h-2" />
                                                        Púlpito
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
                <DialogContent className="max-w-md p-0 overflow-visible bg-background border-none shadow-none">
                    {selectedHermano && (
                        <div className="relative glass border border-white/10 rounded-[3rem] p-8 md:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden">
                            {/* Glow de fondo */}
                            <div className={cn(
                                "absolute -top-24 -right-24 w-64 h-64 blur-[100px] opacity-20 rounded-full",
                                selectedHermano.rol === 'ADMIN' ? 'bg-red-500' : 'bg-primary'
                            )} />

                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover:scale-110 z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex flex-col items-center text-center space-y-6">
                                <HermanoAvatar hermano={selectedHermano} size="xl" />

                                <div className="space-y-2">
                                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none">
                                        {selectedHermano.nombre}
                                        <span className="block text-primary">
                                            {selectedHermano.apellidos}
                                        </span>
                                    </h2>
                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        <span className={cn(
                                            "px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border shadow-sm",
                                            selectedHermano.rol === 'ADMIN'
                                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                : 'bg-primary/10 text-primary border-primary/20'
                                        )}>
                                            {selectedHermano.rol}
                                        </span>
                                        {selectedHermano.pulpito && (
                                            <div className="flex items-center gap-1.5 px-4 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Acceso Púlpito
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="w-full space-y-4 pt-6">
                                    {/* Sección de Contacto */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 px-2">
                                            <div className="h-px flex-1 bg-white/5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{t('hermanos.contactInfo')}</span>
                                            <div className="h-px flex-1 bg-white/5" />
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            {/* Teléfono */}
                                            {selectedHermano.telefono ? (
                                                <a
                                                    href={`tel:${selectedHermano.telefono}`}
                                                    className="glass border border-white/5 rounded-2xl p-4 flex items-center gap-4 group hover:bg-primary/10 hover:border-primary/20 transition-all"
                                                >
                                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                                        <CheckCircle2 className="w-5 h-5" /> {/* Reemplazar con Phone si estuviera disponible, o usar Lucide Phone */}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{t('users.form.phone')}</p>
                                                        <p className="font-bold text-lg">{selectedHermano.telefono}</p>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="glass border border-white/5 rounded-2xl p-4 opacity-40 flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-zinc-500/10 flex items-center justify-center text-zinc-500">
                                                        <XCircle className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{t('users.form.phone')}</p>
                                                        <p className="font-bold">N/A</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Email de Contacto */}
                                            {selectedHermano.email_contacto ? (
                                                <a
                                                    href={`mailto:${selectedHermano.email_contacto}`}
                                                    className="glass border border-white/5 rounded-2xl p-4 flex items-center gap-4 group hover:bg-primary/10 hover:border-primary/20 transition-all"
                                                >
                                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                        <Mail className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{t('users.form.contactEmail')}</p>
                                                        <p className="font-bold truncate max-w-[200px]">{selectedHermano.email_contacto}</p>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="glass border border-white/5 rounded-2xl p-4 opacity-40 flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-zinc-500/10 flex items-center justify-center text-zinc-500">
                                                        <Mail className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{t('users.form.contactEmail')}</p>
                                                        <p className="font-bold">N/A</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Información de Sistema */}
                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div className="glass border border-white/5 rounded-2xl p-4 text-center">
                                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">{t('hermanos.registeredSince')}</p>
                                            <p className="font-bold text-sm">
                                                {new Date(selectedHermano.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        <div className="glass border border-white/5 rounded-2xl p-4 text-center">
                                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Email Acceso</p>
                                            <p className="font-bold text-[10px] truncate opacity-60">
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
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-8 py-5 glass border border-white/20 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-12 backdrop-blur-2xl"
            >
                <div className="flex items-center gap-4 group cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-black leading-none">{stats.pulpito}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t('hermanos.statsPulpito')}</p>
                    </div>
                </div>

                <div className="w-px h-10 bg-white/10" />

                <div className="flex items-center gap-4 group cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-2xl font-black leading-none">{stats.total}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t('hermanos.statsTotal')}</p>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
