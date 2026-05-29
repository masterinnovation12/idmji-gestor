/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OfrendaLiquidShell } from './OfrendaLiquidShell'
import { resetOfrendaScrollLockForTests } from './ofrendaScrollLock'
import { resetOfrendaMqCacheForTests } from './ofrendaViewport'

function mockViewport(desktop: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: query.includes('max-width: 1023px') ? !desktop : desktop,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    })
}

describe('OfrendaLiquidShell — viewport', () => {
    beforeEach(() => {
        resetOfrendaScrollLockForTests()
        resetOfrendaMqCacheForTests()
        mockViewport(true)
        document.documentElement.classList.add('dark')
        Object.defineProperty(window, 'scrollY', { value: 800, writable: true, configurable: true })
    })

    afterEach(() => {
        resetOfrendaScrollLockForTests()
        document.documentElement.classList.remove('dark')
        document.body.style.position = ''
        document.body.style.top = ''
    })

    it('monta capa fixed inset-0 en body (visible sin bajar la página)', () => {
        render(
            <OfrendaLiquidShell
                open
                onClose={vi.fn()}
                ariaLabel="Test modal"
                title="Título"
                headline="Cabecera"
                testIdPrefix="ofrenda-test"
            >
                <p>Contenido</p>
            </OfrendaLiquidShell>,
        )

        const root = screen.getByTestId('ofrenda-test-root')
        expect(root).toHaveClass('ofrenda-liquid-root')
        expect(document.body.contains(root)).toBe(true)

        expect(root).toHaveStyle({ position: 'fixed' })
        expect(root.parentElement).toBe(document.body)

        expect(screen.getByRole('dialog', { name: 'Test modal' })).toBeInTheDocument()
        expect(document.body.style.position).toBe('fixed')
    })

    it('panel centrado en desktop', () => {
        render(
            <OfrendaLiquidShell
                open
                onClose={vi.fn()}
                ariaLabel="Panel test"
                title="Título"
                headline="Cabecera"
                panelSize="sm"
                testIdPrefix="ofrenda-seq"
            >
                <p>Secuencia</p>
            </OfrendaLiquidShell>,
        )

        const stage = document.querySelector('.ofrenda-liquid-root__stage--panel')
        expect(stage).toBeTruthy()
        expect(screen.getByTestId('ofrenda-seq-panel')).toBeInTheDocument()
    })

    it('sheet al pie del viewport en móvil', () => {
        mockViewport(false)
        render(
            <OfrendaLiquidShell
                open
                onClose={vi.fn()}
                ariaLabel="Sheet test"
                title="Título"
                headline="Cabecera"
                testIdPrefix="ofrenda-mob"
            >
                <p>Móvil</p>
            </OfrendaLiquidShell>,
        )

        const stage = document.querySelector('.ofrenda-liquid-root__stage--sheet')
        expect(stage).toBeTruthy()
        expect(screen.getByTestId('ofrenda-mob-sheet')).toBeInTheDocument()

        expect(screen.getByRole('dialog', { name: 'Sheet test' })).toBeInTheDocument()
        expect(document.querySelector('.ofrenda-liquid-root__stage--sheet')).toBeTruthy()
    })
})
