'use client'

import { CheckCircle, Save, XCircle } from 'lucide-react'

interface SaveChangesBarProps {
    isDirty: boolean
    isSaving: boolean
    pendingCount?: number
    onSave: () => void
    onDiscard: () => void
    /** Textos personalizados (p. ej. i18n). Si se omiten, se usan los valores por defecto en español. */
    labels?: {
        pendingBadge: string
        discard: string
        save: string
        saving: string
    }
}

const defaultLabels = {
    pendingBadge: (count: number) =>
        count > 0 ? `${count} cambios sin guardar` : 'Cambios sin guardar',
    discard: 'Descartar',
    save: 'Guardar cambios',
    saving: 'Guardando...',
}

export default function SaveChangesBar({
    isDirty,
    isSaving,
    pendingCount = 0,
    onSave,
    onDiscard,
    labels,
}: SaveChangesBarProps) {
    if (!isDirty) return null

    const pendingBadge =
        labels?.pendingBadge ?? defaultLabels.pendingBadge(pendingCount)
    const discardLabel = labels?.discard ?? defaultLabels.discard
    const saveLabel = labels?.save ?? defaultLabels.save
    const savingLabel = labels?.saving ?? defaultLabels.saving

    return (
        <div
            data-testid="save-changes-bar"
            className="fixed bottom-4 inset-x-3 md:inset-x-0 z-120 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]"
        >
            <div className="pointer-events-auto rounded-2xl border-[1.5px] border-[rgba(184,150,74,0.45)] bg-white shadow-2xl px-3 py-3 md:px-4 md:py-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-[min(100%,42rem)]">
                <div className="hidden sm:flex items-center gap-2 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2.5 py-1.5 min-w-0">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] font-black uppercase tracking-wider truncate">
                        {pendingBadge}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={onDiscard}
                    disabled={isSaving}
                    className="h-11 px-3 rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white text-[#1f2e85] font-bold text-xs uppercase tracking-wider hover:bg-[#f8f3e8] hover:border-[#b8964a] transition-colors disabled:opacity-60 flex items-center gap-1.5 shrink-0 touch-manipulation"
                >
                    <XCircle className="w-4 h-4" />
                    {discardLabel}
                </button>

                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="h-11 px-4 rounded-xl border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(31,46,133,0.32)] hover:shadow-[0_6px_22px_rgba(31,46,133,0.42)] transition-shadow disabled:opacity-60 flex items-center gap-1.5 shrink-0 touch-manipulation"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? savingLabel : saveLabel}
                </button>
            </div>
        </div>
    )
}
