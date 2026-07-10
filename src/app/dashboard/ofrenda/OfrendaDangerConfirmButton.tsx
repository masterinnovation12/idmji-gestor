'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'

interface Props {
    label: string
    confirmText: string
    isLoading: boolean
    onConfirm: () => void
    testIdPrefix: string
}

/**
 * Botón de acción destructiva con confirmación inline — patrón compartido
 * por los paneles Generar de las tres secciones de Labores.
 * Sí/Cancelar reutilizan las claves de eliminar plan (idénticas en ambos idiomas).
 */
export function OfrendaDangerConfirmButton({
    label,
    confirmText,
    isLoading,
    onConfirm,
    testIdPrefix,
}: Readonly<Props>) {
    const { t } = useI18n()
    const [confirmOpen, setConfirmOpen] = useState(false)

    if (confirmOpen) {
        return (
            <div
                className="w-full rounded-2xl border border-red-500/30 bg-red-500/8 p-3 shadow-sm"
                data-testid={`${testIdPrefix}-confirm`}
                role="alertdialog"
                aria-labelledby={`${testIdPrefix}-confirm-text`}
            >
                <p
                    id={`${testIdPrefix}-confirm-text`}
                    className="text-sm font-semibold text-red-700 dark:text-red-300 leading-snug mb-3"
                >
                    {confirmText}
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => { setConfirmOpen(false); onConfirm() }}
                        disabled={isLoading}
                        className="w-full px-3 py-3 min-h-[48px] text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50 touch-manipulation order-1"
                    >
                        {t('ofrenda.deletePlan.yes')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmOpen(false)}
                        disabled={isLoading}
                        className="w-full px-3 py-3 min-h-[48px] text-sm font-semibold border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white text-[#1f2e85] rounded-xl hover:bg-[#f8f3e8] touch-manipulation order-2"
                    >
                        {t('ofrenda.deletePlan.no')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isLoading}
            className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-700 dark:text-red-300 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 touch-manipulation"
            data-testid={`${testIdPrefix}-btn`}
        >
            <Trash2 className="w-4 h-4" />
            <span suppressHydrationWarning>{label}</span>
        </motion.button>
    )
}
