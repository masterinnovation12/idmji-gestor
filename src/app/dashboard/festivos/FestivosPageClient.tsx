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
import { Plus, Trash2, Calendar, ChevronLeft, Info } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { createFestivo, deleteFestivo } from './actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import Link from 'next/link'
import { toast } from 'sonner'
import { Festivo } from '@/types/database'

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

    const tipoColors: Record<string, string> = {
        nacional: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/30',
        autonomico: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-900/30',
        local: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/30',
        laborable_festivo: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900/30',
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 px-4">
            {/* Header con Breadcrumb */}
            <div className="space-y-4">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {t('dashboard.title')}
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent">
                            {t('festivos.title')}
                        </h1>
                        <div className="flex items-center gap-2 text-muted-foreground mt-2">
                            <Calendar className="w-4 h-4" />
                            <span className="font-bold text-sm uppercase tracking-widest">{new Date().getFullYear()}</span>
                        </div>
                    </div>

                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-2xl h-14 px-8 font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        {t('festivos.add')}
                    </Button>
                </div>
            </div>

            {/* Aviso de Lógica de Horario */}
            <div className="glass border-l-4 border-primary rounded-3xl p-6 shadow-lg bg-primary/[0.02] flex gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl h-fit">
                    <Info className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-bold text-lg mb-1 tracking-tight">Regla de Horario</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {t('festivos.note')}
                    </p>
                </div>
            </div>

            {/* Listado de Festivos */}
            <Card className="overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
                <CardHeader className="bg-muted/30 border-b border-border/50 pb-6 px-8 pt-8 text-center sm:text-left">
                    <CardTitle className="text-2xl font-black flex items-center justify-center sm:justify-start gap-3">
                        <Calendar className="w-8 h-8 text-primary" />
                        {t('festivos.listTitle')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-8">
                    {festivos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <Calendar className="w-16 h-16 text-muted-foreground/20" />
                            <p className="text-muted-foreground font-bold tracking-tight">
                                {t('festivos.noEvents')}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {festivos.map((festivo) => (
                                <div
                                    key={festivo.id}
                                    className="group relative flex items-center justify-between p-6 bg-muted/20 border border-border/50 rounded-[2rem] hover:bg-white dark:hover:bg-muted/40 transition-all hover:shadow-xl hover:-translate-y-1"
                                >
                                    <div className="space-y-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1">
                                                {format(new Date(festivo.fecha), 'MMMM', { locale })}
                                            </span>
                                            <p className="font-black text-xl tracking-tight leading-none uppercase">
                                                {format(new Date(festivo.fecha), 'd EEEE', { locale })}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${tipoColors[festivo.tipo]}`}>
                                                {festivo.tipo === 'nacional' ? t('festivos.type.nacional') :
                                                    festivo.tipo === 'autonomico' ? t('festivos.type.autonomico') :
                                                        festivo.tipo === 'local' ? t('festivos.type.local') :
                                                            festivo.tipo === 'laborable_festivo' ? t('festivos.type.laborable') :
                                                                festivo.tipo}
                                            </span>
                                            {festivo.descripcion && (
                                                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                                    <Info className="w-3 h-3" />
                                                    {festivo.descripcion}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(festivo.id)}
                                        className="p-4 bg-red-500/5 text-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-lg active:scale-90"
                                        title={t('common.delete')}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal para Nuevo Festivo */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={t('festivos.modal.title')}
            >
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 gap-6">
                        <Input
                            type="date"
                            name="fecha"
                            label={t('festivos.modal.fecha')}
                            required
                            className="h-14 rounded-2xl font-bold"
                        />

                        <Select
                            name="tipo"
                            label={t('festivos.modal.tipo')}
                            required
                            className="h-14 rounded-2xl font-bold"
                            options={[
                                { value: '', label: '...' },
                                { value: 'nacional', label: t('festivos.type.nacional') },
                                { value: 'autonomico', label: t('festivos.type.autonomico') },
                                { value: 'local', label: t('festivos.type.local') },
                                { value: 'laborable_festivo', label: t('festivos.type.laborable') },
                            ]}
                        />

                        <Input
                            type="text"
                            name="descripcion"
                            label={t('festivos.modal.desc')}
                            placeholder="Ej: Día de Navidad"
                            className="h-14 rounded-2xl font-bold"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            variant="ghost"
                            className="flex-1 h-14 rounded-2xl font-bold"
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isSubmitting}
                            className="flex-1 h-14 rounded-2xl font-black shadow-lg shadow-primary/20"
                        >
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
