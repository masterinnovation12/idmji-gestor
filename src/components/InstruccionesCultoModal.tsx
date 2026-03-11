'use client'

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { getInstruccionCulto } from '@/app/dashboard/instrucciones/actions'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { RolInstruccionCulto } from '@/types/database'

export interface InstruccionesCultoModalProps {
  isOpen: boolean
  onClose: () => void
  cultoTypeId: number | string
  cultoTypeNombre?: string
  rol: RolInstruccionCulto
}

export function InstruccionesCultoModal({
  isOpen,
  onClose,
  cultoTypeId,
  cultoTypeNombre,
  rol,
}: InstruccionesCultoModalProps) {
  const { t, language } = useI18n()
  const [titulo, setTitulo] = useState<string>('')
  const [contenido, setContenido] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lang = (language === 'ca-ES' ? 'ca-ES' : 'es-ES') as 'es-ES' | 'ca-ES'

  useEffect(() => {
    if (!isOpen || !cultoTypeId) return
    setLoading(true)
    setError(null)
    getInstruccionCulto(cultoTypeId, rol, lang)
      .then((res) => {
        if (res.success && res.data) {
          setTitulo(res.data.titulo)
          setContenido(res.data.contenido)
        } else {
          setTitulo('')
          setContenido('')
          if (res.error) setError(res.error)
        }
      })
      .finally(() => setLoading(false))
  }, [isOpen, cultoTypeId, rol, lang])

  const displayTitle = titulo || (cultoTypeNombre ? `${t('culto.instrucciones.title')} – ${cultoTypeNombre}` : t('culto.instrucciones.title'))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={displayTitle}
      size="lg"
      keyPrefix="instrucciones-culto"
    >
      <div data-testid="instrucciones-culto-modal" className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
        )}
        {!loading && !error && (
          <>
            {contenido ? (
              <div className="p-3 sm:p-4 md:p-6 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
                <div className="flex gap-3 sm:gap-4">
                  <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center ring-2 ring-primary/10">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 overflow-x-hidden">
                    <article
                      className="text-sm md:text-base leading-[1.65] md:leading-[1.7] text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium antialiased selection:bg-primary/20 break-words"
                      aria-label={t('culto.instrucciones.title')}
                    >
                      {contenido}
                    </article>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 italic py-4">
                {t('culto.instrucciones.empty')}
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
