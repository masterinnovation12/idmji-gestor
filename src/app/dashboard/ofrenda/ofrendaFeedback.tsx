'use client'

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { TranslationKey } from '@/lib/i18n/types'
import { OfrendaLiquidShell, type OfrendaLiquidAccent } from './OfrendaLiquidShell'

export type OfrendaFeedbackVariant = 'success' | 'warning' | 'error'

export interface OfrendaFeedbackPayload {
    variant: OfrendaFeedbackVariant
    title: string
    description?: string
    /** ms; 0 = solo cierre manual con «Entendido» */
    duration?: number
    /** Retrasa la apertura (evita que el mismo clic que guardó cierre el modal). */
    openDelayMs?: number
}

interface OfrendaFeedbackContextValue {
    show: (payload: OfrendaFeedbackPayload) => void
    dismiss: () => void
    /** API genérica; en Labor Ofrenda usar preferentemente plan* / quick* (mismo estándar). */
    success: (title: string, description?: string, duration?: number) => void
    warning: (title: string, description?: string, duration?: number) => void
    error: (title: string, description?: string, duration?: number) => void
    /** Mismo estándar premium que plan* (6 s / manual, sin cierre por backdrop). */
    quickSuccess: (title: string, description?: string) => void
    quickWarning: (title: string, description?: string, duration?: number) => void
    quickError: (title: string, description?: string) => void
    planSuccess: (title: string, description?: string) => void
    planWarning: (title: string, description?: string, duration?: number) => void
    planError: (title: string, description?: string) => void
}

const OfrendaFeedbackContext = createContext<OfrendaFeedbackContextValue | null>(null)

/**
 * Estándar único de notificaciones en Labor Ofrenda:
 * - Modal liquid con «Entendido» y X (sin cierre al tocar el fondo).
 * - Retraso breve al abrir tras un botón.
 * - Éxito/aviso: ~6 s; errores y avisos críticos (duration 0): solo cierre manual.
 */
export const OFRENDA_FEEDBACK_DURATION = {
    /** @deprecated Usar `plan`; se mantiene por tests legacy. */
    normal: { success: 1800, warning: 2000, error: 4200 },
    /** @deprecated Alias histórico; quick* ahora usa `plan`. */
    quick: { success: 1200, warning: 1400, error: 3600 },
    plan: { success: 6000, warning: 5500, error: 0 },
} as const

export const OFRENDA_FEEDBACK_OPEN_DELAY_MS = 120

const VARIANT_META: Record<
    OfrendaFeedbackVariant,
    { accent: OfrendaLiquidAccent; labelKey: TranslationKey; Icon: typeof CheckCircle2; iconClass: string }
> = {
    success: {
        accent: 'emerald',
        labelKey: 'ofrenda.feedback.success',
        Icon: CheckCircle2,
        iconClass: 'text-emerald-600',
    },
    warning: {
        accent: 'gold',
        labelKey: 'ofrenda.feedback.warning',
        Icon: AlertTriangle,
        iconClass: 'text-amber-600',
    },
    error: {
        accent: 'gold',
        labelKey: 'ofrenda.feedback.error',
        Icon: XCircle,
        iconClass: 'text-red-600',
    },
}

export function buildOfrendaFeedbackPayload(
    variant: OfrendaFeedbackVariant,
    title: string,
    description?: string,
    duration?: number,
    options?: { skipOpenDelay?: boolean },
): OfrendaFeedbackPayload {
    return {
        variant,
        title,
        description,
        duration: duration ?? OFRENDA_FEEDBACK_DURATION.plan[variant],
        openDelayMs: options?.skipOpenDelay ? undefined : OFRENDA_FEEDBACK_OPEN_DELAY_MS,
    }
}

function OfrendaFeedbackHost({
    feedback,
    onClose,
}: Readonly<{
    feedback: OfrendaFeedbackPayload | null
    onClose: () => void
}>) {
    const { t } = useI18n()

    if (!feedback) return null

    const meta = VARIANT_META[feedback.variant]
    const Icon = meta.Icon

    return (
        <OfrendaLiquidShell
            open
            onClose={onClose}
            closeOnBackdropClick={false}
            ariaLabel={feedback.title}
            title={t(meta.labelKey)}
            headline={feedback.title}
            accent={meta.accent}
            panelSize="sm"
            testIdPrefix="ofrenda-feedback"
            closeLabel={t('ofrenda.feedback.ok')}
            footer={
                <button
                    type="button"
                    onClick={onClose}
                    className="ofrenda-liquid-btn-primary w-full"
                    data-testid="ofrenda-feedback-ok"
                >
                    {t('ofrenda.feedback.ok')}
                </button>
            }
        >
            <div className="flex items-start gap-3">
                <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(184,150,74,0.35)] bg-gradient-to-br from-[#f8f3e8] to-white ${meta.iconClass}`}
                    aria-hidden
                >
                    <Icon className="h-6 w-6" />
                </span>
                <p className="pt-1 text-sm leading-relaxed text-slate-700">
                    {feedback.description ?? feedback.title}
                </p>
            </div>
        </OfrendaLiquidShell>
    )
}

export function OfrendaFeedbackProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [feedback, setFeedback] = useState<OfrendaFeedbackPayload | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const openDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const dismiss = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        if (openDelayRef.current) {
            clearTimeout(openDelayRef.current)
            openDelayRef.current = null
        }
        setFeedback(null)
    }, [])

    const show = useCallback((payload: OfrendaFeedbackPayload) => {
        sonnerToast.dismiss()
        if (timerRef.current) clearTimeout(timerRef.current)
        if (openDelayRef.current) clearTimeout(openDelayRef.current)

        const openNow = () => {
            setFeedback(payload)

            const duration = payload.duration ?? OFRENDA_FEEDBACK_DURATION.plan[payload.variant]
            if (duration > 0) {
                timerRef.current = setTimeout(() => {
                    setFeedback(null)
                    timerRef.current = null
                }, duration)
            }
        }

        const delay = payload.openDelayMs ?? 0
        if (delay > 0) {
            openDelayRef.current = setTimeout(() => {
                openDelayRef.current = null
                openNow()
            }, delay)
        } else {
            openNow()
        }
    }, [])

    const planSuccess = useCallback(
        (title: string, description?: string) => {
            show(buildOfrendaFeedbackPayload('success', title, description))
        },
        [show],
    )

    const planWarning = useCallback(
        (title: string, description?: string, duration?: number) => {
            show(buildOfrendaFeedbackPayload('warning', title, description, duration))
        },
        [show],
    )

    const planError = useCallback(
        (title: string, description?: string) => {
            show(buildOfrendaFeedbackPayload('error', title, description, 0))
        },
        [show],
    )

    const value = useMemo<OfrendaFeedbackContextValue>(
        () => ({
            show,
            dismiss,
            success: (title, description, duration) =>
                show(
                    buildOfrendaFeedbackPayload('success', title, description, duration, {
                        skipOpenDelay: duration !== undefined,
                    }),
                ),
            warning: (title, description, duration) =>
                show(
                    buildOfrendaFeedbackPayload('warning', title, description, duration, {
                        skipOpenDelay: duration !== undefined,
                    }),
                ),
            error: (title, description, duration) =>
                show(
                    buildOfrendaFeedbackPayload('error', title, description, duration, {
                        skipOpenDelay: duration !== undefined,
                    }),
                ),
            quickSuccess: planSuccess,
            quickWarning: planWarning,
            quickError: planError,
            planSuccess,
            planWarning,
            planError,
        }),
        [show, dismiss, planSuccess, planWarning, planError],
    )

    return (
        <OfrendaFeedbackContext.Provider value={value}>
            {children}
            <OfrendaFeedbackHost feedback={feedback} onClose={dismiss} />
        </OfrendaFeedbackContext.Provider>
    )
}

export function useOfrendaToast(): OfrendaFeedbackContextValue {
    const ctx = useContext(OfrendaFeedbackContext)
    if (!ctx) {
        throw new Error('useOfrendaToast debe usarse dentro de OfrendaFeedbackProvider')
    }
    return ctx
}

export function useOfrendaToastOptional(): OfrendaFeedbackContextValue | null {
    return useContext(OfrendaFeedbackContext)
}
