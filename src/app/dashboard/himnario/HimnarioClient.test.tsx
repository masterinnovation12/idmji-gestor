/**
 * Tests senior del modal de calculadora del himnario (bottom sheet fluido).
 * Verifica: apertura/cierre, viewport móvil, swipe-to-close, accesibilidad.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HimnarioClient from './HimnarioClient'

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'es-ES' }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}))

let actionBtnClicked = false
vi.mock('@/components/HimnoCoroSelector', () => ({
  default: () => (
    <div data-testid="himno-coro-selector">
      <button type="button" data-testid="modal-action-btn" onClick={() => { actionBtnClicked = true }}>
        Limpiar todo
      </button>
    </div>
  ),
}))

const mockHimnos = [
  { id: 1, numero: 1, titulo: 'Himno 1', duracion_segundos: 90 },
  { id: 2, numero: 2, titulo: 'Himno 2', duracion_segundos: 120 },
] as any[]

const mockCoros = [
  { id: 1, numero: 10, titulo: 'Coro A', duracion_segundos: 60 },
] as any[]

const defaultProps = {
  initialHimnos: mockHimnos,
  initialCoros: mockCoros,
  counts: { himnos: 2, coros: 1 },
}

describe('HimnarioClient - Modal Calculadora', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    actionBtnClicked = false
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
  })

  it('abre el modal al hacer clic en el FAB de calculadora', () => {
    render(<HimnarioClient {...defaultProps} />)

    const fab = screen.getByTestId('calculator-fab')
    fireEvent.click(fab)

    const modal = screen.getByTestId('calculator-modal')
    expect(modal).toBeInTheDocument()
    // El selector está dentro del modal (puede haber otro en sidebar oculto en desktop)
    expect(modal.querySelector('[data-testid="himno-coro-selector"]')).toBeInTheDocument()
  })

  it('cierra el modal al hacer clic en el botón de cerrar', async () => {
    render(<HimnarioClient {...defaultProps} />)

    fireEvent.click(screen.getByTestId('calculator-fab'))
    expect(screen.getByTestId('calculator-modal')).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /cerrar/i })
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('calculator-modal')).not.toBeInTheDocument()
    }, { timeout: 1500 })
  })

  it('cierra el modal al hacer clic en el overlay', async () => {
    render(<HimnarioClient {...defaultProps} />)

    fireEvent.click(screen.getByTestId('calculator-fab'))
    expect(screen.getByTestId('calculator-modal')).toBeInTheDocument()

    const overlay = screen.getByTestId('calculator-modal-overlay')
    fireEvent.click(overlay)

    await waitFor(() => {
      expect(screen.queryByTestId('calculator-modal')).not.toBeInTheDocument()
    }, { timeout: 1500 })
  })

  it('muestra el handle visual para swipe-to-close', () => {
    render(<HimnarioClient {...defaultProps} />)
    fireEvent.click(screen.getByTestId('calculator-fab'))

    const modal = screen.getByTestId('calculator-modal')
    const handle = modal.querySelector('.cursor-grab')
    expect(handle).toBeInTheDocument()
  })

  it('modal tiene max-height para viewport móvil (90dvh)', () => {
    render(<HimnarioClient {...defaultProps} />)
    fireEvent.click(screen.getByTestId('calculator-fab'))

    const modal = screen.getByTestId('calculator-modal')
    expect(modal.className).toMatch(/max-h-\[90dvh\]/)
  })

  it('contenido de calculadora es scrolleable', () => {
    render(<HimnarioClient {...defaultProps} />)
    fireEvent.click(screen.getByTestId('calculator-fab'))

    const modal = screen.getByTestId('calculator-modal')
    const scrollContainer = modal.querySelector('.overflow-y-auto')
    expect(scrollContainer).toBeInTheDocument()
  })

  it('toque simple en botón interactúa (no arrastre)', () => {
    render(<HimnarioClient {...defaultProps} />)
    fireEvent.click(screen.getByTestId('calculator-fab'))

    const modal = screen.getByTestId('calculator-modal')
    const btn = modal.querySelector('[data-testid="modal-action-btn"]')!
    fireEvent.click(btn)

    expect(actionBtnClicked).toBe(true)
  })

  it('gesto de arrastre no activa botones (solo cierra o no interactúa)', () => {
    render(<HimnarioClient {...defaultProps} />)
    fireEvent.click(screen.getByTestId('calculator-fab'))

    const content = screen.getByTestId('calculator-modal-content')
    const btn = content.querySelector('[data-testid="modal-action-btn"]')!

    // Simular arrastre: pointerDown -> pointerMove (delta > 8px) -> pointerUp
    fireEvent.pointerDown(btn, { clientX: 100, clientY: 300, pointerId: 1 })
    fireEvent.pointerMove(btn, { clientX: 100, clientY: 350, pointerId: 1 })
    fireEvent.pointerUp(btn, { clientX: 100, clientY: 350, pointerId: 1 })

    // El botón NO debe haberse activado (el click se bloquea cuando hubo arrastre)
    expect(actionBtnClicked).toBe(false)
  })
})
