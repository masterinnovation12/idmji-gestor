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
 * 
 * @author Antigravity AI
 * @date 2024-12-18
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Calendar from '@/components/Calendar'
import { generateCultosForMonth, getCultosForMonth } from './actions'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { RefreshCw, Check, Calendar as CalendarIcon, CheckCircle, Clock, ChevronLeft, Sparkles } from 'lucide-react'
import { getCultoStatus } from '@/lib/utils/culto-helpers'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/I18nProvider'
import Link from 'next/link'
import { Culto } from '@/types/database'

interface CultosPageClientProps {
    initialCultos: Culto[]
}

export default function CultosPageClient({ initialCultos }: CultosPageClientProps) {
    const { t } = useI18n()
    const [cultos, setCultos] = useState(initialCultos)
    const [isGenerating, setIsGenerating] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
    const [showSuccess, setShowSuccess] = useState(false)

    /**
     * Lanza el proceso de generación de cultos para el mes actual en vista
     */
    const handleGenerate = async () => {
        setIsGenerating(true)
        setShowConfirmModal(false)

        const date = new Date(currentYear, currentMonth, 1)
        const result = await generateCultosForMonth(date)

        if (result.success) {
            const { data } = await getCultosForMonth(currentYear, currentMonth)
            setCultos(data || [])

            // Overlay de éxito animado
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 2000)

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

    /**
     * Actualiza los datos cuando el usuario cambia de mes en el calendario
     */
    const handleMonthChange = async (year: number, month: number) => {
        setCurrentYear(year)
        setCurrentMonth(month)

        const { data } = await getCultosForMonth(year, month)
        setCultos(data || [])
    }

    const totalCultos = cultos.length
    const completeCultos = cultos.filter(c => getCultoStatus(c) === 'complete').length
    const pendingCultos = cultos.filter(c => getCultoStatus(c) === 'incomplete').length

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 px-4 relative">
            {/* Animación de Éxito Premium */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-100 flex items-center justify-center bg-background/40 backdrop-blur-xl pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.5, rotate: -15, y: 50 }}
                            animate={{ scale: 1, rotate: 0, y: 0 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="glass rounded-[3rem] p-12 shadow-2xl flex flex-col items-center gap-6 border-2 border-primary/20 bg-white dark:bg-black/50"
                        >
                            <div className="relative">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-24 h-24 rounded-3xl bg-linear-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/20"
                                >
                                    <Check className="w-12 h-12 text-white" strokeWidth={4} />
                                </motion.div>
                                <Sparkles className="absolute -top-4 -right-4 w-10 h-10 text-yellow-400 animate-pulse" />
                            </div>
                            <p className="text-3xl font-black uppercase tracking-tight">
                                {t('calendar.success')}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Breadcrumb y Header */}
            <div className="space-y-4">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-bold group"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {t('dashboard.title')}
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl lg:text-5xl font-black bg-linear-to-br from-primary via-accent to-primary bg-clip-text text-transparent tracking-tight">
                            {t('calendar.title')}
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Gestión de eventos y programación
                        </p>
                    </div>

                    <Button
                        onClick={() => setShowConfirmModal(true)}
                        disabled={isGenerating}
                        className="h-14 px-8 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all group overflow-hidden"
                    >
                        <RefreshCw className={`w-5 h-5 mr-3 transition-transform ${isGenerating ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                        {t('calendar.generate')}
                    </Button>
                </div>
            </div>

            {/* Contenedor Principal: Calendario */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-primary/5 to-accent/5 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
                <div className="relative glass rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                    <Calendar
                        events={cultos}
                        onMonthChange={handleMonthChange}
                    />
                </div>
            </div>

            {/* Grid de Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: t('calendar.total'), value: totalCultos, icon: CalendarIcon, color: 'text-primary', bg: 'bg-primary/10' },
                    { label: t('calendar.complete'), value: completeCultos, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: t('calendar.pending'), value: pendingCultos, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' }
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + idx * 0.1 }}
                        className="glass rounded-3xl p-6 border border-white/20 dark:border-white/5 group hover:border-primary/20 transition-all shadow-xl"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-4 ${stat.bg} rounded-2xl group-hover:scale-110 transition-transform shadow-inner`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                                    {stat.label}
                                </p>
                                <p className={`text-4xl font-black tracking-tighter ${stat.color} leading-none`}>
                                    {stat.value}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal de Confirmación */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title={t('calendar.modalTitle')}
            >
                <div className="space-y-6 pt-4 text-center sm:text-left">
                    <p className="text-muted-foreground font-medium leading-relaxed">
                        {t('calendar.modalDesc')}
                    </p>
                    <div className="flex gap-4 pt-4">
                        <Button
                            onClick={() => setShowConfirmModal(false)}
                            variant="ghost"
                            className="flex-1 h-14 rounded-2xl font-bold"
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            className="flex-1 h-14 rounded-2xl font-black shadow-lg shadow-primary/20"
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

