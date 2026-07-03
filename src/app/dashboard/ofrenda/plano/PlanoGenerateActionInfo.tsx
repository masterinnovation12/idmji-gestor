'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { OfrendaLiquidShell } from '../OfrendaLiquidShell'
import type { PlanoGenerateMode } from './planoGenerateActions'

interface Props {
    mode: PlanoGenerateMode
}

export function PlanoGenerateActionInfo({ mode }: Readonly<Props>) {
    const { t } = useI18n()
    const [open, setOpen] = useState(false)
    const labelKey = `ofrenda.planoGenerate.actionInfo.${mode}.label` as const
    const titleKey = `ofrenda.planoGenerate.actionInfo.${mode}.title` as const
    const bodyKey = `ofrenda.planoGenerate.actionInfo.${mode}.body` as const

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0 rounded-xl border border-blue-500/30 text-blue-600 hover:bg-blue-500/10 touch-manipulation"
                aria-label={t(labelKey)}
                data-testid={`ofrenda-plano-generate-info-${mode}`}
            >
                <Info className="w-4 h-4" />
            </button>

            <OfrendaLiquidShell
                open={open}
                onClose={() => setOpen(false)}
                ariaLabel={t(titleKey)}
                title={t(labelKey)}
                headline={t(titleKey)}
                accent="blue"
                testIdPrefix={`ofrenda-plano-generate-info-${mode}`}
            >
                <p className="text-sm leading-relaxed text-slate-500 pb-2" suppressHydrationWarning>
                    {t(bodyKey)}
                </p>
            </OfrendaLiquidShell>
        </>
    )
}
