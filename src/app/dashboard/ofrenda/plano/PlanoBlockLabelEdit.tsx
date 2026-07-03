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
                    <label htmlFor={inputId} className="block text-xs font-bold text-slate-500 mb-1.5">
                        {t('ofrenda.plano.blockEdit.label')}
                    </label>
                    <input
                        id={inputId}
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        autoFocus
                        className="w-full px-4 py-3 min-h-[48px] rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white text-base text-slate-800"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 min-h-[48px] rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white text-[#1f2e85] font-semibold hover:bg-[#f8f3e8] touch-manipulation"
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
