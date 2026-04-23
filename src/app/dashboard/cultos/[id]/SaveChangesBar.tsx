'use client'

import { CheckCircle, Save, XCircle } from 'lucide-react'

interface SaveChangesBarProps {
    isDirty: boolean
    isSaving: boolean
    pendingCount?: number
    onSave: () => void
    onDiscard: () => void
}

export default function SaveChangesBar({
    isDirty,
    isSaving,
    pendingCount = 0,
    onSave,
    onDiscard,
}: SaveChangesBarProps) {
    if (!isDirty) return null

    return (
        <div className="fixed bottom-4 inset-x-3 md:inset-x-0 z-120 flex justify-center pointer-events-none">
            <div className="pointer-events-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl px-3 py-3 md:px-4 md:py-3 flex items-center justify-center gap-3">
                <div className="hidden sm:flex items-center gap-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2.5 py-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap">
                        {pendingCount > 0 ? `${pendingCount} cambios sin guardar` : 'Cambios sin guardar'}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={onDiscard}
                    disabled={isSaving}
                    className="h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                    <XCircle className="w-4 h-4" />
                    Descartar
                </button>

                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
        </div>
    )
}
