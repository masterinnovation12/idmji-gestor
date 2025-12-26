/**
 * BibleReadingManager - IDMJI Gestor de Púlpito
 * 
 * Gestiona la selección y visualización de lecturas bíblicas para un culto.
 * Incluye lógica de detección de lecturas repetidas y avisos al usuario.
 * 
 * Características:
 * - Historial de lecturas del culto
 * - Selector de citas con validación de repetición
 * - Modal de confirmación para lecturas repetidas
 * - Soporte multiidioma (ES/CA)
 * 
 * @author Antigravity AI
 * @date 2024-12-25
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, AlertCircle, History, Plus, Edit2, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Modal } from '@/components/ui/Modal'
import { LecturaBiblica } from '@/types/database'
import BibleSelector from '@/components/BibleSelector'
import { saveLectura, confirmRepeatedLectura, getLecturasByCulto, deleteLectura } from '@/app/dashboard/lecturas/actions'
import { toast } from 'sonner'

interface BibleReadingManagerProps {
    cultoId: string
    userId: string
    config: {
        tiene_lectura_introduccion: boolean
        tiene_lectura_finalizacion: boolean
    }
}

interface RepetitionData {
    libro: string
    capInicio: number
    versInicio: number
    capFin: number
    versFin: number
    originalId: string
    existingReading: {
        fecha: string
        [key: string]: any
    }
}

export default function BibleReadingManager({ cultoId, userId, config }: BibleReadingManagerProps) {
    const { t, language } = useI18n()
    const [lecturas, setLecturas] = useState<LecturaBiblica[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isActionLoading, setIsActionLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeTipo, setActiveTipo] = useState<'introduccion' | 'finalizacion' | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Estado para confirmación de repetición
    const [repetitionData, setRepetitionData] = useState<RepetitionData | null>(null)

    // Cargar lecturas actuales
    const loadLecturas = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data, error } = await getLecturasByCulto(cultoId)
            if (error) {
                console.error('Error cargando lecturas:', error)
                toast.error('Error al cargar lecturas')
            } else if (data) {
                console.log('Lecturas cargadas:', data)
                setLecturas(data)
            }
        } catch (error) {
            console.error('Error fatal cargando lecturas:', error)
        } finally {
            setIsLoading(false)
        }
    }, [cultoId])

    useEffect(() => {
        loadLecturas()
    }, [loadLecturas])

    const handleSelectCita = async (
        libro: string,
        capInicio: number,
        versInicio: number,
        capFin?: number,
        versFin?: number
    ) => {
        if (!activeTipo) return

        setIsActionLoading(true)
        try {
            const result = await saveLectura(
                cultoId,
                activeTipo,
                libro,
                capInicio,
                versInicio,
                capFin || capInicio,
                versFin || versInicio,
                userId
            )

            if (result.requiresConfirmation) {
                setRepetitionData({
                    libro,
                    capInicio,
                    versInicio,
                    capFin: capFin || capInicio,
                    versFin: versFin || versInicio,
                    originalId: result.existingReading.id,
                    existingReading: result.existingReading
                })
            } else if (result.success) {
                toast.success(t('common.success'))
                // Actualización optimista del estado local
                if (result.data) {
                    setLecturas(prev => {
                        const exists = prev.findIndex(l => l.id === result.data.id)
                        if (exists !== -1) {
                            const newLecturas = [...prev]
                            newLecturas[exists] = result.data
                            return newLecturas
                        }
                        return [...prev, result.data].sort((a, b) => a.tipo_lectura.localeCompare(b.tipo_lectura))
                    })
                }
                setIsModalOpen(false)
                // loadLecturas() // Ya lo actualizamos optimísticamente
            } else if (result.error) {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('Error al guardar la lectura')
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleConfirmRepetida = async () => {
        if (!repetitionData || !activeTipo) return

        setIsActionLoading(true)
        try {
            const result = await confirmRepeatedLectura(
                cultoId,
                activeTipo,
                repetitionData.libro,
                repetitionData.capInicio,
                repetitionData.versInicio,
                repetitionData.capFin,
                repetitionData.versFin,
                userId,
                repetitionData.originalId
            )

            if (result.success) {
                toast.success('Lectura guardada como repetida')
                if (result.data) {
                    setLecturas(prev => {
                        const exists = prev.findIndex(l => l.id === result.data.id)
                        if (exists !== -1) {
                            const newLecturas = [...prev]
                            newLecturas[exists] = result.data
                            return newLecturas
                        }
                        return [...prev, result.data].sort((a, b) => a.tipo_lectura.localeCompare(b.tipo_lectura))
                    })
                }
                setRepetitionData(null)
                setIsModalOpen(false)
            } else {
                toast.error(result.error || 'Error al confirmar')
            }
        } catch (error) {
            toast.error('Error de conexión')
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        setIsActionLoading(true)
        try {
            // Optimismo: Eliminar de la UI primero para evitar el "flash"
            const currentLecturas = [...lecturas]
            setLecturas(prev => prev.filter(l => l.id !== id))
            
            const result = await deleteLectura(id, cultoId)
            
            if (result.success) {
                toast.success('Lectura eliminada')
                // No llamamos a loadLecturas() inmediatamente para evitar el flash
                // El revalidatePath del servidor se encargará de la sincronización real
            } else {
                // Revertir si falla
                setLecturas(currentLecturas)
                toast.error(result.error || 'Error al eliminar')
            }
        } catch (error) {
            toast.error('Error de conexión')
        } finally {
            setIsActionLoading(false)
            setDeleteConfirmId(null)
        }
    }

    const ReadingItem = ({ lectura }: { lectura: LecturaBiblica }) => (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-3.5 md:p-4.5 rounded-[1.75rem] border shadow-inner relative overflow-hidden group/reading transition-all ${
                lectura.es_repetida
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-primary/5 border-primary/10'
            }`}
        >
            <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover/reading:opacity-100 transition-opacity" />
            
            <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border-2 shadow-lg shrink-0 ${
                        lectura.es_repetida ? 'bg-red-500/20 border-white/20 text-red-600' : 'bg-primary/20 border-white/20 text-primary'
                    }`}>
                        <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[9px] md:text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none">
                                {lectura.tipo_lectura === 'introduccion' ? 'Lectura Introducción' : 'Lectura Final'}
                            </p>
                            {lectura.es_repetida && (
                                <div className="flex items-center gap-1 text-red-600 font-black text-[7px] uppercase bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20 shrink-0">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    <span>Repetida</span>
                                </div>
                            )}
                        </div>
                        <p className={`text-sm md:text-base lg:text-lg font-black uppercase tracking-tight mt-1 leading-none whitespace-nowrap break-normal ${lectura.es_repetida ? 'text-red-600' : 'text-foreground'}`}>
                            {lectura.libro} {lectura.capitulo_inicio}:{lectura.versiculo_inicio}
                            {lectura.capitulo_fin !== lectura.capitulo_inicio || lectura.versiculo_fin !== lectura.versiculo_inicio
                                ? ` - ${lectura.capitulo_fin}:${lectura.versiculo_fin}`
                                : ''}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <p className="text-[8px] md:text-[9px] lg:text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none">
                                    Registrada
                                </p>
                            </div>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-emerald-500/20 p-0.5 rounded-full"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            </motion.div>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-primary/10">
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveTipo(lectura.tipo_lectura as any); setIsModalOpen(true); }}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-sm border border-border/50 group/btn"
                    >
                        <Edit2 className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Modificar</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(lectura.id); }}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all shadow-sm border border-border/50 group/btn"
                    >
                        <Trash2 className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Eliminar</span>
                    </button>
                </div>
            </div>
        </motion.div>
    )

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Bloque vacío con botón centrado */}
            <div className="flex-1 space-y-4">
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4 opacity-50">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cargando lecturas...</p>
                    </div>
                ) : lecturas.length > 0 ? (
                    <div className="grid gap-4 grid-cols-1">
                        <AnimatePresence mode="popLayout">
                            {lecturas.map((lectura) => (
                                <ReadingItem key={lectura.id} lectura={lectura} />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-10 border-2 border-dashed border-primary/20 rounded-[2rem] flex flex-col items-center justify-center gap-6 bg-primary/5 group/empty hover:border-primary/40 transition-all cursor-pointer"
                        onClick={() => {
                            if (config.tiene_lectura_introduccion) {
                                setActiveTipo('introduccion');
                                setIsModalOpen(true);
                            } else if (config.tiene_lectura_finalizacion) {
                                setActiveTipo('finalizacion');
                                setIsModalOpen(true);
                            }
                        }}
                    >
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center group-hover/empty:scale-110 transition-transform shadow-inner">
                            <Plus className="w-8 h-8 text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                                Añadir Lectura
                            </p>
                            <p className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground/60">
                                No hay lecturas registradas
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Botones de acción inteligentes - Solo se muestran si NO hay lecturas o para añadir el tipo faltante */}
            <div className="flex flex-wrap gap-3 md:gap-4 pt-4 border-t border-border/50 shrink-0">
                {lecturas.length > 0 && config.tiene_lectura_introduccion && !lecturas.some(l => l.tipo_lectura === 'introduccion') && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setActiveTipo('introduccion'); setIsModalOpen(true); }}
                        className="flex-1 min-w-[140px] flex items-center justify-center gap-3 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all shadow-xl bg-black dark:bg-white text-white dark:text-black hover:brightness-110 border-none"
                    >
                        <Plus className="w-4 h-4" />
                        Añadir Lectura
                    </motion.button>
                )}
                {lecturas.length > 0 && config.tiene_lectura_finalizacion && !lecturas.some(l => l.tipo_lectura === 'finalizacion') && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setActiveTipo('finalizacion'); setIsModalOpen(true); }}
                        className="flex-1 min-w-[140px] flex items-center justify-center gap-3 h-14 rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all shadow-xl bg-black dark:bg-white text-white dark:text-black hover:brightness-110 border-none"
                    >
                        <Plus className="w-4 h-4" />
                        Añadir Lectura Final
                    </motion.button>
                )}
            </div>

            {/* Modal de confirmación de eliminación */}
            <Modal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                title="Confirmar eliminación"
                size="sm"
            >
                <div className="p-4 space-y-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-600">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                            ¿Estás seguro de que deseas eliminar esta lectura? Esta acción no se puede deshacer.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 h-12 bg-muted text-muted-foreground font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-muted/80 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={async () => {
                                if (deleteConfirmId) {
                                    await handleDelete(deleteConfirmId)
                                    setDeleteConfirmId(null)
                                }
                            }}
                            className="flex-1 h-12 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Selección de Biblia */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setRepetitionData(null); }}
                title={
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <BookOpen className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-widest">
                            {lecturas.some(l => l.tipo_lectura === activeTipo) ? 'Modificar' : 'Añadir'} Lectura: {activeTipo === 'introduccion' ? 'Introducción' : 'Finalización'}
                        </span>
                    </div>
                }
                size="md"
            >
                {!repetitionData ? (
                    <div className="p-1">
                        <BibleSelector
                            onSelect={handleSelectCita}
                            disabled={isActionLoading}
                        />
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300 p-2">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-600 shadow-inner">
                                <AlertCircle className="w-10 h-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-red-600">¡Cita Repetida!</h3>
                                <p className="text-muted-foreground text-sm font-medium max-w-xs mx-auto">
                                    Esta cita ya fue leída anteriormente el <span className="text-foreground font-bold">{format(new Date(repetitionData.existingReading.fecha), 'PP', { locale: language === 'ca-ES' ? ca : es })}</span>.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-muted/50 rounded-[2rem] border border-border/50 text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover/assigned:opacity-100 transition-opacity" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 relative z-10">Pasaje Bíblico</p>
                            <p className="text-3xl font-black uppercase tracking-tighter relative z-10">
                                {repetitionData.libro} {repetitionData.capInicio}:{repetitionData.versInicio}
                                {repetitionData.capFin !== repetitionData.capInicio || repetitionData.versFin !== repetitionData.versInicio
                                    ? ` - ${repetitionData.capFin}:${repetitionData.versFin}`
                                    : ''}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <button
                                onClick={() => setRepetitionData(null)}
                                className="flex-1 h-14 bg-muted text-muted-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-muted/80 transition-colors order-2 sm:order-1"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleConfirmRepetida}
                                disabled={isActionLoading}
                                className="flex-[2] h-14 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 order-1 sm:order-2 flex items-center justify-center gap-2"
                            >
                                {isActionLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Usar de todos modos
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
