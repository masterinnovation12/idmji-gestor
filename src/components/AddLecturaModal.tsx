'use client'

import { useState } from 'react'
import { BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Modal } from '@/components/ui/Modal'
import BibleSelector from '@/components/BibleSelector'
import { saveLectura, confirmRepeatedLectura } from '@/app/dashboard/lecturas/actions'
import { toast } from 'sonner'

export interface AddLecturaModalProps {
  isOpen: boolean
  onClose: () => void
  cultoId: string
  userId: string
  tipo: 'introduccion' | 'finalizacion'
  onSuccess?: () => void
  mode?: 'commit' | 'draft'
  onDraftSave?: (payload: {
    tipo: 'introduccion' | 'finalizacion'
    libro: string
    capituloInicio: number
    versiculoInicio: number
    capituloFin: number
    versiculoFin: number
  }) => void
  /** Si true, el título del modal dice "Modificar" en lugar de "Añadir" */
  isEdit?: boolean
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
    [key: string]: unknown
  }
}

export default function AddLecturaModal({
  isOpen,
  onClose,
  cultoId,
  userId,
  tipo,
  onSuccess,
  isEdit = false,
  mode = 'commit',
  onDraftSave,
}: AddLecturaModalProps) {
  const { t, language } = useI18n()
  const locale = language === 'ca-ES' ? ca : es
  const [repetitionData, setRepetitionData] = useState<RepetitionData | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const handleClose = () => {
    setRepetitionData(null)
    onClose()
  }

  const handleSelectCita = async (
    libro: string,
    capInicio: number,
    versInicio: number,
    capFin?: number,
    versFin?: number
  ) => {
    if (mode === 'draft') {
      onDraftSave?.({
        tipo,
        libro,
        capituloInicio: capInicio,
        versiculoInicio: versInicio,
        capituloFin: capFin ?? capInicio,
        versiculoFin: versFin ?? versInicio,
      })
      toast.success('Lectura añadida al borrador')
      onSuccess?.()
      handleClose()
      return
    }

    setIsActionLoading(true)
    try {
      const result = await saveLectura(
        cultoId,
        tipo,
        libro,
        capInicio,
        versInicio,
        capFin ?? capInicio,
        versFin ?? versInicio,
        userId
      )

      if (result.requiresConfirmation && result.existingReading) {
        setRepetitionData({
          libro,
          capInicio,
          versInicio,
          capFin: capFin ?? capInicio,
          versFin: versFin ?? versInicio,
          originalId: result.existingReading.id,
          existingReading: result.existingReading,
        })
      } else if (result.success) {
        toast.success(t('common.success'))
        onSuccess?.()
        handleClose()
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('Error al guardar la lectura')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleConfirmRepetida = async () => {
    if (!repetitionData) return
    if (mode === 'draft') {
      onDraftSave?.({
        tipo,
        libro: repetitionData.libro,
        capituloInicio: repetitionData.capInicio,
        versiculoInicio: repetitionData.versInicio,
        capituloFin: repetitionData.capFin,
        versiculoFin: repetitionData.versFin,
      })
      toast.success('Lectura repetida añadida al borrador')
      setRepetitionData(null)
      onSuccess?.()
      handleClose()
      return
    }
    setIsActionLoading(true)
    try {
      const result = await confirmRepeatedLectura(
        cultoId,
        tipo,
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
        setRepetitionData(null)
        onSuccess?.()
        handleClose()
      } else {
        toast.error(result.error ?? 'Error al confirmar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setIsActionLoading(false)
    }
  }

  const tipoLabel = tipo === 'introduccion' ? 'Introducción' : 'Finalización'
  const titleVerb = isEdit ? 'Modificar' : 'Añadir'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-sm font-black uppercase tracking-widest">
            {titleVerb} Lectura: {tipoLabel}
          </span>
        </div>
      }
      size="md"
      keyPrefix="add-lectura"
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
                Esta cita ya fue leída anteriormente el{' '}
                <span className="text-foreground font-bold">
                  {format(new Date(repetitionData.existingReading.fecha), 'PP', { locale })}
                </span>
                .
              </p>
            </div>
          </div>

          <div className="p-6 bg-muted/50 rounded-4xl border border-border/50 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2 relative z-10">
              Pasaje Bíblico
            </p>
            <p className="text-3xl font-black uppercase tracking-tighter relative z-10 leading-none">
              {repetitionData.libro} {repetitionData.capInicio}:{repetitionData.versInicio}
              {(repetitionData.capFin !== repetitionData.capInicio ||
                repetitionData.versFin !== repetitionData.versInicio) && (
                <>
                  {' - '}
                  {repetitionData.capFin === repetitionData.capInicio
                    ? repetitionData.versFin
                    : `${repetitionData.capFin}:${repetitionData.versFin}`}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={() => setRepetitionData(null)}
              className="flex-1 h-14 bg-muted text-muted-foreground font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-muted/80 transition-colors order-2 sm:order-1"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmRepetida}
              disabled={isActionLoading}
              className="flex-2 h-14 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 order-1 sm:order-2 flex items-center justify-center gap-2"
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
  )
}
