/**
 * CultosPageClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para la gestión del calendario mensual de cultos.
 * Permite visualizar los cultos programados, su estado y automatizar la 
 * generación mensual basada en la configuración semanal.
 * 
 * Características:
 * - Calendario interactivo con estados (Completos/Pendientes)
 * - Generación automatizada de cultos por mes
 * - Estadísticas rápidas del mes seleccionado
 * - Feedback visual premium ante operaciones exitosas
 * - Soporte multiidioma (ES/CA)
 * - Diseño responsivo con scrollbar invisible
 * 
 * @author Antigravity AI
 * @date 2024-12-25
 */

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Calendar from '@/components/Calendar'
import { getCultosForMonth } from './actions'
import { getHermanos } from '../hermanos/actions'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Check, Calendar as CalendarIcon, CheckCircle, Clock, Sparkles, AlertCircle, Users, Search, X } from 'lucide-react'
import { getCultoStatus } from '@/lib/utils/culto-helpers'
import { useI18n } from '@/lib/i18n/I18nProvider'
import BackButton from '@/components/BackButton'
import { Culto } from '@/types/database'
import type { HermanoData } from '../hermanos/actions'

interface CultosPageClientProps {
    initialCultos: Culto[]
}

export default function CultosPageClient({ initialCultos }: CultosPageClientProps) {
    const { t } = useI18n()
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'))
    }, [])

    const [cultos, setCultos] = useState(initialCultos)

    const [view, setView] = useState<'month' | 'week' | 'day'>('month')
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [showSuccess] = useState(false)
    const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'pending'>('all')
    const [typeFilter, setTypeFilter] = useState<'all' | 'estudio' | 'alabanza' | 'ensenanza'>('all')
    const [showFestivosOnly, setShowFestivosOnly] = useState(false)
    const [selectedHermanos, setSelectedHermanos] = useState<string[]>([])
    const [showHermanosModal, setShowHermanosModal] = useState(false)
    const [hermanos, setHermanos] = useState<HermanoData[]>([])
    const [hermanosSearch, setHermanosSearch] = useState('')



    const handleMonthChange = async (year: number, month: number) => {
        setSelectedDate(new Date(year, month, 1))
        const { data } = await getCultosForMonth(year, month)
        setCultos(data || [])
    }

    const loadHermanos = async () => {
        const result = await getHermanos(hermanosSearch || undefined)
        if (result.success && result.data) {
            setHermanos(result.data)
        }
    }

    // Estado temporal para el modal (Draft State)
    const [tempSelectedHermanos, setTempSelectedHermanos] = useState<string[]>([])

    // Cargar hermanos y sincronizar estado temporal cuando se abre el modal
    useEffect(() => {
        if (showHermanosModal) {
            setTempSelectedHermanos(selectedHermanos) // Inicializar con la selección actual
            loadHermanos()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showHermanosModal])

    // Búsqueda con debounce
    useEffect(() => {
        if (showHermanosModal) {
            const timeoutId = setTimeout(() => {
                loadHermanos()
            }, 300)
            return () => clearTimeout(timeoutId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hermanosSearch, showHermanosModal])

    const toggleHermano = (hermanoId: string) => {
        console.log('Toggling hermano:', hermanoId)
        setTempSelectedHermanos(prev =>
            prev.includes(hermanoId)
                ? prev.filter(id => id !== hermanoId)
                : [...prev, hermanoId]
        )
    }

    const applyHermanosFilter = () => {
        console.log('Applying filter with:', tempSelectedHermanos)
        setSelectedHermanos(tempSelectedHermanos)
        setShowHermanosModal(false)
    }

    const getHermanoName = (hermanoId: string) => {
        // Buscar en la lista actual o intentar mantener el nombre si ya no está en la lista (TODO: Idealmente tener un map cache)
        const hermano = hermanos.find(h => h.id === hermanoId)
        return hermano ? `${hermano.nombre || ''} ${hermano.apellidos || ''}`.trim() : 'Filtro Activo'
    }

    const totalCultos = cultos.length
    const completeCultos = cultos.filter(c => getCultoStatus(c) === 'complete').length
    const pendingCultos = cultos.filter(c => getCultoStatus(c) === 'pending').length

    const filteredCultos = cultos.filter(c => {
        // Filtro de Festivos
        if (showFestivosOnly && !c.es_laborable_festivo) return false

        // Filtro de Estado
        if (statusFilter !== 'all') {
            const status = getCultoStatus(c)
            if (status !== statusFilter) return false
        }

        // Filtro de Tipo
        if (typeFilter !== 'all') {
            const nombre = c.tipo_culto?.nombre?.toLowerCase() || ''
            if (typeFilter === 'estudio' && !nombre.includes('estudio')) return false
            if (typeFilter === 'alabanza' && !nombre.includes('alabanza')) return false
            if (typeFilter === 'ensenanza' && !nombre.includes('enfermedad') && !nombre.includes('enseñanza')) return false
        }

        // Filtro por Hermanos
        if (selectedHermanos.length > 0) {
            const hasSelectedHermano =
                (c.id_usuario_intro && selectedHermanos.includes(c.id_usuario_intro)) ||
                (c.id_usuario_ensenanza && selectedHermanos.includes(c.id_usuario_ensenanza)) ||
                (c.id_usuario_finalizacion && selectedHermanos.includes(c.id_usuario_finalizacion)) ||
                (c.id_usuario_testimonios && selectedHermanos.includes(c.id_usuario_testimonios))

            if (!hasSelectedHermano) return false
        }

        return true
    })

    const handleViewChange = async (newView: 'month' | 'week' | 'day') => {
        setView(newView)
        // User Request: Al filtrar por "día", ir al día actual (Hoy) por defecto
        if (newView === 'day') {
            const today = new Date()
            setSelectedDate(today)
            // Asegurar que tenemos los datos del mes actual
            const { data } = await getCultosForMonth(today.getFullYear(), today.getMonth())
            if (data) setCultos(data)
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4 md:px-8 relative no-scrollbar">
            {/* Animación de Éxito Premium */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-1000 flex items-center justify-center bg-background/60 backdrop-blur-2xl pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.5, rotate: -15, y: 50 }}
                            animate={{ scale: 1, rotate: 0, y: 0 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="glass rounded-[3rem] p-16 shadow-[0_50px_100px_rgba(0,0,0,0.2)] flex flex-col items-center gap-8 border-2 border-primary/20 bg-white/80 dark:bg-black/80"
                        >
                            <div className="relative">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 2.5 }}
                                    className="w-28 h-28 rounded-3xl bg-linear-to-br from-primary via-blue-600 to-accent flex items-center justify-center shadow-2xl shadow-primary/30"
                                >
                                    <Check className="w-14 h-14 text-white" strokeWidth={5} />
                                </motion.div>
                                <Sparkles className="absolute -top-6 -right-6 w-12 h-12 text-yellow-400 animate-pulse" />
                                <Sparkles className="absolute -bottom-4 -left-6 w-8 h-8 text-blue-400 animate-bounce delay-100" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">
                                    {t('calendar.success')}
                                </h2>
                                <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs opacity-70">
                                    {t('calendar.total')}: {totalCultos}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header / Breadcrumb */}
            <div className="space-y-6">
                <BackButton fallbackUrl="/dashboard" />

                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-5xl md:text-6xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-[#063b7a]'}`}
                        >
                            {t('calendar.title')}
                        </motion.h1>
                        <div className="text-muted-foreground font-bold tracking-wide flex items-center gap-2.5 uppercase text-xs opacity-80">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            {t('dashboard.calendarDesc')}
                        </div>
                    </div>


                </div>
            </div>

            {/* Contenedor Principal: Calendario */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative group"
            >
                <div className="absolute -inset-4 bg-linear-to-r from-primary/10 via-accent/10 to-primary/10 rounded-[3rem] blur-3xl opacity-30 group-hover:opacity-60 transition duration-1000" />
                <div className="relative glass rounded-[3rem] p-4 md:p-8 overflow-hidden border border-white/20 dark:border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.12)]">

                    {/* Panel de Filtros Premium - Diseño Compacto */}
                    <div className="flex flex-col gap-4 mb-6">
                        {/* Fila 1: Vista y Estado */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Etiqueta Vista */}
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 hidden sm:inline">Vista:</span>

                            {/* Selector de Vista - Compacto */}
                            <div className="flex bg-muted/40 p-1 rounded-xl border border-border/30 shadow-sm">
                                <button
                                    onClick={() => handleViewChange('month')}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${view === 'month'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                                        }`}
                                >
                                    Mes
                                </button>
                                <button
                                    onClick={() => handleViewChange('week')}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${view === 'week'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                                        }`}
                                >
                                    Semana
                                </button>
                                <button
                                    onClick={() => handleViewChange('day')}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${view === 'day'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                                        }`}
                                >
                                    Día
                                </button>
                            </div>

                            <div className="hidden sm:block w-px h-6 bg-border/50" />

                            {/* Etiqueta Estado */}
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 hidden sm:inline">Estado:</span>

                            {/* Selector de Estado - Compacto */}
                            <div className="flex bg-muted/40 p-1 rounded-xl border border-border/30 shadow-sm">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${statusFilter === 'all'
                                        ? 'bg-slate-600 text-white shadow-md'
                                        : 'text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900/20 hover:text-slate-600'
                                        }`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setStatusFilter('complete')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${statusFilter === 'complete'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600'
                                        }`}
                                >
                                    <CheckCircle className="w-3 h-3" />
                                    <span className="hidden md:inline">Completos</span>
                                </button>
                                <button
                                    onClick={() => setStatusFilter('pending')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${statusFilter === 'pending'
                                        ? 'bg-amber-600 text-white shadow-md'
                                        : 'text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600'
                                        }`}
                                >
                                    <Clock className="w-3 h-3" />
                                    <span className="hidden md:inline">Pendientes</span>
                                </button>
                            </div>
                        </div>

                        {/* Fila 2: Tipo, Festivos y Hermanos */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Etiqueta Tipo */}
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 hidden sm:inline">Tipo:</span>

                            {/* Selector de Tipo - Compacto */}
                            <div className="flex bg-muted/40 p-1 rounded-xl border border-border/30 shadow-sm">
                                <button
                                    onClick={() => setTypeFilter('all')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'all'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-muted-foreground hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600'
                                        }`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setTypeFilter('estudio')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'estudio'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600'
                                        }`}
                                >
                                    Estudio
                                </button>
                                <button
                                    onClick={() => setTypeFilter('alabanza')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'alabanza'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                                        }`}
                                >
                                    Alabanza
                                </button>
                                <button
                                    onClick={() => setTypeFilter('ensenanza')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'ensenanza'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-muted-foreground hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600'
                                        }`}
                                >
                                    Enseñanza
                                </button>
                            </div>

                            <div className="hidden sm:block w-px h-6 bg-border/50" />

                            {/* Botón Festivos */}
                            <button
                                onClick={() => setShowFestivosOnly(!showFestivosOnly)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${showFestivosOnly
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 border-amber-600'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 border-border/30'
                                    }`}
                            >
                                <AlertCircle className={`w-3.5 h-3.5 ${showFestivosOnly ? 'text-white' : 'text-amber-500'}`} />
                                Festivos
                            </button>

                            {/* Botón Hermanos */}
                            <button
                                onClick={() => setShowHermanosModal(true)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${selectedHermanos.length > 0
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 border-purple-700'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 border-border/30'
                                    }`}
                            >
                                <Users className={`w-3.5 h-3.5 ${selectedHermanos.length > 0 ? 'text-white' : 'text-purple-500'}`} />
                                Hermanos
                                {selectedHermanos.length > 0 && (
                                    <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[8px]">
                                        {selectedHermanos.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <Calendar
                        events={filteredCultos}
                        onMonthChange={handleMonthChange}
                        view={view}
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                    />

                    {/* Mostrar mensaje si no hay resultados PERO solo si hay filtros activos, para no romper la navegación en meses vacíos */}
                    {
                        cultos.length > 0 && filteredCultos.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                                <p className="text-sm text-muted-foreground font-medium">
                                    No se encontraron eventos con los filtros actuales.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter('all')
                                        setTypeFilter('all')
                                        setShowFestivosOnly(false)
                                        setSelectedHermanos([])
                                    }}
                                >
                                    Limpiar Filtros
                                </Button>
                            </div>
                        )
                    }
                </div >
            </motion.div >

            {/* Grid de Estadísticas con Diseño Premium */}
            < div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8" >
                {
                    [
                        { label: t('calendar.total'), value: totalCultos, icon: CalendarIcon, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
                        { label: t('calendar.complete'), value: completeCultos, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                        { label: t('calendar.pending'), value: pendingCultos, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
                    ].map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + idx * 0.1 }}
                            className={`glass rounded-4xl p-8 border ${stat.border} group hover:scale-[1.02] transition-all shadow-xl relative overflow-hidden`}
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`} />

                            <div className="flex items-center gap-6 relative z-10">
                                <div className={`p-5 ${stat.bg} rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner border border-white/10`}>
                                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-1 leading-none">
                                        {stat.label}
                                    </p>
                                    <p className={`text-5xl font-black tracking-tighter ${stat.color} leading-none`}>
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))
                }
            </div >



            {/* Modal de Selección de Hermanos */}
            < Modal
                isOpen={showHermanosModal}
                onClose={() => setShowHermanosModal(false)
                }
                title="Filtrar por Hermanos"
                size="lg"
            >
                <div className="space-y-6 pt-6">
                    {/* Búsqueda */}
                    <Input
                        icon={<Search className="w-4 h-4" />}
                        placeholder="Buscar hermanos..."
                        value={hermanosSearch}
                        onChange={(e) => setHermanosSearch(e.target.value)}
                    />

                    {/* Hermanos Seleccionados (Draft) */}
                    {tempSelectedHermanos.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Seleccionados ({tempSelectedHermanos.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {tempSelectedHermanos.map(hermanoId => (
                                    <div
                                        key={hermanoId}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-xl text-[10px] font-bold"
                                    >
                                        <span>{getHermanoName(hermanoId) || 'Hermano'}</span>
                                        <button
                                            onClick={() => toggleHermano(hermanoId)}
                                            className="hover:bg-purple-500/30 rounded-full p-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lista de Hermanos */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {hermanos.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8 text-sm">
                                No se encontraron hermanos
                            </p>
                        ) : (
                            hermanos.map(hermano => {
                                const isSelected = tempSelectedHermanos.includes(hermano.id)
                                const fullName = `${hermano.nombre || ''} ${hermano.apellidos || ''}`.trim() || hermano.email
                                return (
                                    <div
                                        key={hermano.id}
                                        onClick={() => toggleHermano(hermano.id)}
                                        role="button"
                                        className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer select-none ${isSelected
                                            ? 'bg-purple-500/20 border-purple-500/50 shadow-lg'
                                            : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between pointer-events-none">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate">{fullName}</p>
                                                {hermano.email && (
                                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                                        {hermano.email}
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <CheckCircle className="w-5 h-5 text-purple-600 shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-4 pt-4 border-t border-border/50">
                        <Button
                            onClick={() => {
                                setTempSelectedHermanos([])
                            }}
                            variant="ghost"
                            className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"
                        >
                            Limpiar
                        </Button>
                        <Button
                            onClick={applyHermanosFilter}
                            className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-purple-500/20 border-b-4 border-purple-800 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Aplicar Filtro
                        </Button>
                    </div>
                </div>
            </Modal >
        </div >
    )
}
