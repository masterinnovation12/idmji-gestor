'use client'

import { Info } from 'lucide-react'
import type { RolInstruccionCulto } from '@/types/database'
import { useI18n } from '@/lib/i18n/I18nProvider'

export type InstrModalState = { open: boolean; rol: RolInstruccionCulto } | null

interface CultoInstruccionesIconBtnProps {
  readonly rol: RolInstruccionCulto
  readonly onOpen: (rol: RolInstruccionCulto) => void
}

/** Icono «i» de instrucciones: abre el mismo contenido que /dashboard/instrucciones (por tipo + rol). */
export function CultoInstruccionesIconBtn({ rol, onOpen }: CultoInstruccionesIconBtnProps) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={() => onOpen(rol)}
      aria-label={t('culto.instrucciones.ver')}
      data-testid={`ver-instrucciones-icon-${rol}`}
      className="flex items-center justify-center w-9 h-9 min-w-9 min-h-9 rounded-full
                bg-[#1f2e85]/10 text-[#1f2e85]
                hover:bg-[#f8f3e8] border border-[rgba(184,150,74,0.35)] hover:border-[#b8964a]
                active:scale-95 transition-all shadow-sm touch-manipulation"
    >
      <Info className="w-4 h-4 shrink-0" strokeWidth={2.5} />
    </button>
  )
}
