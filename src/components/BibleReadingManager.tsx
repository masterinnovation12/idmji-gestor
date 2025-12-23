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
 * @date 2024-12-18
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, AlertCircle, CheckCircle2, History } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Modal } from '@/components/ui/Modal'
import { LecturaBiblica } from '@/types/database'
import BibleSelector from '@/components/BibleSelector'
import { saveLectura, confirmRepeatedLectura, getLecturasByCulto } from '@/app/dashboard/lecturas/actions'
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
    const [isLoading, setIsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeTipo, setActiveTipo] = useState<'introduccion' | 'finalizacion' | null>(null)

    // Estado para confirmación de repetición
    const [repetitionData, setRepetitionData] = useState<RepetitionData | null>(null)

    // Cargar lecturas actuales
    const loadLecturas = useCallback(async () => {
        const { data } = await getLecturasByCulto(cultoId)
        if (data) setLecturas(data)
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

        setIsLoading(true)
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
                loadLecturas()
                setIsModalOpen(false)
            } else if (result.error) {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('Error al guardar la lectura')
        } finally {
            setIsLoading(false)
        }
    }

    const handleConfirmRepetida = async () => {
        if (!repetitionData || !activeTipo) return

        setIsLoading(true)
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
                loadLecturas()
                setRepetitionData(null)
                setIsModalOpen(false)
            } else {
                toast.error(result.error || 'Error al confirmar')
            }
        } catch (error) {
            toast.error('Error de conexión')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Lista de lecturas actuales */}
            <div className="grid gap-3">
                {lecturas.map((lectura) => (
                    <div
                        key={lectura.id}
                        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${lectura.es_repetida
                            ? 'bg-red-500/5 border-red-500/20'
                            : 'bg-background/50 border-border'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${lectura.es_repetida ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'}`}>
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">
                                    {lectura.tipo_lectura === 'introduccion' ? t('cultos.intro') : t('cultos.finalizacion')}
                                </p>
                                <p className={`font-bold text-lg ${lectura.es_repetida ? 'text-red-600' : ''}`}>
                                    {lectura.libro} {lectura.capitulo_inicio}:{lectura.versiculo_inicio}
                                    {lectura.capitulo_fin !== lectura.capitulo_inicio || lectura.versiculo_fin !== lectura.versiculo_inicio
                                        ? ` - ${lectura.capitulo_fin}:${lectura.versiculo_fin}`
                                        : ''}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {lectura.lector?.nombre} {lectura.lector?.apellidos}
                                </p>
                            </div>
                        </div>
                        {lectura.es_repetida && (
                            <div className="flex items-center gap-1 text-red-600 font-bold text-xs uppercase bg-red-500/10 px-2 py-1 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                <span>Repetida</span>
                            </div>
                        )}
                    </div>
                ))}

                {lecturas.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl opacity-50">
                        <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm">No hay lecturas registradas</p>
                    </div>
                )}
            </div>

            {/* Botones para añadir */}
            <div className="flex flex-wrap gap-2 pt-2">
                {config.tiene_lectura_introduccion && !lecturas.some(l => l.tipo_lectura === 'introduccion') && (
                    <button
                        onClick={() => { setActiveTipo('introduccion'); setIsModalOpen(true); }}
                        className="flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-all border border-primary/20"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Añadir Intro
                    </button>
                )}
                {config.tiene_lectura_finalizacion && !lecturas.some(l => l.tipo_lectura === 'finalizacion') && (
                    <button
                        onClick={() => { setActiveTipo('finalizacion'); setIsModalOpen(true); }}
                        className="flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-all border border-primary/20"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Añadir Final
                    </button>
                )}
            </div>

            {/* Modal de Selección de Biblia */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setRepetitionData(null); }}
                title={`Añadir Lectura: ${activeTipo === 'introduccion' ? t('cultos.intro') : t('cultos.finalizacion')}`}
                size="md"
            >
                {!repetitionData ? (
                    <BibleSelector
                        onSelect={handleSelectCita}
                        disabled={isLoading}
                    />
                ) : (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-600">
                                <AlertCircle className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-red-600">¡Cita Repetida!</h3>
                                <p className="text-muted-foreground mt-2">
                                    Esta cita ya fue leída anteriormente el <b>{format(new Date(repetitionData.existingReading.fecha), 'PP', { locale: language === 'ca-ES' ? ca : es })}</b>.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-muted rounded-2xl space-y-2">
                            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pasaje</p>
                            <p className="text-2xl font-black">
                                {repetitionData.libro} {repetitionData.capInicio}:{repetitionData.versInicio}
                                {repetitionData.capFin !== repetitionData.capInicio || repetitionData.versFin !== repetitionData.versInicio
                                    ? ` - ${repetitionData.capFin}:${repetitionData.versFin}`
                                    : ''}
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setRepetitionData(null)}
                                className="flex-1 py-3 bg-muted font-bold rounded-xl hover:bg-muted/80 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleConfirmRepetida}
                                disabled={isLoading}
                                className="flex-2 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                            >
                                {isLoading ? t('common.loading') : 'Usar de todos modos'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    )
}
