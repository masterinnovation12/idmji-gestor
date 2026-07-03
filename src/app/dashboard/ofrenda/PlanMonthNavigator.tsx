'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface PlanMonthNavigatorProps {
    title: string
    isLoading?: boolean
    onPrev: () => void
    onNext: () => void
    prevAriaLabel: string
    nextAriaLabel: string
}

/** Barra de mes centrada (mismo patrón que el paginador de semanas en móvil). */
export function PlanMonthNavigator({
    title,
    isLoading = false,
    onPrev,
    onNext,
    prevAriaLabel,
    nextAriaLabel,
}: Readonly<PlanMonthNavigatorProps>) {
    return (
        <div
            className="ofrenda-liquid-nav flex w-full items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3"
            data-testid="ofrenda-month-nav"
        >
            <button
                type="button"
                onClick={onPrev}
                disabled={isLoading}
                aria-label={prevAriaLabel}
                className="ofrenda-liquid-nav-arrow shrink-0 p-2.5 transition-colors disabled:opacity-50 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <h2
                className="flex-1 min-w-0 text-center text-lg sm:text-xl font-black tracking-tight px-1 text-[#1f2e85]"
                data-testid="ofrenda-month-title"
                suppressHydrationWarning
            >
                {isLoading ? (
                    <span
                        className="mx-auto inline-block w-32 max-w-full h-6 bg-[#1f2e85]/10 animate-pulse rounded-lg"
                        data-testid="ofrenda-month-title-skeleton"
                    />
                ) : (
                    <span className="block truncate" suppressHydrationWarning>{title}</span>
                )}
            </h2>

            <button
                type="button"
                onClick={onNext}
                disabled={isLoading}
                aria-label={nextAriaLabel}
                className="ofrenda-liquid-nav-arrow shrink-0 p-2.5 transition-colors disabled:opacity-50 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    )
}
