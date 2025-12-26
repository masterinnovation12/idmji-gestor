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

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Calendar from '@/components/Calendar'
import { generateCultosForMonth, getCultosForMonth } from './actions'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { RefreshCw, Check, Calendar as CalendarIcon, CheckCircle, Clock, ChevronLeft, Sparkles, LayoutDashboard } from 'lucide-react'
import { getCultoStatus } from '@/lib/utils/culto-helpers'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/I18nProvider'
import Link from 'next/link'
import { Culto } from '@/types/database'

interface CultosPageClientProps {
    initialCultos: Culto[]
}

export default function CultosPageClient({ initialCultos }: CultosPageClientProps) {
    const { t, theme } = useI18n() as any // Cast temporarily to access theme if provider supports it, or use useTheme
    // Using a safer way to get isDark
    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
    const [cultos, setCultos] = useState(initialCultos)
    const [isGenerating, setIsGenerating] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
    const [view, setView] = useState<'month' | 'week' | 'day'>('month')
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [showSuccess, setShowSuccess] = useState(false)
    const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'pending'>('all')

    const handleGenerate = async () => {
        setIsGenerating(true)
        setShowConfirmModal(false)

        const date = new Date(currentYear, currentMonth, 1)
        const result = await generateCultosForMonth(date)

        if (result.success) {
            const { data } = await getCultosForMonth(currentYear, currentMonth)
            setCultos(data || [])

            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 2500)

            toast.success(t('calendar.success'), {
                icon: <CheckCircle className="w-5 h-5 text-green-500" />,
            })
        } else {
            toast.error(t('common.error'), {
                description: result.error,
            })
        }

        setIsGenerating(false)
    }

    const handleMonthChange = async (year: number, month: number) => {
        setCurrentYear(year)
        setCurrentMonth(month)
        setSelectedDate(new Date(year, month, 1))
        const { data } = await getCultosForMonth(year, month)
        setCultos(data || [])
    }

    const totalCultos = cultos.length
    const completeCultos = cultos.filter(c => getCultoStatus(c) === 'complete').length
    const pendingCultos = cultos.filter(c => getCultoStatus(c) === 'pending').length

    const filteredCultos = cultos.filter(c => {
        if (statusFilter === 'all') return true
        const status = getCultoStatus(c)
        return status === statusFilter
    })

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4 md:px-8 relative no-scrollbar">
            {/* Animación de Éxito Premium */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/60 backdrop-blur-2xl pointer-events-none"
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
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-muted/50 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all font-black uppercase tracking-widest group border border-border/50"
                    >
                        <LayoutDashboard className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        {t('nav.dashboard')}
                    </Link>
                </motion.div>

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

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Button
                            onClick={() => setShowConfirmModal(true)}
                            disabled={isGenerating}
                            className={`h-16 px-10 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all group border-b-4 overflow-hidden relative ${
                                isDark 
                                    ? 'bg-primary text-white border-blue-800 shadow-primary/30' 
                                    : 'bg-white text-[#063b7a] border-gray-200 shadow-black/5 hover:bg-gray-50'
                            }`}
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <RefreshCw className={`w-5 h-5 mr-3 transition-transform ${isGenerating ? 'animate-spin' : 'group-hover:rotate-180 duration-500'}`} />
                            {t('calendar.generate')}
                        </Button>
                    </motion.div>
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
                    {/* View & Status Switchers */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
                        <div className="inline-flex bg-muted/50 p-1.5 rounded-2xl border border-border/50 shadow-inner">
                            <button
                                onClick={() => setView('month')}
                                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    view === 'month' 
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                                }`}
                            >
                                Mensual
                            </button>
                            <button
                                onClick={() => setView('week')}
                                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    view === 'week' 
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                                }`}
                            >
                                Semanal
                            </button>
                            <button
                                onClick={() => setView('day')}
                                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    view === 'day' 
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                                }`}
                            >
                                Diario
                            </button>
                        </div>

                        <div className="inline-flex bg-muted/50 p-1.5 rounded-2xl border border-border/50 shadow-inner">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    statusFilter === 'all' 
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : 'text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600'
                                }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setStatusFilter('complete')}
                                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    statusFilter === 'complete' 
                                        ? 'bg-emerald-600 text-white shadow-lg' 
                                        : 'text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600'
                                }`}
                            >
                                Completos
                            </button>
                            <button
                                onClick={() => setStatusFilter('pending')}
                                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    statusFilter === 'pending' 
                                        ? 'bg-amber-600 text-white shadow-lg' 
                                        : 'text-muted-foreground hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600'
                                }`}
                            >
                                Pendientes
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
                </div>
            </motion.div>

            {/* Grid de Estadísticas con Diseño Premium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {[
                    { label: t('calendar.total'), value: totalCultos, icon: CalendarIcon, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
                    { label: t('calendar.complete'), value: completeCultos, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                    { label: t('calendar.pending'), value: pendingCultos, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className={`glass rounded-[2rem] p-8 border ${stat.border} group hover:scale-[1.02] transition-all shadow-xl relative overflow-hidden`}
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
                ))}
            </div>

            {/* Modal de Confirmación Estilizado */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title={t('calendar.modalTitle')}
            >
                <div className="space-y-8 pt-6">
                    <div className="flex items-center gap-4 p-5 bg-primary/5 rounded-[2rem] border border-primary/10">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <CalendarIcon className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                            {t('calendar.modalDesc')}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            onClick={() => setShowConfirmModal(false)}
                            variant="ghost"
                            className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 border-b-4 border-blue-800"
                            isLoading={isGenerating}
                        >
                            {t('calendar.generate')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
