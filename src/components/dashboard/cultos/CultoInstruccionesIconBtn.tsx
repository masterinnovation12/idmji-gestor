'use client'

import { Info } from 'lucide-react'
import type { RolInstruccionCulto } from '@/types/database'

export type InstrModalState = { open: boolean; rol: RolInstruccionCulto } | null

interface CultoInstruccionesIconBtnProps {
  readonly rol: RolInstruccionCulto
  readonly onOpen: (rol: RolInstruccionCulto) => void
}

/** Icono «i» de instrucciones: abre el mismo contenido que /dashboard/instrucciones (por tipo + rol). */
export function CultoInstruccionesIconBtn({ rol, onOpen }: CultoInstruccionesIconBtnProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(rol)}
      aria-label="Ver instrucciones"
      data-testid={`ver-instrucciones-icon-${rol}`}
      className="flex items-center justify-center w-9 h-9 min-w-9 min-h-9 rounded-full
                bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400
                hover:bg-blue-200 dark:hover:bg-blue-800/50 border border-blue-200 dark:border-blue-700/50
                active:scale-95 transition-all shadow-sm touch-manipulation"
    >
      <Info className="w-4 h-4 shrink-0" strokeWidth={2.5} />
    </button>
  )
}
