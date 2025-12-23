/**
 * CultoDetailClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para ver y gestionar los detalles de un culto específico.
 * Permite asignar hermanos a diferentes labores y gestionar lecturas/música.
 * 
 * Características:
 * - Asignación de responsables con búsqueda en tiempo real
 * - Gestión de lecturas bíblicas con detección de repeticiones
 * - Planificación de himnos y coros
 * - Diseño glassmorphism responsivo
 * - Multiidioma (ES/CA)
 * 
 * @author Antigravity AI
 * @date 2024-12-18
 */

'use client'

import { useState } from 'react'
import { Calendar, Clock, User, BookOpen, Music, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import UserSelector from '@/components/UserSelector'
import HimnoCoroSelector from '@/components/HimnoCoroSelector'
import BibleReadingManager from '@/components/BibleReadingManager'
import { updateAssignment } from './actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import Link from 'next/link'
import { toast } from 'sonner'
import { Culto } from '@/types/database'

interface CultoDetailClientProps {
    culto: Culto
    userId: string
}

/**
 * Componente interno para tarjetas de asignación reutilizables
 */
function AssignmentSection({
    label,
    icon,
    selectedUserId,
    usuarioActual,
    onSelect,
    disabled,
    t
}: {
    label: string,
    icon: any,
    selectedUserId: string | null,
    usuarioActual: any,
    onSelect: (id: string | null) => void,
    disabled: boolean,
    t: any
}) {
    return (
        <Card className="border-t-2 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle icon={icon} className="text-primary">
                    {label}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <UserSelector
                        selectedUserId={selectedUserId}
                        onSelect={onSelect}
                        disabled={disabled}
                    />
                    {usuarioActual && (
                        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl animate-in fade-in slide-in-from-left-2">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {usuarioActual.nombre?.[0]}
                            </div>
                            <div>
                                <p className="text-sm font-bold">
                                    {usuarioActual.nombre} {usuarioActual.apellidos}
                                </p>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Asignado</p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function CultoDetailClient({ culto, userId }: CultoDetailClientProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es
    const [isUpdating, setIsUpdating] = useState(false)

    const handleAssignment = async (
        tipo: 'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios',
        selectedUserId: string | null
    ) => {
        setIsUpdating(true)
        try {
            const result = await updateAssignment(culto.id, tipo, selectedUserId)
            if (result.success) {
                toast.success(t('common.success'))
            } else {
                toast.error(result.error || t('common.error'))
            }
        } catch (error) {
            toast.error('Error de red')
        } finally {
            setIsUpdating(false)
        }
    }

    const tipoCulto = culto.tipo_culto?.nombre || 'Culto'
    const config = culto.tipo_culto || {}

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header / Breadcrumb */}
            <div className="px-2">
                <Link
                    href="/dashboard/cultos"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {t('dashboard.calendar')}
                </Link>

                <div className="glass rounded-3xl p-8 shadow-sm relative overflow-hidden">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div
                                className="w-5 h-5 rounded-full shadow-lg"
                                style={{ backgroundColor: config.color || '#4A90E2' }}
                            />
                            <h1 className="text-4xl font-extrabold tracking-tight">{tipoCulto}</h1>
                        </div>

                        <div className="flex flex-wrap gap-6 text-base text-muted-foreground font-medium">
                            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                                <Calendar className="w-5 h-5 text-primary" />
                                {format(new Date(culto.fecha), 'PPPP', { locale })}
                            </div>
                            <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                                <Clock className="w-5 h-5 text-primary" />
                                {culto.hora_inicio} - {culto.hora_fin}
                            </div>
                            {culto.es_laborable_festivo && (
                                <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-600 px-4 py-2 rounded-full font-bold">
                                    <AlertCircleIcon className="w-5 h-5" />
                                    Festivo
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cuadrícula de Contenido */}
            <div className="grid gap-6 lg:grid-cols-12 px-2">
                {/* Columna Izquierda: Asignaciones y Biblia */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Responsables */}
                    <div className="grid gap-6 sm:grid-cols-2">
                        {config.tiene_lectura_introduccion && (
                            <AssignmentSection
                                label={t('culto.introduccion')}
                                icon={<User className="w-5 h-5" />}
                                selectedUserId={culto.id_usuario_intro}
                                usuarioActual={culto.usuario_intro}
                                onSelect={(id) => handleAssignment('introduccion', id)}
                                disabled={isUpdating}
                                t={t}
                            />
                        )}

                        {config.tiene_lectura_finalizacion && (
                            <AssignmentSection
                                label={t('culto.finalizacion')}
                                icon={<User className="w-5 h-5" />}
                                selectedUserId={culto.id_usuario_finalizacion}
                                usuarioActual={culto.usuario_finalizacion}
                                onSelect={(id) => handleAssignment('finalizacion', id)}
                                disabled={isUpdating}
                                t={t}
                            />
                        )}

                        {config.tiene_ensenanza && (
                            <AssignmentSection
                                label={t('culto.ensenanza')}
                                icon={<BookOpen className="w-5 h-5" />}
                                selectedUserId={culto.id_usuario_ensenanza}
                                usuarioActual={culto.usuario_ensenanza}
                                onSelect={(id) => handleAssignment('ensenanza', id)}
                                disabled={isUpdating}
                                t={t}
                            />
                        )}

                        {config.tiene_testimonios && (
                            <AssignmentSection
                                label={t('culto.testimonios')}
                                icon={<User className="w-5 h-5" />}
                                selectedUserId={culto.id_usuario_testimonios}
                                usuarioActual={culto.usuario_testimonios}
                                onSelect={(id) => handleAssignment('testimonios', id)}
                                disabled={isUpdating}
                                t={t}
                            />
                        )}
                    </div>

                    {/* Lecturas Bíblicas */}
                    {(config.tiene_lectura_introduccion || config.tiene_lectura_finalizacion) && (
                        <Card>
                            <CardHeader>
                                <CardTitle icon={<BookOpen className="w-5 h-5 text-primary" />}>
                                    {t('dashboard.lecturas')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BibleReadingManager
                                    cultoId={culto.id}
                                    userId={userId}
                                    config={{
                                        tiene_lectura_introduccion: !!config.tiene_lectura_introduccion,
                                        tiene_lectura_finalizacion: !!config.tiene_lectura_finalizacion
                                    }}
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Columna Derecha: Música */}
                <div className="lg:col-span-4">
                    {config.tiene_himnos_y_coros && (
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle icon={<Music className="w-5 h-5 text-primary" />}>
                                    {t('dashboard.hymns')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4 font-medium italic">
                                    * Máximo 3 himnos y 3 coros.
                                </p>
                                <HimnoCoroSelector cultoId={culto.id} />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}

function AlertCircleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
    )
}
