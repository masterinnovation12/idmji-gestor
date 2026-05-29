'use client'

import { useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { interpolate } from './ofrendaLocale'

export interface DesktopWeekNavigatorProps {
    weeksCount: number
    currentWeekIndex: number
    onWeekSelect: (index: number) => void
    weekRangeLabels: string[]
}

export function DesktopWeekNavigator({
    weeksCount,
    currentWeekIndex,
    onWeekSelect,
    weekRangeLabels,
}: Readonly<DesktopWeekNavigatorProps>) {
    const { t } = useI18n()

    const go = useCallback(
        (delta: number) => {
            onWeekSelect(Math.min(weeksCount - 1, Math.max(0, currentWeekIndex + delta)))
        },
        [currentWeekIndex, weeksCount, onWeekSelect],
    )

    if (weeksCount <= 1) return null

    return (
        <div
            className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[rgba(184,150,74,0.2)] bg-gradient-to-r from-[#1f2e85]/[0.06] via-white/80 to-[#1f2e85]/[0.04] dark:from-[#1f2e85]/20 dark:via-background dark:to-[#1f2e85]/10"
            data-testid="ofrenda-desktop-week-nav"
        >
            <button
                type="button"
                onClick={() => go(-1)}
                disabled={currentWeekIndex === 0}
                className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label={t('ofrenda.week.prev')}
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex flex-1 items-center justify-center gap-2 flex-wrap">
                {Array.from({ length: weeksCount }, (_, i) => i).map((i) => {
                    const active = i === currentWeekIndex
                    return (
                        <button
                            key={`desktop-week-${i + 1}`}
                            type="button"
                            data-testid={`ofrenda-desktop-week-${i + 1}`}
                            onClick={() => onWeekSelect(i)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all touch-manipulation border ${
                                active
                                    ? 'bg-[#1f2e85] text-[#e8d9a8] border-[#b8964a]/50 shadow-sm'
                                    : 'bg-background text-muted-foreground border-border/60 hover:border-[#b8964a]/40 hover:text-foreground'
                            }`}
                            aria-current={active ? 'true' : undefined}
                            aria-label={interpolate(t('ofrenda.week.of'), {
                                current: i + 1,
                                total: weeksCount,
                            })}
                        >
                            <span className="block">{interpolate(t('ofrenda.week.short'), { n: i + 1 })}</span>
                            {weekRangeLabels[i] ? (
                                <span
                                    className={`block text-[10px] font-medium mt-0.5 ${
                                        active ? 'text-[#e8d9a8]/85' : 'text-muted-foreground'
                                    }`}
                                >
                                    {weekRangeLabels[i]}
                                </span>
                            ) : null}
                        </button>
                    )
                })}
            </div>

            <button
                type="button"
                onClick={() => go(1)}
                disabled={currentWeekIndex >= weeksCount - 1}
                className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label={t('ofrenda.week.next')}
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    )
}
