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

import { useState, useEffect, useCallback, useRef } from 'react'
import { BookOpen, AlertCircle, Plus, Edit2, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Modal } from '@/components/ui/Modal'
import { LecturaBiblica } from '@/types/database'
import { getLecturasByCulto, deleteLectura } from '@/app/dashboard/lecturas/actions'
import { toast } from 'sonner'
import AddLecturaModal from '@/components/AddLecturaModal'

interface BibleReadingManagerProps {
    cultoId: string
    userId: string
    config: {
        tiene_lectura_introduccion: boolean
        tiene_lectura_finalizacion: boolean
    }
    mode?: 'commit' | 'draft'
    onDraftChange?: (lecturas: LecturaBiblica[], dirty?: boolean) => void
}

interface ReadingItemProps {
    lectura: LecturaBiblica
    onEdit: (lectura: LecturaBiblica) => void
    onDelete: (id: string) => void
}

function ReadingItem({ lectura, onEdit, onDelete }: ReadingItemProps) {
    const { t } = useI18n()
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-3.5 md:p-4.5 rounded-[1.75rem] border shadow-inner relative overflow-hidden group/reading transition-all ${lectura.es_repetida
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-primary/5 border-primary/10'
                }`}
        >
            <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover/reading:opacity-100 transition-opacity" />

            <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border-2 shadow-lg shrink-0 ${lectura.es_repetida ? 'bg-red-500/20 border-white/20 text-red-600' : 'bg-primary/20 border-white/20 text-primary'
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
                                    <span>{t('bibleManager.repeated')}</span>
                                </div>
                            )}
                        </div>
                        <p className={`text-sm md:text-base lg:text-lg font-black uppercase tracking-tight mt-1 leading-tight whitespace-normal ${lectura.es_repetida ? 'text-red-600' : 'text-foreground'}`}>
                            {lectura.libro} {lectura.capitulo_inicio}:{lectura.versiculo_inicio}
                            {(lectura.capitulo_fin !== lectura.capitulo_inicio || lectura.versiculo_fin !== lectura.versiculo_inicio) && (
                                <>
                                    {' - '}
                                    {lectura.capitulo_fin === lectura.capitulo_inicio
                                        ? lectura.versiculo_fin
                                        : `${lectura.capitulo_fin}:${lectura.versiculo_fin}`}
                                </>
                            )}
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
                        onClick={(e) => { e.stopPropagation(); onEdit(lectura); }}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-sm border border-border/50 group/btn"
                    >
                        <Edit2 className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{t('culto.detail.modify')}</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(lectura.id); }}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all shadow-sm border border-border/50 group/btn"
                    >
                        <Trash2 className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{t('common.delete')}</span>
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

export default function BibleReadingManager({ cultoId, userId, config, mode = 'commit', onDraftChange }: BibleReadingManagerProps) {
    const { t } = useI18n()
    const [lecturas, setLecturas] = useState<LecturaBiblica[]>([])
    const [isLoading, setIsLoading] = useState(mode !== 'draft')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeTipo, setActiveTipo] = useState<'introduccion' | 'finalizacion' | null>(null)
    const [editingLectura, setEditingLectura] = useState<LecturaBiblica | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const onDraftChangeRef = useRef(onDraftChange)

    useEffect(() => {
        onDraftChangeRef.current = onDraftChange
    }, [onDraftChange])

    // Cargar lecturas actuales
    const loadLecturas = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data, error } = await getLecturasByCulto(cultoId)
            if (error) {
                console.error('Error cargando lecturas:', error)
                toast.error(t('bibleManager.loadError'))
            } else if (data) {
                console.log('Lecturas cargadas:', data)
                setLecturas(data)
                if (mode === 'draft') {
                    onDraftChangeRef.current?.(data, false)
                }
            }
        } catch (error) {
            console.error('Error fatal cargando lecturas:', error)
        } finally {
            setIsLoading(false)
        }
    }, [cultoId, mode, t])

    useEffect(() => {
        loadLecturas()
    }, [loadLecturas])

    const handleCloseAddModal = () => {
        setIsModalOpen(false)
        setActiveTipo(null)
        setEditingLectura(null)
    }

    const handleDelete = async (id: string) => {
        if (mode === 'draft') {
            const updated = lecturas.filter((l) => l.id !== id)
            setLecturas(updated)
            onDraftChangeRef.current?.(updated, true)
            setDeleteConfirmId(null)
            toast.success(t('bibleManager.draftDeleted'))
            return
        }
        setIsLoading(true)
        try {
            // Optimismo: Eliminar de la UI primero para evitar el "flash"
            const currentLecturas = [...lecturas]
            setLecturas(prev => prev.filter(l => l.id !== id))

            const result = await deleteLectura(id, cultoId)

            if (result.success) {
                toast.success(t('addLectura.deleted'))
                // No llamamos a loadLecturas() inmediatamente para evitar el flash
                // El revalidatePath del servidor se encargará de la sincronización real
            } else {
                // Revertir si falla
                setLecturas(currentLecturas)
                toast.error(result.error || t('addLectura.deleteError'))
            }
        } catch {
            toast.error(t('addLectura.connectionError'))
        } finally {
            setIsLoading(false)
            setDeleteConfirmId(null)
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Bloque vacío con botón centrado */}
            <div className="flex-1 space-y-4">
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-4 opacity-50">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('bibleManager.loadingReadings')}</p>
                    </div>
                ) : lecturas.length > 0 ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Lecturas registradas
                            </p>
                            {config.tiene_lectura_introduccion && (
                                <button
                                    type="button"
                                    onClick={() => { setEditingLectura(null); setActiveTipo('introduccion'); setIsModalOpen(true); }}
                                    className="h-8 w-8 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center"
                                    aria-label={t('dashboard.addReadingButton')}
                                    title={t('dashboard.addReadingButton')}
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="grid gap-4 grid-cols-1">
                        <AnimatePresence mode="popLayout">
                            {lecturas.map((lectura, idx) => (
                                <ReadingItem
                                    key={lectura.id || `lectura-${lectura.tipo_lectura}-${idx}`}
                                    lectura={lectura}
                                    onEdit={(item) => {
                                        setEditingLectura(item)
                                        setActiveTipo(item.tipo_lectura as 'introduccion' | 'finalizacion')
                                        setIsModalOpen(true)
                                    }}
                                    onDelete={(id) => setDeleteConfirmId(id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                    </div>
                ) : (
                    <motion.button
                        type="button"
                        key="empty-state"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full py-2.5 sm:py-3 px-4 sm:px-5 border border-dashed border-primary/25 rounded-2xl flex items-center justify-center gap-2 sm:gap-2.5 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 active:scale-[0.98] transition-all cursor-pointer touch-manipulation text-primary"
                        onClick={() => {
                            if (config.tiene_lectura_introduccion) {
                                setEditingLectura(null)
                                setActiveTipo('introduccion');
                                setIsModalOpen(true);
                            } else if (config.tiene_lectura_finalizacion) {
                                setEditingLectura(null)
                                setActiveTipo('finalizacion');
                                setIsModalOpen(true);
                            }
                        }}
                    >
                        <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" strokeWidth={2.5} />
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                            {t('dashboard.addReadingButton')}
                        </span>
                    </motion.button>
                )}
            </div>

            {/* Modal de confirmación de eliminación */}
            <Modal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                title={t('bibleManager.confirmDelete')}
                size="sm"
                keyPrefix="delete-reading"
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

            {isModalOpen && activeTipo && (
                <AddLecturaModal
                    isOpen={isModalOpen}
                    onClose={handleCloseAddModal}
                    cultoId={cultoId}
                    userId={userId}
                    tipo={activeTipo}
                    onSuccess={mode === 'commit' ? loadLecturas : undefined}
                    isEdit={!!editingLectura}
                    lecturaId={editingLectura?.id}
                    mode={mode}
                    onDraftSave={(payload) => {
                        const lectura: LecturaBiblica = {
                            id: editingLectura?.id || `draft-${payload.tipo}-${Date.now()}`,
                            culto_id: cultoId,
                            tipo_lectura: payload.tipo,
                            libro: payload.libro,
                            capitulo_inicio: payload.capituloInicio,
                            versiculo_inicio: payload.versiculoInicio,
                            capitulo_fin: payload.capituloFin,
                            versiculo_fin: payload.versiculoFin,
                            id_usuario_lector: userId,
                            es_repetida: false,
                            lectura_original_id: null,
                            created_at: new Date().toISOString(),
                        }
                        const updated = editingLectura
                            ? lecturas.map((l) => (l.id === editingLectura.id ? lectura : l))
                            : [...lecturas, lectura]
                        setLecturas(updated)
                        onDraftChangeRef.current?.(updated, true)
                    }}
                />
            )}
        </div>
    )
}
