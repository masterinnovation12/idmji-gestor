'use client'

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { interpolate } from './ofrendaLocale'
import { useWeekSwipe } from './useWeekSwipe'

export interface MobileWeekPagerProps {
    weeksCount: number
    currentPage: number
    onPageChange: (page: number) => void
    weekLabel: string
    weekRangeLabel?: string | null
    children: React.ReactNode
}

export function MobileWeekPager({
    weeksCount,
    currentPage,
    onPageChange,
    weekLabel,
    weekRangeLabel,
    children,
}: Readonly<MobileWeekPagerProps>) {
    const { t } = useI18n()
    const [direction, setDirection] = useState(0)

    const goToPage = useCallback(
        (next: number) => {
            if (next === currentPage) return
            setDirection(next > currentPage ? 1 : -1)
            onPageChange(next)
        },
        [currentPage, onPageChange],
    )

    const { containerRef, dragX, isDragging, edgeGlow, handlers } = useWeekSwipe({
        currentPage,
        weeksCount,
        onPageChange: goToPage,
        enabled: weeksCount > 1,
    })

    const atStart = currentPage === 0
    const atEnd = currentPage >= weeksCount - 1

    return (
        <div className="space-y-3" data-testid="ofrenda-mobile-week-pager">
            {/* Navegación */}
            <div className="flex items-center justify-between gap-2 bg-muted/30 rounded-2xl px-3 py-2 border border-border/50 shadow-sm">
                <button
                    type="button"
                    onClick={() => goToPage(Math.max(0, currentPage - 1))}
                    disabled={atStart}
                    className="p-2.5 rounded-xl hover:bg-muted disabled:opacity-30 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center transition-opacity"
                    aria-label={t('ofrenda.week.prev')}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 text-center min-w-0 px-1">
                    <p className="text-sm font-bold truncate">{weekLabel}</p>
                    {weekRangeLabel ? (
                        <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                            {weekRangeLabel}
                        </p>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => goToPage(Math.min(weeksCount - 1, currentPage + 1))}
                    disabled={atEnd}
                    className="p-2.5 rounded-xl hover:bg-muted disabled:opacity-30 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center transition-opacity"
                    aria-label={t('ofrenda.week.next')}
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Área swipe */}
            <div
                ref={containerRef}
                data-testid="ofrenda-week-swipe-area"
                className="relative select-none touch-manipulation"
                aria-roledescription="carousel"
                aria-label={weekLabel}
                {...handlers}
            >
                {edgeGlow === 'start' && (
                    <div
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-linear-to-r from-amber-500/20 to-transparent"
                        aria-hidden
                        data-testid="ofrenda-week-edge-start"
                    />
                )}
                {edgeGlow === 'end' && (
                    <div
                        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-linear-to-l from-amber-500/20 to-transparent"
                        aria-hidden
                        data-testid="ofrenda-week-edge-end"
                    />
                )}

                <motion.div
                    className="will-change-transform"
                    style={{ x: isDragging ? dragX : 0 }}
                    transition={
                        isDragging
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 420, damping: 34 }
                    }
                >
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentPage}
                            custom={direction}
                            initial={isDragging ? false : 'enter'}
                            animate="center"
                            exit={isDragging ? undefined : 'exit'}
                            variants={{
                                enter: (d: number) => ({
                                    opacity: 0,
                                    x: (d >= 0 ? 1 : -1) * 32,
                                }),
                                center: { opacity: 1, x: 0 },
                                exit: (d: number) => ({
                                    opacity: 0,
                                    x: (d >= 0 ? -1 : 1) * 32,
                                }),
                            }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="space-y-3"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>

                {weeksCount > 1 && (
                    <p className="text-center text-[10px] text-muted-foreground/80 pt-2 font-medium">
                        {t('ofrenda.week.swipeHint')}
                    </p>
                )}
            </div>

            {/* Indicadores */}
            <div className="flex justify-center gap-1.5" role="tablist" aria-label={weekLabel}>
                {Array.from({ length: weeksCount }, (_, i) => i).map((i) => (
                    <button
                        key={`semana-dot-${i + 1}`}
                        type="button"
                        role="tab"
                        aria-selected={i === currentPage}
                        onClick={() => goToPage(i)}
                        className={`h-2 rounded-full transition-all touch-manipulation min-w-[8px] min-h-[8px] ${
                            i === currentPage ? 'bg-emerald-500 w-6' : 'bg-border w-2 hover:bg-muted-foreground/40'
                        }`}
                        aria-label={interpolate(t('ofrenda.week.of'), {
                            current: i + 1,
                            total: weeksCount,
                        })}
                    />
                ))}
            </div>

            <div className="sr-only" aria-live="polite" aria-atomic="true">
                {weekLabel}
                {weekRangeLabel ? ` — ${weekRangeLabel}` : ''}
            </div>
        </div>
    )
}
