/**
 * FestivosPageClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para la gestión de días festivos.
 * Permite a los administradores registrar días no laborables o festivos laborables
 * que afectan la programación de los cultos.
 * 
 * Características:
 * - Listado anual de festivos
 * - Creación y eliminación de festivos con feedback en tiempo real
 * - Ajuste automático de lógica horaria según el tipo de festivo
 * - Soporte multiidioma (ES/CA)
 * 
 * @author Antigravity AI
 * @date 2024-12-18
 */

'use client'

import { useState } from 'react'
import { Plus, Trash2, Calendar, Info } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { createFestivo, deleteFestivo, seedRandomFestivos } from './actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { toast } from 'sonner'
import { Festivo } from '@/types/database'
import PageHero from '@/components/PageHero'

interface FestivosPageClientProps {
    initialFestivos: Festivo[]
}

export default function FestivosPageClient({ initialFestivos }: FestivosPageClientProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es
    const [festivos, setFestivos] = useState<Festivo[]>(initialFestivos)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    /**
     * Maneja el envio de festivos aleatorios
     */
    const handleRandom = async () => {
        if (!confirm(t('festivos.seedConfirm' as Parameters<typeof t>[0]))) return
        setIsSubmitting(true)
        await seedRandomFestivos(selectedYear)
        toast.success(t('festivos.seedDone' as Parameters<typeof t>[0]))
        setIsSubmitting(false)
        window.location.reload()
    }

    /**
     * Maneja el envío del formulario para crear un nuevo festivo
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)
        const result = await createFestivo(formData)

        if (result.error) {
            toast.error(`${t('common.error')}: ${result.error}`)
        } else {
            toast.success(t('common.success'))
            setIsModalOpen(false)
            // En una app real usaríamos un router.refresh() o actualizaríamos el estado local
            // Para simplicidad en esta demo, recargamos para asegurar que Next.js revalide todo
            window.location.reload()
        }

        setIsSubmitting(false)
    }

    /**
     * Maneja la eliminación de un festivo
     */
    const handleDelete = async (id: number) => {
        if (!confirm(t('festivos.confirmDelete'))) return

        const result = await deleteFestivo(id)
        if (result.error) {
            toast.error(`${t('common.error')}: ${result.error}`)
        } else {
            toast.success(t('common.success'))
            setFestivos(festivos.filter(f => f.id !== id))
        }
    }

    // Colores de identidad por tipo, siempre claros: se pintan dentro de cards liquid
    const tipoColors: Record<string, string> = {
        nacional: 'bg-red-500/10 text-red-600 border-red-200',
        autonomico: 'bg-amber-500/10 text-amber-600 border-amber-200',
        local: 'bg-blue-500/10 text-blue-600 border-blue-200',
        laborable_festivo: 'bg-purple-500/10 text-purple-600 border-purple-200',
    }

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    // Filtrar festivos por año seleccionado
    const filteredFestivos = festivos.filter(f => new Date(f.fecha).getFullYear() === selectedYear)

    // Agrupar festivos por mes (usando los filtrados)
    const festivosPorMes = filteredFestivos.reduce((groups, festivo) => {
        const date = new Date(festivo.fecha)
        const monthKey = format(date, 'yyyy-MM', { locale })
        if (!groups[monthKey]) {
            groups[monthKey] = {
                monthName: format(date, 'MMMM yyyy', { locale }),
                items: []
            }
        }
        groups[monthKey].items.push(festivo)
        return groups
    }, {} as Record<string, { monthName: string, items: Festivo[] }>)

    // Ordenar claves de mes
    const sortedMonthKeys = Object.keys(festivosPorMes).sort()

    // Generar lista de años disponibles (actual, siguiente, y cualquiera que tenga datos)
    const years = Array.from(new Set([
        new Date().getFullYear(),
        new Date().getFullYear() + 1,
        ...festivos.map(f => new Date(f.fecha).getFullYear())
    ])).sort((a, b) => a - b)

    return (
        <div className="ofrenda-liquid-scope max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-8 relative">

            {/* Hero liquid (marino + dorado) con selector de año */}
            <PageHero
                title={t('festivos.title')}
                subtitle={t('festivos.subtitle' as Parameters<typeof t>[0])}
                animate={false}
                actions={
                    <div className="flex bg-white/10 border border-[rgba(227,204,146,0.35)] p-1 rounded-xl">
                        {years.map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${selectedYear === year
                                    ? 'bg-white shadow-sm text-[#1f2e85]'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                }
            />

            {/* Intro Stats Visual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="ofrenda-liquid-card p-6 rounded-3xl flex items-center justify-between group hover:scale-[1.02] transition-transform">
                    <div className="relative z-10">
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1" suppressHydrationWarning>
                            {(t('festivos.totalYear' as Parameters<typeof t>[0]) as string).replace('{year}', String(selectedYear))}
                        </p>
                        <p className="text-4xl font-black text-[#1f2e85]">{filteredFestivos.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#1f2e85]/10 flex items-center justify-center text-[#1f2e85] transition-all group-hover:bg-[#1f2e85] group-hover:text-white shadow-sm group-hover:shadow-lg group-hover:shadow-[#1f2e85]/30">
                        <Calendar className="w-6 h-6" />
                    </div>
                </div>
                <div className="ofrenda-liquid-card p-6 rounded-3xl flex items-center justify-between group hover:scale-[1.02] transition-transform">
                    <div className="relative z-10">
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">{t('festivos.nextHoliday')}</p>
                        <p className="text-xl font-bold truncate max-w-[150px] text-slate-800">
                            {filteredFestivos.length > 0
                                ? format(new Date(filteredFestivos[0].fecha), 'd MMM', { locale })
                                : '-'
                            }
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 transition-all group-hover:bg-amber-500 group-hover:text-white shadow-sm group-hover:shadow-lg group-hover:shadow-amber-500/30">
                        <Info className="w-6 h-6" />
                    </div>
                </div>
                <div className="ofrenda-liquid-card p-6 rounded-3xl flex items-center justify-between group hover:scale-[1.02] transition-transform relative overflow-hidden">
                    <div className="flex flex-col gap-2 w-full h-full justify-center">
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white rounded-2xl font-black uppercase tracking-widest shadow-[0_4px_16px_rgba(31,46,133,0.32)] hover:shadow-[0_6px_22px_rgba(31,46,133,0.42)] flex items-center justify-center gap-2 transition-all active:scale-95 relative z-10 py-6"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-xs">{t('festivos.add')}</span>
                        </Button>
                        <button
                            onClick={handleRandom}
                            className="text-[10px] text-slate-500 hover:text-[#1f2e85] uppercase font-bold tracking-widest hover:underline"
                            suppressHydrationWarning
                        >
                            + {t('festivos.seedBtn' as Parameters<typeof t>[0])}
                        </button>
                    </div>
                </div>
            </div>

            {/* Aviso de Lógica de Horario */}
            <div className="glass border-l-4 border-amber-500 rounded-3xl p-6 shadow-lg bg-amber-500/[0.02] flex gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="p-3 bg-amber-500/10 rounded-2xl h-fit shrink-0 relative z-10">
                    <Info className="w-6 h-6 text-amber-600" />
                </div>
                <div className="relative z-10">
                    <h3 className="font-black text-lg mb-1 tracking-tight text-amber-700 dark:text-amber-400">{t('festivos.autoScheduleRule')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                        {t('festivos.note')}
                    </p>
                </div>
            </div>

            {/* Listado de Festivos Agrupado por Mes */}
            <div className="space-y-10">
                {festivos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-white/60 rounded-[3rem] border-dashed border-2 border-[rgba(184,150,74,0.3)]">
                        <div className="w-24 h-24 bg-[#f8f3e8] rounded-full flex items-center justify-center">
                            <Calendar className="w-10 h-10 text-[#b8964a]/60" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-500">{t('festivos.emptyTitle')}</h3>
                            <p className="text-sm text-slate-400 max-w-xs mx-auto">
                                {t('festivos.noEvents')}
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            variant="outline"
                            className="rounded-xl mt-4 border-[rgba(184,150,74,0.32)] bg-white text-[#1f2e85] hover:bg-[#f8f3e8] hover:border-[#b8964a] font-bold"
                        >
                            <span suppressHydrationWarning>{t('festivos.createFirst' as Parameters<typeof t>[0])}</span>
                        </Button>
                    </div>
                ) : (
                    sortedMonthKeys.map(monthKey => (
                        <div key={monthKey} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-[#b68f2f]">
                                    {festivosPorMes[monthKey].monthName}
                                </h2>
                                <div className="h-px flex-1 bg-[rgba(184,150,74,0.3)]" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {festivosPorMes[monthKey].items.map((festivo) => (
                                    <div
                                        key={festivo.id}
                                        className="group relative flex flex-col justify-between p-6 ofrenda-liquid-card rounded-[2rem] transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
                                    >
                                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[3rem] opacity-20 transition-transform group-hover:scale-110 ${festivo.tipo === 'nacional' ? 'bg-red-500' :
                                            festivo.tipo === 'autonomico' ? 'bg-amber-500' :
                                                festivo.tipo === 'local' ? 'bg-blue-500' : 'bg-purple-500'
                                            }`} />

                                        <div className="space-y-4 relative z-10 w-full">
                                            <div className="flex items-start justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b68f2f] mb-1">
                                                        {format(new Date(festivo.fecha), 'EEEE', { locale })}
                                                    </span>
                                                    <p className="font-black text-4xl tracking-tighter leading-none text-[#1f2e85]">
                                                        {format(new Date(festivo.fecha), 'dd', { locale })}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(festivo.id)}
                                                    className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl transition-all hover:bg-red-500 hover:text-white active:scale-90"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex flex-wrap gap-2">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${tipoColors[festivo.tipo]}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${festivo.tipo === 'nacional' ? 'bg-red-500' :
                                                            festivo.tipo === 'autonomico' ? 'bg-amber-500' :
                                                                festivo.tipo === 'local' ? 'bg-blue-500' : 'bg-purple-500'
                                                            }`} />
                                                        {festivo.tipo === 'nacional' ? t('festivos.type.nacional') :
                                                            festivo.tipo === 'autonomico' ? t('festivos.type.autonomico') :
                                                                festivo.tipo === 'local' ? t('festivos.type.local') :
                                                                    festivo.tipo === 'laborable_festivo' ? t('festivos.type.laborable') :
                                                                        festivo.tipo}
                                                    </div>

                                                    {/* Mostrar Culto Asociado si existe */}
                                                    {(festivo as Festivo & { culto?: { id: number; hora: string; tipo: string } }).culto && (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-[#f8f3e8] text-[#1f2e85] border-[rgba(184,150,74,0.35)]">
                                                            <Calendar className="w-3 h-3" />
                                                            {(festivo as Festivo & { culto?: { id: number; hora: string; tipo: string } }).culto?.tipo}
                                                        </div>
                                                    )}
                                                </div>

                                                {festivo.descripcion && (
                                                    <p className="text-sm text-slate-500 font-medium line-clamp-2">
                                                        {festivo.descripcion}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal para Nuevo Festivo - Premium Style */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={t('festivos.modal.title')}
            >
                <form onSubmit={handleSubmit} className="space-y-8 pt-6">
                    <div className="grid grid-cols-1 gap-6">
                        <Input
                            type="date"
                            name="fecha"
                            label={t('festivos.modal.fecha')}
                            required
                            className="h-16 rounded-2xl font-bold text-lg bg-white/70 text-slate-800 border-[rgba(184,150,74,0.32)] focus:border-[#b8964a] transition-colors"
                        />

                        <Select
                            name="tipo"
                            label={t('festivos.modal.tipo')}
                            required
                            className="h-16 rounded-2xl font-bold text-lg bg-white/70 text-slate-800 border-[rgba(184,150,74,0.32)] focus:border-[#b8964a] transition-colors"
                            options={[
                                { value: '', label: t('festivos.selectType' as Parameters<typeof t>[0]) },
                                { value: 'nacional', label: `🔴 ${t('festivos.type.nacional')}` },
                                { value: 'autonomico', label: `🟠 ${t('festivos.type.autonomico')}` },
                                { value: 'local', label: `🔵 ${t('festivos.type.local')}` },
                                { value: 'laborable_festivo', label: `🟣 ${t('festivos.type.laborable')}` },
                            ]}
                        />

                        <Input
                            type="text"
                            name="descripcion"
                            label={t('festivos.modal.desc')}
                            placeholder={t('festivos.namePlaceholder')}
                            className="h-16 rounded-2xl font-bold text-lg bg-white/70 text-slate-800 border-[rgba(184,150,74,0.32)] focus:border-[#b8964a] transition-colors"
                        />
                    </div>

                    <div className="flex gap-4 pt-6 border-t border-[rgba(184,150,74,0.25)]">
                        <Button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            variant="ghost"
                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs text-[#1f2e85] border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white hover:bg-[#f8f3e8] hover:border-[#b8964a]"
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            isLoading={isSubmitting}
                            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white shadow-[0_4px_16px_rgba(31,46,133,0.32)] hover:shadow-[0_6px_22px_rgba(31,46,133,0.42)] transition-all"
                        >
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
