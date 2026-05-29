/**
 * @vitest-environment happy-dom
 * QA: feedback premium (liquid shell) reemplaza Sonner en Labor Ofrenda.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import {
    OfrendaFeedbackProvider,
    OFRENDA_FEEDBACK_DURATION,
    OFRENDA_FEEDBACK_OPEN_DELAY_MS,
    useOfrendaToast,
} from './ofrendaFeedback'
import { resetOfrendaScrollLockForTests } from './ofrendaScrollLock'

vi.mock('sonner', () => ({
    toast: { dismiss: vi.fn() },
}))

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'ofrenda.feedback.success': 'Completado',
                'ofrenda.feedback.warning': 'Atención',
                'ofrenda.feedback.error': 'Error',
                'ofrenda.feedback.ok': 'Entendido',
            }
            return map[key] ?? key
        },
        language: 'es',
    }),
}))

function mockViewport(mobile: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: query.includes('max-width: 1023px') ? mobile : !mobile,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    })
}

function Trigger({
    variant,
    title,
    description,
    duration,
}: Readonly<{
    variant: 'success' | 'warning' | 'error'
    title: string
    description?: string
    duration?: number
}>) {
    const feedback = useOfrendaToast()
    return (
        <button
            type="button"
            onClick={() => {
                if (variant === 'success') feedback.success(title, description, duration)
                else if (variant === 'warning') feedback.warning(title, description, duration)
                else feedback.error(title, description, duration)
            }}
        >
            Mostrar
        </button>
    )
}

function DismissButton() {
    const { dismiss } = useOfrendaToast()
    return (
        <button type="button" onClick={dismiss}>
            Cerrar feedback
        </button>
    )
}

describe('OfrendaFeedbackProvider', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        resetOfrendaScrollLockForTests()
        mockViewport(true)
        Object.defineProperty(window, 'scrollY', { value: 400, writable: true, configurable: true })
    })

    afterEach(() => {
        vi.useRealTimers()
        resetOfrendaScrollLockForTests()
        document.body.style.position = ''
        document.body.style.top = ''
    })

    it('muestra modal liquid con título, descripción y categoría (warning)', () => {
        render(
            <OfrendaFeedbackProvider>
                <Trigger
                    variant="warning"
                    title="Alejandro Pérez desactivado"
                    description="No recibirá asignaciones hasta reactivarse."
                />
            </OfrendaFeedbackProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
        act(() => {
            vi.advanceTimersByTime(OFRENDA_FEEDBACK_OPEN_DELAY_MS)
        })

        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Atención')).toBeInTheDocument()
        expect(screen.getByText('Alejandro Pérez desactivado')).toBeInTheDocument()
        expect(
            screen.getByText('No recibirá asignaciones hasta reactivarse.'),
        ).toBeInTheDocument()
        expect(screen.getByTestId('ofrenda-feedback-root')).toHaveClass('ofrenda-liquid-root')
        expect(document.body.style.position).toBe('fixed')
    })

    it('cierra al pulsar Entendido y libera scroll', () => {
        render(
            <OfrendaFeedbackProvider>
                <Trigger variant="success" title="Plan generado" description="Listo." duration={0} />
            </OfrendaFeedbackProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
        fireEvent.click(screen.getByTestId('ofrenda-feedback-ok'))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(document.body.style.position).toBe('')
    })

    it('auto-cierra tras duration personalizada', () => {
        render(
            <OfrendaFeedbackProvider>
                <Trigger variant="success" title="OK" description="Listo" duration={2000} />
            </OfrendaFeedbackProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
        expect(screen.getByRole('dialog')).toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(2100)
        })
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('planSuccess permanece ~6s y no cierra antes', () => {
        function PlanOk() {
            const { planSuccess } = useOfrendaToast()
            return (
                <button
                    type="button"
                    onClick={() => planSuccess('Sacos actualizados', 'Secuencias recalculadas')}
                >
                    Plan OK
                </button>
            )
        }
        render(
            <OfrendaFeedbackProvider>
                <PlanOk />
            </OfrendaFeedbackProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Plan OK' }))
        act(() => {
            vi.advanceTimersByTime(OFRENDA_FEEDBACK_OPEN_DELAY_MS)
        })
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByTestId('ofrenda-feedback-ok')).toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(OFRENDA_FEEDBACK_DURATION.plan.success - 200)
        })
        expect(screen.getByRole('dialog')).toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(250)
        })
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('quickWarning (= planWarning) cierra en ~5.5 s', () => {
        function QuickWarn() {
            const { quickWarning } = useOfrendaToast()
            return (
                <button type="button" onClick={() => quickWarning('Desactivado', 'Sin asignaciones')}>
                    Toggle
                </button>
            )
        }
        render(
            <OfrendaFeedbackProvider>
                <QuickWarn />
            </OfrendaFeedbackProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Toggle' }))
        act(() => {
            vi.advanceTimersByTime(OFRENDA_FEEDBACK_OPEN_DELAY_MS)
        })
        expect(screen.getByRole('dialog')).toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(OFRENDA_FEEDBACK_DURATION.plan.warning - 200)
        })
        expect(screen.getByRole('dialog')).toBeInTheDocument()

        act(() => {
            vi.advanceTimersByTime(250)
        })
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('planError permanece hasta Entendido (sin auto-cierre)', () => {
        function PlanErr() {
            const { planError } = useOfrendaToast()
            return (
                <button type="button" onClick={() => planError('Error al exportar', 'Reintenta')}>
                    Err
                </button>
            )
        }
        render(
            <OfrendaFeedbackProvider>
                <PlanErr />
            </OfrendaFeedbackProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Err' }))
        act(() => {
            vi.advanceTimersByTime(OFRENDA_FEEDBACK_OPEN_DELAY_MS + 10_000)
        })
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        fireEvent.click(screen.getByTestId('ofrenda-feedback-ok'))
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('dismiss() cierra el modal activo', () => {
        render(
            <OfrendaFeedbackProvider>
                <Trigger variant="error" title="Error" description="Detalle" duration={0} />
                <DismissButton />
            </OfrendaFeedbackProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar feedback' }))
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('useOfrendaToast lanza fuera del provider', () => {
        const Bad = () => {
            useOfrendaToast()
            return null
        }
        expect(() => render(<Bad />)).toThrow(/OfrendaFeedbackProvider/)
    })

    it('variante error muestra etiqueta Error en cabecera', () => {
        render(
            <OfrendaFeedbackProvider>
                <Trigger variant="error" title="Error al exportar" description="Reintenta." duration={0} />
            </OfrendaFeedbackProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.queryByText('Completado')).not.toBeInTheDocument()
    })
})
