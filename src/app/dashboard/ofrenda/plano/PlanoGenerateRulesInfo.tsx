'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { OfrendaLiquidShell } from '../OfrendaLiquidShell'
import { PLANO_GENERATE_RULE_IDS } from './planoGenerateRules'

export function PlanoGenerateRulesInfo() {
    const { t } = useI18n()
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-manipulation"
                aria-label={t('ofrenda.planoGenerate.rulesInfoLabel')}
                data-testid="ofrenda-plano-generate-rules-info"
            >
                <Info className="w-5 h-5" />
            </button>

            <OfrendaLiquidShell
                open={open}
                onClose={() => setOpen(false)}
                ariaLabel={t('ofrenda.planoGenerate.rulesTitle')}
                title={t('ofrenda.planoGenerate.rulesInfoLabel')}
                headline={t('ofrenda.planoGenerate.rulesTitle')}
                accent="gold"
                testIdPrefix="ofrenda-plano-generate-rules"
                unstyledBody
            >
                <ul className="space-y-3 text-sm leading-relaxed pb-4">
                    {PLANO_GENERATE_RULE_IDS.map(id => (
                        <li key={id} className="flex gap-2">
                            <span className="text-amber-600 dark:text-amber-400 shrink-0">•</span>
                            <span suppressHydrationWarning>{t(`ofrenda.planoGenerate.rules.${id}`)}</span>
                        </li>
                    ))}
                </ul>
            </OfrendaLiquidShell>
        </>
    )
}
