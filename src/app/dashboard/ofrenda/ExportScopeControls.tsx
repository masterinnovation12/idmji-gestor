'use client'

import type { OfrServicio } from './actions'

export type ExportScope = 'month' | 'week'

interface ExportScopeControlsProps {
    scope: ExportScope
    onScopeChange: (scope: ExportScope) => void
    weekIndex: number
    weeks: OfrServicio[][]
    weekRangeLabels: string[]
    onWeekChange: (index: number) => void
    labels: {
        scopeMonth: string
        scopeWeek: string
        weekPicker: string
        weekChip: (n: number, total: number) => string
    }
    disabled?: boolean
}

export function ExportScopeControls({
    scope,
    onScopeChange,
    weekIndex,
    weeks,
    weekRangeLabels,
    onWeekChange,
    labels,
    disabled = false,
}: Readonly<ExportScopeControlsProps>) {
    return (
        <div className="space-y-3" data-testid="ofrenda-export-scope">
            <p className="text-xs font-semibold text-muted-foreground">{labels.weekPicker}</p>
            <div
                className="grid grid-cols-2 gap-2 rounded-2xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1.5"
                role="tablist"
                aria-label={labels.weekPicker}
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={scope === 'month'}
                    disabled={disabled}
                    data-testid="ofrenda-export-scope-month"
                    onClick={() => onScopeChange('month')}
                    className={`min-h-[44px] rounded-xl px-3 py-2.5 text-sm font-bold transition-colors touch-manipulation disabled:opacity-50 ${
                        scope === 'month'
                            ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]'
                            : 'text-slate-500 hover:text-[#1f2e85] hover:bg-white/60'
                    }`}
                >
                    {labels.scopeMonth}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={scope === 'week'}
                    disabled={disabled}
                    data-testid="ofrenda-export-scope-week"
                    onClick={() => onScopeChange('week')}
                    className={`min-h-[44px] rounded-xl px-3 py-2.5 text-sm font-bold transition-colors touch-manipulation disabled:opacity-50 ${
                        scope === 'week'
                            ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]'
                            : 'text-slate-500 hover:text-[#1f2e85] hover:bg-white/60'
                    }`}
                >
                    {labels.scopeWeek}
                </button>
            </div>

            {scope === 'week' && weeks.length > 0 && (
                <div
                    className="flex flex-wrap gap-2"
                    role="tablist"
                    aria-label={labels.scopeWeek}
                    data-testid="ofrenda-export-week-picker"
                >
                    {weeks.map((_, i) => {
                        const active = i === weekIndex
                        const range = weekRangeLabels[i]
                        return (
                            <button
                                key={`export-week-${i + 1}`}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                disabled={disabled}
                                data-testid={`ofrenda-export-week-${i + 1}`}
                                onClick={() => onWeekChange(i)}
                                className={`min-h-[44px] min-w-[44px] flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none rounded-xl border px-3 py-2 text-left transition-colors touch-manipulation disabled:opacity-50 ${
                                    active
                                        ? 'border-[#b8964a] bg-[#1f2e85]/10 ring-2 ring-[#b8964a]/30'
                                        : 'border-[rgba(184,150,74,0.3)] bg-white hover:bg-[#f8f3e8]'
                                }`}
                            >
                                <span className="block text-xs font-black text-[#1f2e85] dark:text-[#e8d9a8]">
                                    {labels.weekChip(i + 1, weeks.length)}
                                </span>
                                {range ? (
                                    <span className="block text-[10px] font-semibold text-muted-foreground truncate">
                                        {range}
                                    </span>
                                ) : null}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
