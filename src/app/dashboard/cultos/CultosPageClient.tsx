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
import { motion } from 'framer-motion'
import Calendar from '@/components/Calendar'
import { getCultosForMonth } from './actions'
import { getHermanos } from '../hermanos/actions'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Calendar as CalendarIcon, CheckCircle, Clock, AlertCircle, Users, Search, X } from 'lucide-react'
import { getCultoStatus } from '@/lib/utils/culto-helpers'
import { useI18n } from '@/lib/i18n/I18nProvider'
import BackButton from '@/components/BackButton'
import { Culto } from '@/types/database'
import type { HermanoData } from '../hermanos/actions'

interface CultosPageClientProps {
    initialCultos: Culto[]
    initialDate: Date
}

export default function CultosPageClient({ initialCultos, initialDate }: CultosPageClientProps) {
    const { t } = useI18n()

    const [cultos, setCultos] = useState(initialCultos)

    const [view, setView] = useState<'month' | 'week' | 'day'>('week')
    const [selectedDate, setSelectedDate] = useState(new Date(initialDate))
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
        setTempSelectedHermanos(prev =>
            prev.includes(hermanoId)
                ? prev.filter(id => id !== hermanoId)
                : [...prev, hermanoId]
        )
    }

    const applyHermanosFilter = () => {
        setSelectedHermanos(tempSelectedHermanos)
        setShowHermanosModal(false)
    }

    const getHermanoName = (hermanoId: string) => {
        // Buscar en la lista actual o intentar mantener el nombre si ya no está en la lista (TODO: Idealmente tener un map cache)
        const hermano = hermanos.find(h => h.id === hermanoId)
        return hermano ? `${hermano.nombre || ''} ${hermano.apellidos || ''}`.trim() : t('calendar.activeFilter')
    }

    // Comparación sin acentos ni mayúsculas (p. ej. "Enseñanza" → "ensenanza")
    const normalizeName = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

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
            const nombre = normalizeName(c.tipo_culto?.nombre || '')
            if (typeFilter === 'estudio' && !nombre.includes('estudio')) return false
            if (typeFilter === 'alabanza' && !nombre.includes('alabanza')) return false
            if (typeFilter === 'ensenanza' && !nombre.includes('ensenanza')) return false
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

    // Stats sobre lo visible (reflejan los filtros activos)
    const totalCultos = filteredCultos.length
    const completeCultos = filteredCultos.filter(c => getCultoStatus(c) === 'complete').length
    const pendingCultos = filteredCultos.filter(c => getCultoStatus(c) === 'pending').length

    const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || showFestivosOnly || selectedHermanos.length > 0
    const clearAllFilters = () => {
        setStatusFilter('all')
        setTypeFilter('all')
        setShowFestivosOnly(false)
        setSelectedHermanos([])
    }

    return (
        <div className="ofrenda-liquid-scope max-w-7xl mx-auto space-y-10 pb-20 px-4 md:px-8 relative no-scrollbar">
            {/* Header / Breadcrumb */}
            <div className="space-y-6">
                <BackButton fallbackUrl="/dashboard" />

                {/* Hero liquid (marino + dorado) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-[2rem] md:rounded-[3rem] border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] via-[#283593] to-[#151f5c] p-6 md:p-10 shadow-2xl"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#b8964a]/25 rounded-full blur-[110px] -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute inset-x-[8%] top-0 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#b68f2f,#e3cc92 42%,#d4b86a 58%,#b68f2f)', boxShadow: '0 0 12px rgba(227,204,146,0.6)' }} />
                    <div className="relative z-10 space-y-2">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">
                            {t('calendar.title')}
                        </h1>
                        <div className="text-white/70 font-bold tracking-wide flex items-center gap-2.5 uppercase text-xs">
                            <div className="w-2 h-2 rounded-full bg-[#e3cc92] animate-pulse" />
                            {t('dashboard.calendarDesc')}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Contenedor Principal: Calendario */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative group"
            >
                <div className="absolute -inset-4 bg-linear-to-r from-[#1f2e85]/10 via-[#b8964a]/10 to-[#1f2e85]/10 rounded-[3rem] blur-3xl opacity-30 group-hover:opacity-60 transition duration-1000" />
                <div className="relative ofrenda-liquid-card rounded-[3rem] p-4 md:p-8 overflow-hidden">

                    {/* Panel de Filtros Premium - Diseño Compacto */}
                    <div className="flex flex-col gap-4 mb-6">
                        {/* Fila 1: Vista y Estado */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Etiqueta Vista */}
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 hidden sm:inline">{t('calendar.viewLabel')}</span>

                            {/* Selector de Vista - Compacto */}
                            <div className="flex bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1 rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] shadow-sm">
                                <button
                                    onClick={() => handleViewChange('month')}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${view === 'month'
                                        ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-md'
                                        : 'text-slate-500 hover:text-[#1f2e85]'
                                        }`}
                                >
                                    {t('calendar.viewMonth')}
                                </button>
                                <button
                                    onClick={() => handleViewChange('week')}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${view === 'week'
                                        ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-md'
                                        : 'text-slate-500 hover:text-[#1f2e85]'
                                        }`}
                                >
                                    {t('calendar.viewWeek')}
                                </button>
                                <button
                                    onClick={() => handleViewChange('day')}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${view === 'day'
                                        ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-md'
                                        : 'text-slate-500 hover:text-[#1f2e85]'
                                        }`}
                                >
                                    {t('calendar.viewDay')}
                                </button>
                            </div>

                            <div className="hidden sm:block w-px h-6 bg-[rgba(184,150,74,0.35)]" />

                            {/* Etiqueta Estado */}
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 hidden sm:inline">{t('calendar.statusLabel')}</span>

                            {/* Selector de Estado - Compacto (verde/ámbar semánticos) */}
                            <div className="flex bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1 rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] shadow-sm">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${statusFilter === 'all'
                                        ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-md'
                                        : 'text-slate-500 hover:text-[#1f2e85]'
                                        }`}
                                >
                                    {t('calendar.statusAll')}
                                </button>
                                <button
                                    onClick={() => setStatusFilter('complete')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${statusFilter === 'complete'
                                        ? 'bg-emerald-600 text-white shadow-md border border-[#b8964a]/60'
                                        : 'text-slate-500 hover:text-emerald-600'
                                        }`}
                                >
                                    <CheckCircle className="w-3 h-3" />
                                    <span className="hidden md:inline">{t('calendar.complete')}</span>
                                </button>
                                <button
                                    onClick={() => setStatusFilter('pending')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${statusFilter === 'pending'
                                        ? 'bg-amber-600 text-white shadow-md border border-[#b8964a]/60'
                                        : 'text-slate-500 hover:text-amber-600'
                                        }`}
                                >
                                    <Clock className="w-3 h-3" />
                                    <span className="hidden md:inline">{t('calendar.pending')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Fila 2: Tipo, Festivos y Hermanos */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Etiqueta Tipo */}
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 hidden sm:inline">{t('calendar.typeLabel')}</span>

                            {/* Selector de Tipo - Compacto (color por tipo = identidad) */}
                            <div className="flex bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1 rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] shadow-sm">
                                <button
                                    onClick={() => setTypeFilter('all')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'all'
                                        ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-md'
                                        : 'text-slate-500 hover:text-[#1f2e85]'
                                        }`}
                                >
                                    {t('calendar.statusAll')}
                                </button>
                                <button
                                    onClick={() => setTypeFilter('estudio')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'estudio'
                                        ? 'bg-emerald-600 text-white shadow-md border border-[#b8964a]/60'
                                        : 'text-slate-500 hover:text-emerald-600'
                                        }`}
                                >
                                    {t('calendar.typeEstudio')}
                                </button>
                                <button
                                    onClick={() => setTypeFilter('alabanza')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'alabanza'
                                        ? 'bg-blue-600 text-white shadow-md border border-[#b8964a]/60'
                                        : 'text-slate-500 hover:text-blue-600'
                                        }`}
                                >
                                    {t('calendar.typeAlabanza')}
                                </button>
                                <button
                                    onClick={() => setTypeFilter('ensenanza')}
                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${typeFilter === 'ensenanza'
                                        ? 'bg-purple-600 text-white shadow-md border border-[#b8964a]/60'
                                        : 'text-slate-500 hover:text-purple-600'
                                        }`}
                                >
                                    {t('calendar.typeEnsenanza')}
                                </button>
                            </div>

                            <div className="hidden sm:block w-px h-6 bg-[rgba(184,150,74,0.35)]" />

                            {/* Botón Festivos */}
                            <button
                                onClick={() => setShowFestivosOnly(!showFestivosOnly)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${showFestivosOnly
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 border-amber-600'
                                    : 'bg-white text-slate-500 hover:bg-[#f8f3e8] hover:text-amber-600 border-[rgba(184,150,74,0.32)] hover:border-[#b8964a]'
                                    }`}
                            >
                                <AlertCircle className={`w-3.5 h-3.5 ${showFestivosOnly ? 'text-white' : 'text-amber-500'}`} />
                                {t('calendar.filterFestivos')}
                            </button>

                            {/* Botón Hermanos */}
                            <button
                                onClick={() => setShowHermanosModal(true)}
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${selectedHermanos.length > 0
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 border-purple-700'
                                    : 'bg-white text-slate-500 hover:bg-[#f8f3e8] hover:text-purple-600 border-[rgba(184,150,74,0.32)] hover:border-[#b8964a]'
                                    }`}
                            >
                                <Users className={`w-3.5 h-3.5 ${selectedHermanos.length > 0 ? 'text-white' : 'text-purple-500'}`} />
                                {t('calendar.filterHermanos')}
                                {selectedHermanos.length > 0 && (
                                    <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-[8px]">
                                        {selectedHermanos.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Resumen de filtros activos */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap items-center gap-2 pt-1" data-testid="calendar-active-filters">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#b68f2f]" suppressHydrationWarning>
                                    {(t('calendar.visibleCount' as Parameters<typeof t>[0]) as string).replace('{n}', String(filteredCultos.length))}
                                </span>
                                {statusFilter !== 'all' && (
                                    <button onClick={() => setStatusFilter('all')} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] text-[#1f2e85] hover:border-[#b8964a] transition-colors">
                                        {statusFilter === 'complete' ? t('calendar.complete') : t('calendar.pending')}
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                                {typeFilter !== 'all' && (
                                    <button onClick={() => setTypeFilter('all')} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] text-[#1f2e85] hover:border-[#b8964a] transition-colors">
                                        {typeFilter === 'estudio' ? t('calendar.typeEstudio') : typeFilter === 'alabanza' ? t('calendar.typeAlabanza') : t('calendar.typeEnsenanza')}
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                                {showFestivosOnly && (
                                    <button onClick={() => setShowFestivosOnly(false)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] text-amber-700 hover:border-[#b8964a] transition-colors">
                                        {t('calendar.filterFestivos')}
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                                {selectedHermanos.length > 0 && (
                                    <button onClick={() => setSelectedHermanos([])} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] text-purple-700 hover:border-[#b8964a] transition-colors">
                                        {t('calendar.filterHermanos')} ({selectedHermanos.length})
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                                <button onClick={clearAllFilters} className="text-[9px] font-black uppercase tracking-widest text-[#1f2e85]/70 hover:text-[#1f2e85] underline transition-colors">
                                    {t('calendar.clearFilters')}
                                </button>
                            </div>
                        )}
                    </div>

                    <Calendar
                        events={filteredCultos}
                        onMonthChange={handleMonthChange}
                        view={view}
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        onDayOpen={(date) => {
                            setSelectedDate(date)
                            setView('day')
                        }}
                    />

                    {/* Mostrar mensaje si no hay resultados PERO solo si hay filtros activos, para no romper la navegación en meses vacíos */}
                    {
                        cultos.length > 0 && filteredCultos.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                                <p className="text-sm text-slate-500 font-medium">
                                    {t('calendar.noEventsFiltered')}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white border-[rgba(184,150,74,0.32)] text-[#1f2e85] hover:bg-[#f8f3e8] hover:border-[#b8964a]"
                                    onClick={clearAllFilters}
                                >
                                    {t('calendar.clearFilters')}
                                </Button>
                            </div>
                        )
                    }
                </div >
            </motion.div >

            {/* Grid de Estadísticas con Diseño Premium */}
            < div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8" >
                {
                    [
                        { label: t('calendar.total'), value: totalCultos, icon: CalendarIcon, color: 'text-[#1f2e85]', bg: 'bg-[#1f2e85]/10' },
                        { label: t('calendar.complete'), value: completeCultos, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                        { label: t('calendar.pending'), value: pendingCultos, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' }
                    ].map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + idx * 0.1 }}
                            className="ofrenda-liquid-card rounded-4xl p-5 lg:p-8 group hover:scale-[1.02] transition-all relative overflow-hidden"
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`} />

                            <div className="flex items-center gap-4 lg:gap-6 relative z-10">
                                <div className={`p-3 lg:p-5 ${stat.bg} rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner border border-[rgba(184,150,74,0.25)] shrink-0`}>
                                    <stat.icon className={`w-6 h-6 lg:w-8 lg:h-8 ${stat.color}`} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 leading-tight">
                                        {stat.label}
                                    </p>
                                    <p className={`text-3xl lg:text-5xl font-black tracking-tighter ${stat.color} leading-none`}>
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
                title={t('calendar.modalHermanosTitle')}
                size="lg"
            >
                <div className="space-y-6 pt-6">
                    {/* Búsqueda */}
                    <Input
                        icon={<Search className="w-4 h-4" />}
                        placeholder={t('calendar.modalHermanosSearch')}
                        value={hermanosSearch}
                        onChange={(e) => setHermanosSearch(e.target.value)}
                    />

                    {/* Hermanos Seleccionados (Draft) */}
                    {tempSelectedHermanos.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {t('calendar.modalHermanosSelected')} ({tempSelectedHermanos.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {tempSelectedHermanos.map(hermanoId => (
                                    <div
                                        key={hermanoId}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/15 text-purple-700 border border-purple-500/30 rounded-xl text-[10px] font-bold"
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
                            <p className="text-center text-slate-500 py-8 text-sm">
                                {t('calendar.modalHermanosNoResults')}
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
                                            ? 'bg-purple-500/15 border-purple-500/50 shadow-lg'
                                            : 'bg-white/70 border-[rgba(184,150,74,0.25)] hover:bg-[#f8f3e8]'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between pointer-events-none">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate text-slate-800">{fullName}</p>
                                                {hermano.email && (
                                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
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
                    <div className="flex gap-4 pt-4 border-t border-[rgba(184,150,74,0.25)]">
                        <Button
                            onClick={() => {
                                setTempSelectedHermanos([])
                            }}
                            variant="ghost"
                            className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] text-[#1f2e85] border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white hover:bg-[#f8f3e8] hover:border-[#b8964a]"
                        >
                            {t('calendar.modalHermanosClear')}
                        </Button>
                        <Button
                            onClick={applyHermanosFilter}
                            className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-purple-500/20 border-b-4 border-purple-800 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {t('calendar.modalHermanosApply')}
                        </Button>
                    </div>
                </div>
            </Modal >
        </div >
    )
}
