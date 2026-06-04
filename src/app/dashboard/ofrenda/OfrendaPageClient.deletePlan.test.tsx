/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeletePlanButton } from './OfrendaPageClient'
import { OFRENDA_MOBILE_TABLET_MQ, resetOfrendaMqCacheForTests } from './ofrendaViewport'

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'ofrenda.deletePlan': 'Eliminar plan',
                'ofrenda.deletePlan.confirm': '¿Eliminar plan de {month}?',
                'ofrenda.deletePlan.yes': 'Sí, eliminar',
                'ofrenda.deletePlan.no': 'Cancelar',
            }
            return map[key] ?? key
        },
        language: 'es',
    }),
}))

vi.mock('framer-motion', () => ({
    motion: {
        button: ({
            children,
            whileTap: _w,
            ...p
        }: React.PropsWithChildren<Record<string, unknown>>) => (
            <button type="button" {...p}>
                {children}
            </button>
        ),
    },
}))

function mockMobile() {
    resetOfrendaMqCacheForTests()
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation(() => ({
            matches: true,
            media: OFRENDA_MOBILE_TABLET_MQ,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    })
}

describe('DeletePlanButton — móvil', () => {
    beforeEach(() => {
        mockMobile()
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 })
    })

    afterEach(() => resetOfrendaMqCacheForTests())

    it('al confirmar, muestra mensaje legible y botones Sí/Cancelar en grid', () => {
        render(
            <DeletePlanButton
                tituloMes="Julio 2026"
                isLoading={false}
                onConfirm={vi.fn()}
            />,
        )

        fireEvent.click(screen.getByTestId('ofrenda-delete-plan-btn'))

        const dialog = screen.getByTestId('ofrenda-delete-plan-confirm')
        expect(dialog).toHaveAttribute('role', 'alertdialog')
        expect(screen.getByText(/Julio 2026/)).toBeInTheDocument()

        const yes = screen.getByText('Sí, eliminar')
        const no = screen.getByText('Cancelar')
        expect(yes).toHaveClass('min-h-[48px]')
        expect(no).toHaveClass('min-h-[48px]')
        expect(dialog.querySelector('.grid-cols-2')).toBeTruthy()
    })
})
