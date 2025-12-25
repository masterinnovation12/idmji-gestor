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
import { Calendar, Clock, User, BookOpen, Music, ChevronLeft, AlertCircle, CheckCircle, Sparkles } from 'lucide-react'
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
import { motion, AnimatePresence } from 'framer-motion'
import { Culto } from '@/types/database'

interface CultoDetailClientProps {
    culto: Culto
    userId: string
}

/**
 * Componente interno para tarjetas de asignación reutilizables con diseño premium
 */
function AssignmentSection({
    label,
    icon,
    selectedUserId,
    usuarioActual,
    onSelect,
    disabled,
    t,
}: {
    label: string,
    icon: any,
    selectedUserId: string | null,
    usuarioActual: any,
    onSelect: (id: string | null) => void,
    disabled: boolean,
    t: any,
}) {
    const [isEditing, setIsEditing] = useState(!selectedUserId)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full w-full min-w-0"
        >
            <Card className="h-full w-full min-w-0 border-t-4 border-primary/40 glass group hover:border-primary transition-all duration-500 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
                
                <CardHeader className="flex flex-row items-start justify-between pb-2 md:pb-3 shrink-0 gap-2">
                    <CardTitle icon={icon} className="text-primary font-black uppercase tracking-widest text-[10px] md:text-[11px] leading-tight">
                        {label}
                    </CardTitle>
                    {selectedUserId && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-2 py-1 md:px-2.5 md:py-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm shrink-0 mt-0.5"
                        >
                            Modificar
                        </button>
                    )}
                </CardHeader>
                <CardContent className="p-3 md:p-4 flex-1 flex flex-col min-h-0">
                    <div className="space-y-3 md:space-y-4 flex-1 flex flex-col min-h-0">
                        <div className="shrink-0">
                            <UserSelector
                                selectedUserId={selectedUserId}
                                onSelect={(id) => {
                                    onSelect(id)
                                    if (id) setIsEditing(false)
                                }}
                                disabled={disabled}
                                isEditing={isEditing}
                                onEditChange={setIsEditing}
                            />
                        </div>
                        
                        <AnimatePresence mode="wait">
                            {usuarioActual ? (
                                <motion.div 
                                    key={usuarioActual.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`flex items-center gap-3 p-3 md:p-4 rounded-[1.5rem] border shadow-inner relative overflow-hidden group/assigned transition-all flex-1 min-h-0 ${
                                        isEditing 
                                            ? 'bg-muted/50 border-border opacity-60' 
                                            : 'bg-primary/5 border-primary/10'
                                    }`}
                                >
                                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover/assigned:opacity-100 transition-opacity" />
                                    
                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-black text-xs md:text-sm border-2 shadow-lg relative z-10 shrink-0 ${
                                        isEditing ? 'bg-muted border-border text-muted-foreground' : 'bg-primary/20 border-white/20 text-primary'
                                    }`}>
                                        {usuarioActual.avatar_url ? (
                                            <img src={usuarioActual.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                                        ) : (
                                            <span className="uppercase">{usuarioActual.nombre?.[0]}{usuarioActual.apellidos?.[0]}</span>
                                        )}
                                    </div>
                                    <div className="relative z-10 min-w-0 flex-1">
                                        <p className={`text-[11px] md:text-xs lg:text-sm font-black uppercase tracking-tight leading-tight whitespace-normal break-words ${isEditing ? 'text-muted-foreground' : 'text-foreground'}`}>
                                            {usuarioActual.nombre} {usuarioActual.apellidos}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className={`w-1 h-1 rounded-full animate-pulse shrink-0 ${isEditing ? 'bg-muted-foreground' : 'bg-emerald-500'}`} />
                                            <p className="text-[7px] md:text-[8px] lg:text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                                                {isEditing ? 'Modificando...' : 'Asignado'}
                                            </p>
                                        </div>
                                    </div>
                                    {!isEditing && <CheckCircle className="ml-auto w-4 h-4 md:w-5 md:h-5 text-emerald-500/40 group-hover/assigned:text-emerald-500 transition-colors shrink-0" />}
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
                toast.success(t('common.success'), {
                    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />
                })
            } else {
                toast.error(result.error || t('common.error'))
            }
        } catch (error) {
            toast.error('Error de conexión')
        } finally {
            setIsUpdating(false)
        }
    }

    const tipoCulto = culto.tipo_culto?.nombre || 'Culto'
    const config = culto.tipo_culto || {}

    return (
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 lg:space-y-8 pb-20 px-4 md:px-8 no-scrollbar w-full">
            {/* Header / Breadcrumb */}
            <div className="space-y-4 md:space-y-6 w-full">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Link
                        href="/dashboard/cultos"
                        className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-muted/50 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all font-black uppercase tracking-widest group border border-border/50 shadow-sm"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        {t('dashboard.calendar')}
                    </Link>
                </motion.div>

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

                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-3 bg-white/40 dark:bg-black/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-sm">
                                        <Calendar className="w-5 h-5 text-primary" />
                                        <span className="text-sm font-black uppercase tracking-tight">
                                            {format(new Date(culto.fecha), 'PPPP', { locale })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white/40 dark:bg-black/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-sm font-black">
                                        <Clock className="w-5 h-5 text-primary" />
                                        <span className="text-sm uppercase tracking-widest">
                                            {culto.hora_inicio.slice(0, 5)}
                                        </span>
                                    </div>
                                    {culto.es_laborable_festivo && (
                                        <div className="flex items-center gap-3 bg-amber-500/10 text-amber-600 px-6 py-3 rounded-2xl border border-amber-500/20 shadow-lg shadow-amber-500/10 font-black animate-pulse">
                                            <AlertCircle className="w-5 h-5" />
                                            <span className="text-xs uppercase tracking-widest">Festivo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="hidden lg:block p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 shadow-inner">
                                <Sparkles className="w-12 h-12 text-primary opacity-20" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Cuadrícula de Contenido Responsiva */}
            <div className="space-y-6 md:space-y-8 w-full">
                {/* Fila 1: Responsables (En una sola línea en Desktop) */}
                <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 w-full">
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
                </div>

                {/* Fila 2: Lecturas y Música */}
                <div className="grid gap-4 md:gap-6 lg:gap-8 lg:grid-cols-12 w-full items-start">
                    {/* Columna Izquierda: Biblia (Bloque más pequeño y compacto) */}
                    {(config.tiene_lectura_introduccion || config.tiene_lectura_finalizacion) && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ delay: 0.2 }} 
                            className="lg:col-span-4 xl:col-span-3 w-full"
                        >
                            <Card className="glass rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden w-full">
                                <CardHeader className="p-4 md:p-6 border-b border-white/10 bg-primary/5">
                                    <CardTitle icon={<BookOpen className="w-5 h-5 text-primary" />} className="text-lg font-black uppercase tracking-tighter">
                                        {t('dashboard.lecturas')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 md:p-5 lg:p-6">
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
                        </motion.div>
                    )}

                    {/* Columna Derecha: Música (Bloque principal más grande y detallado) */}
                    {config.tiene_himnos_y_coros && (
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            transition={{ delay: 0.3 }} 
                            className={`${(config.tiene_lectura_introduccion || config.tiene_lectura_finalizacion) ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'} w-full`}
                        >
                            <Card className="glass rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden w-full">
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
                <Link
                    href="/dashboard/cultos"
                    className="h-16 px-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.05] active:scale-[0.95] border-b-4 border-blue-800"
                >
                    <CheckCircle className="w-5 h-5" />
                    Finalizar y Guardar
                </Link>
            </motion.div>
        </div>
    )
}
