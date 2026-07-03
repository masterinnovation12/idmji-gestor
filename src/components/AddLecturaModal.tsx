'use client'

import { useState } from 'react'
import { BookOpen, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Modal } from '@/components/ui/Modal'
import BibleSelector from '@/components/BibleSelector'
import { saveLectura, confirmRepeatedLectura, deleteLectura } from '@/app/dashboard/lecturas/actions'
import { toast } from 'sonner'

export interface AddLecturaModalProps {
  isOpen: boolean
  onClose: () => void
  cultoId: string
  userId: string
  tipo: 'introduccion' | 'finalizacion'
  onSuccess?: (savedReading?: {
    id: string
    tipo_lectura: 'introduccion' | 'finalizacion'
    libro: string
    capitulo_inicio: number
    versiculo_inicio: number
    capitulo_fin: number
    versiculo_fin: number
    created_at?: string
  }) => void
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
  lecturaId?: string
  initialReading?: {
    libro: string
    capitulo_inicio: number
    versiculo_inicio: number
    capitulo_fin?: number
    versiculo_fin?: number
  } | null
  onDeleteSuccess?: (deletedId: string) => void
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
  lecturaId,
  initialReading = null,
  mode = 'commit',
  onDraftSave,
  onDeleteSuccess,
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
      toast.success(t('addLectura.draftAdded'))
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
        userId,
        lecturaId
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
        onSuccess?.(result.data as Parameters<NonNullable<typeof onSuccess>>[0])
        handleClose()
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error(t('addLectura.saveError'))
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
      toast.success(t('addLectura.draftRepeatedAdded'))
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
        repetitionData.originalId,
        lecturaId
      )

      if (result.success) {
        toast.success(t('addLectura.savedRepeated'))
        setRepetitionData(null)
        onSuccess?.(result.data as Parameters<NonNullable<typeof onSuccess>>[0])
        handleClose()
      } else {
        toast.error(result.error ?? t('addLectura.confirmError'))
      }
    } catch {
      toast.error(t('addLectura.connectionError'))
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteLectura = async () => {
    if (!lecturaId || mode === 'draft') return
    setIsActionLoading(true)
    try {
      const result = await deleteLectura(lecturaId, cultoId)
      if ('error' in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success(t('addLectura.deleted'))
      onDeleteSuccess?.(lecturaId)
      handleClose()
    } catch {
      toast.error(t('addLectura.deleteError'))
    } finally {
      setIsActionLoading(false)
    }
  }

  const tipoLabel = tipo === 'introduccion' ? t('cultos.intro') : t('cultos.finalizacion')
  const modalTitle = (isEdit ? t('addLectura.modalTitleEdit') : t('addLectura.modalTitle')).replace('{tipo}', tipoLabel)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1f2e85]/10 border border-[rgba(184,150,74,0.35)] flex items-center justify-center text-[#1f2e85]">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-sm font-black uppercase tracking-widest">
            {modalTitle}
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
            cultoId={cultoId}
            lecturaId={lecturaId}
            initialSelection={initialReading
              ? {
                libro: initialReading.libro,
                capituloInicio: initialReading.capitulo_inicio,
                versiculoInicio: initialReading.versiculo_inicio,
                capituloFin: initialReading.capitulo_fin,
                versiculoFin: initialReading.versiculo_fin,
              }
              : null}
          />
          {isEdit && lecturaId && mode !== 'draft' && (
            <div className="pt-3 px-1">
              <button
                type="button"
                onClick={handleDeleteLectura}
                disabled={isActionLoading}
                className="w-full h-12 rounded-2xl border border-red-300 bg-red-50 text-red-700 font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 touch-manipulation"
              >
                <Trash2 className="w-4 h-4" />
                {t('addLectura.deleteButton')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300 p-2">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-600 shadow-inner">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-red-600">{t('addLectura.repeatedTitle')}</h3>
              <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto">
                {t('addLectura.repeatedReadOn').split('{fecha}').map((part, i, arr) => (
                  <span key={part + String(i)}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className="text-[#1f2e85] font-bold">
                        {format(new Date(repetitionData.existingReading.fecha), 'PP', { locale })}
                      </span>
                    )}
                  </span>
                ))}
              </p>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-[#f8f3e8] to-white rounded-4xl border-[1.5px] border-[rgba(184,150,74,0.4)] text-center relative overflow-hidden group shadow-inner">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#b8964a]/10 rounded-full blur-2xl -mr-12 -mt-12" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b68f2f] mb-2 relative z-10">
              {t('addLectura.passage')}
            </p>
            <p className="text-3xl font-black uppercase tracking-tighter relative z-10 leading-none text-[#1f2e85]">
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
              className="flex-1 h-14 border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white text-[#1f2e85] font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-[#f8f3e8] hover:border-[#b8964a] transition-colors order-2 sm:order-1 touch-manipulation"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmRepetida}
              disabled={isActionLoading}
              className="flex-2 h-14 bg-red-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 order-1 sm:order-2 flex items-center justify-center gap-2 touch-manipulation"
            >
              {isActionLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {t('addLectura.useAnyway')}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
