'use client'

import { Modal } from '@/components/ui/Modal'
import { prettyKey } from '@/app/dashboard/archivos/archivos-data'
import type { TabConfig } from './types'

type DetailModalProps = Readonly<{
  row: Record<string, string> | null
  onClose: () => void
  activeTabConfig: TabConfig
}>

/**
 * Modal de detalle: muestra todas las columnas de un registro en formato clave-valor.
 */
export function DetailModal({ row, onClose, activeTabConfig }: DetailModalProps) {
  return (
    <Modal
      isOpen={!!row}
      onClose={onClose}
      title={activeTabConfig.label}
      size="md"
      keyPrefix="archivos-detail"
    >
      {row && (
        <div className="space-y-0 divide-y divide-border/40">
          {Object.entries(row).map(([key, value]) => (
            <div key={key} className="py-3 first:pt-0 last:pb-0">
              <div className={`text-[11px] font-bold uppercase tracking-wider ${activeTabConfig.color} mb-0.5`}>
                {prettyKey(key)}
              </div>
              <div className="text-sm text-foreground wrap-break-word leading-relaxed">
                {value || '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
