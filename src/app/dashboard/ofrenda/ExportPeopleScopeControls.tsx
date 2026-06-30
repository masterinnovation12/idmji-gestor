'use client'

import type { ExportPeopleScope } from './exportPeopleScope'
import { EXPORT_PEOPLE_SCOPE_TEST_ID } from './exportPeopleScope'

interface ExportPeopleScopeControlsProps {
    scope: ExportPeopleScope
    onScopeChange: (scope: ExportPeopleScope) => void
    labels: {
        label: string
        all: string
        g2: string
    }
    disabled?: boolean
}

export function ExportPeopleScopeControls({
    scope,
    onScopeChange,
    labels,
    disabled = false,
}: Readonly<ExportPeopleScopeControlsProps>) {
    return (
        <div className="space-y-3" data-testid={EXPORT_PEOPLE_SCOPE_TEST_ID}>
            <p className="text-xs font-semibold text-muted-foreground">{labels.label}</p>
            <div
                className="grid grid-cols-2 gap-2 rounded-2xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1.5"
                role="tablist"
                aria-label={labels.label}
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={scope === 'all'}
                    disabled={disabled}
                    data-testid="ofrenda-export-people-all"
                    onClick={() => onScopeChange('all')}
                    className={`min-h-[44px] rounded-xl px-3 py-2.5 text-sm font-bold transition-colors touch-manipulation disabled:opacity-50 ${
                        scope === 'all'
                            ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]'
                            : 'text-slate-500 hover:text-[#1f2e85] hover:bg-white/60'
                    }`}
                >
                    {labels.all}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={scope === 'g2'}
                    disabled={disabled}
                    data-testid="ofrenda-export-people-g2"
                    onClick={() => onScopeChange('g2')}
                    className={`min-h-[44px] rounded-xl px-3 py-2.5 text-sm font-bold transition-colors touch-manipulation disabled:opacity-50 ${
                        scope === 'g2'
                            ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]'
                            : 'text-slate-500 hover:text-[#1f2e85] hover:bg-white/60'
                    }`}
                >
                    {labels.g2}
                </button>
            </div>
        </div>
    )
}
