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
                className="grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-muted/20 p-1"
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
                            ? 'bg-[#1f2e85] text-white shadow-sm'
                            : 'text-muted-foreground hover:bg-muted/60'
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
                            ? 'bg-[#1f2e85] text-white shadow-sm'
                            : 'text-muted-foreground hover:bg-muted/60'
                    }`}
                >
                    {labels.g2}
                </button>
            </div>
        </div>
    )
}
