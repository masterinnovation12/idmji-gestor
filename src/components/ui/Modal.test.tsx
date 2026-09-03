/**
 * @vitest-environment happy-dom
 */
import { useState, type HTMLAttributes, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Modal } from './Modal'

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('framer-motion', () => ({
    motion: {
        div: ({
            children,
            onMouseDown,
            onClick,
            ...props
        }: HTMLAttributes<HTMLDivElement> & { initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown }) => (
            <div onMouseDown={onMouseDown} onClick={onClick} {...props}>{children}</div>
        ),
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

describe('Modal', () => {
    it('al abrir, el foco va al input marcado y se puede escribir sin pulsar otra vez', async () => {
        render(
            <div>
                <button type="button">Añadir lectura</button>
                <Modal isOpen onClose={() => undefined} title="Lectura">
                    <input data-modal-autofocus data-testid="bible-search-input" placeholder="buscar" />
                </Modal>
            </div>,
        )
        const trigger = screen.getByRole('button', { name: 'Añadir lectura' })
        trigger.focus()
        expect(trigger).toHaveFocus()

        await waitFor(() => {
            expect(screen.getByTestId('bible-search-input')).toHaveFocus()
        })

        fireEvent.change(screen.getByTestId('bible-search-input'), { target: { value: 'Mateo' } })
        expect(screen.getByTestId('bible-search-input')).toHaveValue('Mateo')
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('un onClose nuevo (re-render del dashboard) no devuelve el foco al disparador', async () => {
        function Harness() {
            const [tick, setTick] = useState(0)
            return (
                <div>
                    <button type="button">Añadir lectura</button>
                    <button type="button" onClick={() => setTick((n) => n + 1)}>tick {tick}</button>
                    <Modal isOpen onClose={() => { void tick }} title="Lectura">
                        <input data-modal-autofocus data-testid="bible-search-input" />
                    </Modal>
                </div>
            )
        }
        render(<Harness />)
        await waitFor(() => {
            expect(screen.getByTestId('bible-search-input')).toHaveFocus()
        })
        fireEvent.click(screen.getByRole('button', { name: /tick/ }))
        expect(screen.getByTestId('bible-search-input')).toHaveFocus()
    })

    it('Escape cierra el modal', async () => {
        const onClose = vi.fn()
        render(
            <Modal isOpen onClose={onClose} title="Lectura">
                <input data-modal-autofocus />
            </Modal>,
        )
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
        await act(async () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        })
        expect(onClose).toHaveBeenCalled()
    })
})
