'use client'

import { useEffect, useId, useState } from 'react'
import { OfrendaLiquidShell } from '../OfrendaLiquidShell'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { PlanoBloque } from './planoTypes'

interface Props {
    bloque: PlanoBloque | null
    onClose: () => void
    onSave: (bloqueN: number, labelText: string) => void
}

export function PlanoBlockLabelEdit({ bloque, onClose, onSave }: Readonly<Props>) {
    const { t } = useI18n()
    const inputId = useId()
    const [text, setText] = useState('')

    useEffect(() => {
        setText(bloque?.labelText ?? '')
    }, [bloque])

    if (!bloque) return null

    return (
        <OfrendaLiquidShell
            open
            onClose={onClose}
            ariaLabel={t('ofrenda.plano.blockEdit.title').replace('{n}', String(bloque.n))}
            title={t('ofrenda.plano.blockEdit.title').replace('{n}', String(bloque.n))}
            headline={t('ofrenda.plano.blockEdit.title').replace('{n}', String(bloque.n))}
            accent="gold"
            testIdPrefix="plano-block-edit"
            unstyledBody
        >
            <div className="px-4 pb-4 space-y-4">
                <div>
                    <label htmlFor={inputId} className="block text-xs font-bold text-muted-foreground mb-1.5">
                        {t('ofrenda.plano.blockEdit.label')}
                    </label>
                    <input
                        id={inputId}
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        autoFocus
                        className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-border bg-background text-base"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 min-h-[48px] rounded-xl border border-border font-semibold touch-manipulation"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onSave(bloque.n, text.trim() || String(bloque.n))
                            onClose()
                        }}
                        className="flex-1 py-3 min-h-[48px] rounded-xl bg-emerald-600 text-white font-bold touch-manipulation"
                    >
                        {t('ofrenda.plano.blockEdit.save')}
                    </button>
                </div>
            </div>
        </OfrendaLiquidShell>
    )
}
