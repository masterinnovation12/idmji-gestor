/**
 * CultoDetailClient - IDMJI Gestor de Púlpito
 * 
 * Componente cliente para ver y gestionar los detalles de un culto específico.
 * Permite asignar hermanos a diferentes labores y gestionar lecturas/música.
 * 
 * Características:
 * - Asignación de responsables con búsqueda en tiempo real (Filtro Púlpito)
 * - Gestión de lecturas bíblicas con detección de repeticiones
 * - Planificación de himnos y coros
 * - Diseño Glassmorphism premium responsivo
 * - Multiidioma (ES/CA)
 * 
 * @author Antigravity AI
 * @date 2024-12-25
 */

'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, Clock, User, BookOpen, Music, AlertCircle, CheckCircle, Sparkles, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import UserSelector from '@/components/UserSelector'
import HimnoCoroSelector from '@/components/HimnoCoroSelector'
import BibleReadingManager from '@/components/BibleReadingManager'
import { updateAssignment, toggleFestivo, updateCultoProtocol } from './actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import BackButton from '@/components/BackButton'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Culto, Profile } from '@/types/database'
import NextImage from 'next/image'

interface CultoDetailClientProps {
    culto: Culto
    userId: string
}

/**
 * Componente interno para tarjetas de asignación reutilizables con diseño premium
 */
interface AssignmentSectionProps {
    label: string,
    icon: React.ReactNode,
    selectedUserId: string | null,
    usuarioActual: Partial<Profile> | null | undefined,
    onSelect: (id: string | null, confirmed?: boolean) => void,
    disabled: boolean,
    t: (key: string) => string,
    cultoId: string,
    cultoDate?: string,
    assignmentType?: string,
    isFestivo?: boolean
}

function AssignmentSection({
    label,
    icon,
    selectedUserId,
    usuarioActual,
    onSelect,
    disabled,
    t,
    cultoId,
    cultoDate,
    assignmentType,
    isFestivo
}: AssignmentSectionProps) {
    const [isEditing, setIsEditing] = useState(!selectedUserId)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`h-full w-full min-w-0 ${isEditing ? 'relative z-[100]' : 'relative z-10'}`}
        >
            <Card className={`h-full w-full min-w-0 border-t-4 border-primary/40 glass group hover:border-primary transition-all duration-500 shadow-xl relative overflow-visible ${isEditing ? 'ring-4 ring-primary/30' : ''}`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />

                <CardHeader className="flex flex-row items-start justify-between pb-2 md:pb-3 shrink-0 gap-2">
                    <CardTitle icon={icon} className="text-primary font-black uppercase tracking-widest text-[10px] md:text-[11px] leading-tight">
                        {label}
                    </CardTitle>
                    {selectedUserId && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-2 py-1 md:px-3 md:py-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm shrink-0 mt-0.5"
                        >
                            Modificar
                        </button>
                    )}
                </CardHeader>
                <CardContent className="p-2.5 md:p-3.5 flex-1 flex flex-col overflow-visible">
                    <div className="space-y-2.5 md:space-y-3.5 flex-1 flex flex-col overflow-visible">
                        <div className="shrink-0 relative z-[110]">
                            <UserSelector
                                selectedUserId={selectedUserId}
                                onSelect={(id, confirmed) => {
                                    if (id && confirmed === false) {
                                        onSelect(id, false)
                                    } else {
                                        onSelect(id, true)
                                        if (id) setIsEditing(false)
                                    }
                                }}
                                disabled={disabled}
                                isEditing={isEditing}
                                onEditChange={setIsEditing}
                                cultoDate={cultoDate}
                                assignmentType={assignmentType}
                                isFestivo={isFestivo}
                            />
                        </div>

                        <AnimatePresence mode="wait">
                            {usuarioActual ? (
                                <motion.div
                                    key={usuarioActual.id || `assigned-${label}`}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`flex flex-col gap-3 p-3.5 md:p-4.5 rounded-[1.75rem] border shadow-inner relative overflow-hidden group/assigned transition-all flex-1 min-h-0 ${isEditing
                                        ? 'bg-muted/50 border-border opacity-60'
                                        : 'bg-primary/5 border-primary/10'
                                        }`}
                                >
                                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover/assigned:opacity-100 transition-opacity" />

                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-xs md:text-sm lg:text-base border-2 shadow-lg shrink-0 ${isEditing ? 'bg-muted border-border text-muted-foreground' : 'bg-primary/20 border-white/20 text-primary'
                                            }`}>
                                            {usuarioActual.avatar_url ? (
                                                <NextImage
                                                    src={usuarioActual.avatar_url}
                                                    alt=""
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <span className="uppercase tracking-tighter">{usuarioActual.nombre?.[0]}{usuarioActual.apellidos?.[0]}</span>
                                            )}
                                        </div>
                                        <div className="relative z-10 min-w-0 flex-1">
                                            <p className={`text-[11px] md:text-sm lg:text-base xl:text-lg font-black uppercase tracking-tight leading-none whitespace-nowrap ${isEditing ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                {usuarioActual.nombre} {usuarioActual.apellidos}
                                            </p>
                                            <div className="flex items-center gap-2.5 mt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${isEditing ? 'bg-muted-foreground' : 'bg-emerald-500'}`} />
                                                    <p className="text-[8px] md:text-[10px] lg:text-[11px] text-muted-foreground font-black uppercase tracking-widest leading-none">
                                                        {isEditing ? 'Modificando...' : 'Asignado'}
                                                    </p>
                                                </div>
                                                {!isEditing && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="bg-emerald-500/20 p-0.5 rounded-full shadow-sm shadow-emerald-500/20"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bloque de Lectura Bíblica Integrado (Solo para Introducción) */}
                                    {label === t('culto.introduccion') && !isEditing && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="relative z-10 mt-1 pt-3 border-t border-primary/10"
                                        >
                                            <BibleReadingManager
                                                cultoId={cultoId}
                                                userId={usuarioActual?.id || ''}
                                                config={{
                                                    tiene_lectura_introduccion: true,
                                                    tiene_lectura_finalizacion: false
                                                }}
                                            />
                                        </motion.div>
                                    )}
                                </motion.div>
                            ) : !isEditing ? (
                                <motion.div
                                    key="unassigned"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-4 border-2 border-dashed border-muted-foreground/10 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 opacity-50"
                                >
                                    <User className="w-6 h-6 text-muted-foreground/30" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 text-center">Pendiente de asignar</p>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

export default function CultoDetailClient({ culto }: CultoDetailClientProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es
    const [isUpdating, setIsUpdating] = useState(false)
    const [pendingAssignment, setPendingAssignment] = useState<{ type: 'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios', userId: string } | null>(null)
    const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false)

    const handleToggleFestivo = async () => {
        setIsUpdating(true)
        try {
            const result = await toggleFestivo(culto.id, !!culto.es_laborable_festivo, culto.hora_inicio)
            if (result.success) {
                toast.success(culto.es_laborable_festivo ? 'Horario normal restaurado' : 'Horario festivo aplicado (-1h)', {
                    icon: <Sparkles className="w-5 h-5 text-primary" />
                })
            } else {
                toast.error(result.error || 'Error al cambiar estado festivo')
            }
        } catch {
            toast.error('Error de conexión')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleConfirmAssignment = async () => {
        if (!pendingAssignment) return
        setIsConflictDialogOpen(false)
        await handleAssignment(pendingAssignment.type, pendingAssignment.userId, true)
        setPendingAssignment(null)
    }

    const handleAssignment = async (
        tipo: 'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios',
        selectedUserId: string | null,
        confirmed: boolean = true
    ) => {
        if (selectedUserId && !confirmed) {
            setPendingAssignment({ type: tipo, userId: selectedUserId })
            setIsConflictDialogOpen(true)
            return
        }

        setIsUpdating(true)
        try {
            const result = await updateAssignment(culto.id, tipo, selectedUserId)
            if (result.success) {
                toast.success(t('common.success'), {
                    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />
                })
            } else {
                toast.error(result.error || t('common.error'))
            }
        } catch {
            toast.error('Error de conexión')
        } finally {
            setIsUpdating(false)
        }
    }

    const tipoCulto = culto.tipo_culto?.nombre || 'Culto'
    const config = culto.tipo_culto || {}

    return (
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto space-y-4 md:space-y-6 lg:space-y-8 pb-20 px-4 md:px-8 no-scrollbar w-full">
            {/* Header / Breadcrumb */}
            <div className="space-y-4 md:space-y-6 w-full">
                <BackButton fallbackUrl="/dashboard/cultos" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-[2.5rem] md:rounded-[3rem] p-3 md:p-4 lg:p-6 xl:p-8 shadow-2xl relative overflow-hidden border border-white/20 dark:border-white/5 w-full"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />

                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-6 h-6 md:w-8 md:h-8 rounded-xl md:rounded-2xl shadow-2xl animate-bounce shrink-0"
                                        style={{ backgroundColor: config.color || '#4A90E2', boxShadow: `0 10px 25px -5px ${config.color || '#4A90E2'}40` }}
                                    />
                                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase italic leading-none truncate py-1">
                                        {tipoCulto}
                                    </h1>
                                </div>

                                <div className="flex flex-wrap items-center gap-6 md:gap-10">
                                    <div className="flex items-center gap-4 bg-white/40 dark:bg-black/20 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/20 shadow-sm transition-all hover:bg-white/60 dark:hover:bg-black/30">
                                        <Calendar className="w-6 h-6 text-primary" />
                                        <div className="flex flex-col">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none mb-1">Fecha del Culto</p>
                                            <span className="text-base md:text-xl font-black uppercase tracking-tight">
                                                {format(new Date(culto.fecha), 'PPPP', { locale })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 bg-white/40 dark:bg-black/20 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/20 shadow-sm transition-all hover:bg-white/60 dark:hover:bg-black/30 font-black">
                                        <Clock className="w-6 h-6 text-primary" />
                                        <div className="flex flex-col">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 leading-none mb-1">Hora Inicio</p>
                                            <span className="text-base md:text-xl uppercase tracking-widest">
                                                {culto.hora_inicio.slice(0, 5)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Toggle Festivo Premium */}
                                    <div className="flex flex-col gap-2">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-4 leading-none">Estado de Jornada</p>
                                        <button
                                            onClick={handleToggleFestivo}
                                            disabled={isUpdating}
                                            className={`flex items-center gap-4 px-8 py-4 rounded-3xl border transition-all font-black group relative overflow-hidden h-full ${culto.es_laborable_festivo
                                                ? 'bg-amber-500 text-white border-amber-600 shadow-xl shadow-amber-500/30 scale-105'
                                                : 'bg-white/40 dark:bg-black/20 backdrop-blur-md text-muted-foreground border-white/20 hover:border-amber-500/50 hover:bg-amber-50/10'
                                                }`}
                                        >
                                            <div className={`absolute inset-0 bg-linear-to-r from-white/20 to-transparent -translate-x-full transition-transform duration-1000 ${culto.es_laborable_festivo ? 'group-hover:translate-x-full' : ''}`} />
                                            <div className={`p-2 rounded-xl transition-colors ${culto.es_laborable_festivo ? 'bg-white/20' : 'bg-amber-500/10'}`}>
                                                <AlertCircle className={`w-6 h-6 ${culto.es_laborable_festivo ? 'text-white' : 'text-amber-500'}`} />
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <span className={`text-[10px] uppercase tracking-widest leading-none mb-1 ${culto.es_laborable_festivo ? 'text-white/80' : 'text-muted-foreground'}`}>
                                                    {culto.es_laborable_festivo ? 'Día Especial' : 'Día Laborable'}
                                                </span>
                                                <span className="text-sm uppercase tracking-tight relative z-10 whitespace-nowrap">
                                                    {culto.es_laborable_festivo ? 'Festivo Aplicado' : 'Marcar como Festivo'}
                                                </span>
                                            </div>
                                            {culto.es_laborable_festivo && (
                                                <motion.div
                                                    layoutId="festivo-sparkle"
                                                    className="ml-2"
                                                >
                                                    <Sparkles className="w-5 h-5 text-white/70 animate-pulse" />
                                                </motion.div>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 shadow-inner">
                                <Sparkles className="w-12 h-12 text-primary opacity-20" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Protocol Configuration (Solo Estudio Bíblico) */}
            {(tipoCulto.toLowerCase().includes('estudio') || tipoCulto.toLowerCase().includes('biblico')) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full"
                >
                    <div className="glass rounded-[2rem] p-4 md:p-6 border border-white/20 shadow-xl relative overflow-hidden">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                    <Sparkles className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight leading-none mb-1 text-foreground/90">
                                        {t('culto.protocol.title')}
                                    </h3>
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                                        {t('culto.protocol.desc')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 w-full md:w-auto">
                                {/* Switch Oración */}
                                <button
                                    onClick={async () => {
                                        const current = culto.meta_data?.protocolo?.oracion_inicio ?? true
                                        await updateCultoProtocol(culto.id, {
                                            oracion_inicio: !current,
                                            congregacion_pie: culto.meta_data?.protocolo?.congregacion_pie ?? false
                                        })
                                        toast.success(!current ? 'Oración activada' : 'Oración desactivada')
                                    }}
                                    className={`flex items-center justify-between gap-4 px-5 py-3 rounded-2xl border-2 transition-all flex-1 md:flex-none cursor-pointer ${(culto.meta_data?.protocolo?.oracion_inicio ?? true)
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex flex-col items-start min-w-[100px]">
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-70 leading-none mb-1">{t('culto.protocol.prayer')}</span>
                                        <span className={`text-xs font-black uppercase tracking-tight ${(culto.meta_data?.protocolo?.oracion_inicio ?? true) ? '' : 'text-slate-400 dark:text-slate-500'
                                            }`}>
                                            {(culto.meta_data?.protocolo?.oracion_inicio ?? true) ? t('culto.protocol.yesPray') : t('culto.protocol.noPray')}
                                        </span>
                                    </div>
                                    <div className={`w-12 h-7 rounded-full p-1 transition-colors border ${(culto.meta_data?.protocolo?.oracion_inicio ?? true)
                                        ? 'bg-emerald-500 border-emerald-600'
                                        : 'bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600'
                                        }`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${(culto.meta_data?.protocolo?.oracion_inicio ?? true) ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                    </div>
                                </button>

                                {/* Switch Congregación */}
                                <button
                                    onClick={async () => {
                                        const current = culto.meta_data?.protocolo?.congregacion_pie ?? false
                                        await updateCultoProtocol(culto.id, {
                                            oracion_inicio: culto.meta_data?.protocolo?.oracion_inicio ?? true,
                                            congregacion_pie: !current
                                        })
                                        toast.success(!current ? 'Congregación de pie' : 'Congregación sentada')
                                    }}
                                    className={`flex items-center justify-between gap-4 px-5 py-3 rounded-2xl border-2 transition-all flex-1 md:flex-none cursor-pointer ${(culto.meta_data?.protocolo?.congregacion_pie ?? false)
                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300'
                                        : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex flex-col items-start min-w-[100px]">
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-70 leading-none mb-1">{t('culto.protocol.congregation')}</span>
                                        <span className={`text-xs font-black uppercase tracking-tight ${(culto.meta_data?.protocolo?.congregacion_pie ?? false) ? '' : 'text-slate-400 dark:text-slate-500'
                                            }`}>
                                            {(culto.meta_data?.protocolo?.congregacion_pie ?? false) ? t('culto.protocol.standing') : t('culto.protocol.seated')}
                                        </span>
                                    </div>
                                    <div className={`w-12 h-7 rounded-full p-1 transition-colors border ${(culto.meta_data?.protocolo?.congregacion_pie ?? false)
                                        ? 'bg-blue-500 border-blue-600'
                                        : 'bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600'
                                        }`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${(culto.meta_data?.protocolo?.congregacion_pie ?? false) ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Cuadrícula de Contenido Responsiva */}
            <div className="space-y-6 md:space-y-8 w-full">
                {/* Fila 1: Responsables (Diseño Inteligente: Se expanden para ocupar el espacio) */}
                <div className="flex flex-wrap gap-4 md:gap-6 w-full overflow-visible relative z-30">
                    {config.tiene_lectura_introduccion && (
                        <div className="flex-1 min-w-[280px] lg:min-w-[340px] max-w-full">
                            <AssignmentSection
                                label={t('culto.introduccion')}
                                icon={<User className="w-5 h-5" />}
                                selectedUserId={culto.id_usuario_intro}
                                usuarioActual={culto.usuario_intro}
                                onSelect={(id, confirmed) => handleAssignment('introduccion', id, confirmed)}
                                disabled={isUpdating}
                                t={t}
                                cultoId={culto.id}
                                cultoDate={culto.fecha}
                                assignmentType="introduccion"
                                isFestivo={culto.es_laborable_festivo}
                            />
                        </div>
                    )}

                    {config.tiene_ensenanza && (
                        <div className="flex-1 min-w-[280px] lg:min-w-[340px] max-w-full">
                            <AssignmentSection
                                label={t('culto.ensenanza')}
                                icon={<BookOpen className="w-5 h-5" />}
                                selectedUserId={culto.id_usuario_ensenanza}
                                usuarioActual={culto.usuario_ensenanza}
                                onSelect={(id, confirmed) => handleAssignment('ensenanza', id, confirmed)}
                                disabled={isUpdating}
                                t={t}
                                cultoId={culto.id}
                                cultoDate={culto.fecha}
                                assignmentType="ensenanza"
                                isFestivo={culto.es_laborable_festivo}
                            />
                        </div>
                    )}

                    {config.tiene_testimonios && (
                        <div className="flex-1 min-w-[280px] lg:min-w-[340px] max-w-full">
                            <AssignmentSection
                                label={t('culto.testimonios')}
                                icon={<User className="w-5 h-5" />}
                                selectedUserId={culto.id_usuario_testimonios}
                                usuarioActual={culto.usuario_testimonios}
                                onSelect={(id, confirmed) => handleAssignment('testimonios', id, confirmed)}
                                disabled={isUpdating}
                                t={t}
                                cultoId={culto.id}
                                cultoDate={culto.fecha}
                                assignmentType="testimonios"
                                isFestivo={culto.es_laborable_festivo}
                            />
                        </div>
                    )}

                    {config.tiene_lectura_finalizacion && (
                        <div className="flex-1 min-w-[280px] lg:min-w-[340px] max-w-full">
                            <AssignmentSection
                                label={t('culto.finalizacion')}
                                icon={<User className="w-5 h-5" />}
                                selectedUserId={culto.id_usuario_finalizacion}
                                usuarioActual={culto.usuario_finalizacion}
                                onSelect={(id, confirmed) => handleAssignment('finalizacion', id, confirmed)}
                                disabled={isUpdating}
                                t={t}
                                cultoId={culto.id}
                                cultoDate={culto.fecha}
                                assignmentType="finalizacion"
                                isFestivo={culto.es_laborable_festivo}
                            />
                        </div>
                    )}
                </div>

                {/* Conflict Confirmation Dialog Portal */}
                {isConflictDialogOpen && createPortal(
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden relative"
                            >
                                <div className="absolute top-0 left-0 w-full h-32 bg-amber-500/10" />
                                <div className="p-8 relative z-10 text-center">
                                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20">
                                        <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-500" />
                                    </div>

                                    <h3 className="text-2xl font-black uppercase tracking-tight mb-3">
                                        Usuario No Disponible
                                    </h3>

                                    <p className="text-muted-foreground font-medium leading-relaxed mb-8">
                                        Este hermano ha indicado que no está disponible para esta fecha o tipo de asignación. ¿Deseas asignarlo de todos modos?
                                    </p>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={handleConfirmAssignment}
                                            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            Asignar de todos modos
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsConflictDialogOpen(false)
                                                setPendingAssignment(null)
                                            }}
                                            className="w-full py-4 bg-muted hover:bg-muted/80 text-foreground/70 hover:text-foreground rounded-2xl font-black uppercase tracking-widest text-sm transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}

                {/* Fila 2: Lecturas y Música */}
                <div className="grid gap-4 md:gap-6 lg:gap-8 lg:grid-cols-12 w-full items-start">
                    {/* Columna Derecha: Música (Bloque principal más grande y detallado) */}
                    {config.tiene_himnos_y_coros && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="lg:col-span-12 w-full"
                        >
                            <Card className="glass rounded-[2.5rem] border border-white/20 shadow-2xl w-full">
                                <CardHeader className="p-4 md:p-6 lg:p-8 border-b border-white/10 bg-accent/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle icon={<Music className="w-6 h-6 text-primary" />} className="text-xl md:text-2xl font-black uppercase tracking-tighter">
                                            {t('dashboard.hymns')}
                                        </CardTitle>
                                        <div className="hidden sm:block bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
                                            <p className="text-[10px] text-primary font-black uppercase tracking-widest leading-none">
                                                Máximo 3 por categoría
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 md:p-5 lg:p-6">
                                    <HimnoCoroSelector cultoId={culto.id} />
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Botón Finalizar Edición */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center pt-8"
            >
                <BackButton
                    fallbackUrl="/dashboard/cultos"
                    label="Finalizar y Guardar"
                    className="h-16 px-12 bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/30 hover:scale-105 active:scale-95 border-b-4 border-blue-800"
                />
            </motion.div>
        </div>
    )
}
