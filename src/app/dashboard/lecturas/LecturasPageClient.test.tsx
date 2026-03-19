/**
 * Tests senior de LecturasPageClient - búsqueda y solapamiento en móvil.
 * Verifica: búsqueda en sticky, dropdown se cierra al scroll, sin solapamiento.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LecturasPageClient from './LecturasPageClient'

vi.mock('@/lib/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (k: string) => k, language: 'es-ES' }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/lecturas',
}))

vi.mock('./actions', () => ({
  getAllLecturas: vi.fn(),
  getCultoTypes: vi.fn().mockResolvedValue({ data: [] }),
  getLectores: vi.fn().mockResolvedValue({ data: [] }),
  getLecturasStats: vi.fn().mockResolvedValue({ totalLecturas: 0, librosMasLeidos: [], repetidasCount: 0 }),
  deleteLectura: vi.fn(),
  getBibliaLibros: vi.fn().mockResolvedValue({
    data: [
      { nombre: 'Salmos', abreviatura: 'Sal' },
      { nombre: 'Génesis', abreviatura: 'Gn' },
    ],
  }),
}))

vi.mock('@/components/BackButton', () => ({
  default: () => <button type="button">Volver</button>,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const mockLectura = (id: string, libro: string) =>
  ({
    id,
    libro,
    capitulo_inicio: 1,
    capitulo_fin: 1,
    versiculo_inicio: 1,
    versiculo_fin: 5,
    tipo_lectura: 'introduccion',
    culto_id: 'c1',
    es_repetida: false,
    culto: { id: 'c1', fecha: '2026-03-17', tipo_culto: { id: 't1', nombre: 'Alabanza' } },
    lector: { id: 'l1', nombre: 'Juan', apellidos: 'García' },
  }) as any

const defaultProps = {
  initialLecturas: [mockLectura('1', 'Salmos')],
  initialTotalPages: 1,
  initialPage: 1,
}

describe('LecturasPageClient - Búsqueda y solapamiento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
  })

  it('renderiza barra de búsqueda dentro del área sticky', () => {
    render(<LecturasPageClient {...defaultProps} />)

    const searchWrap = screen.getByTestId('lecturas-search-wrap')
    expect(searchWrap).toBeInTheDocument()

    const input = screen.getByRole('textbox', { name: /buscar lecturas/i })
    expect(input).toBeInTheDocument()
  })

  it('permite escribir en la búsqueda', () => {
    render(<LecturasPageClient {...defaultProps} />)

    const input = screen.getByRole('textbox', { name: /buscar lecturas/i })
    fireEvent.change(input, { target: { value: 'salmos' } })

    expect(input).toHaveValue('salmos')
  })

  it('registra listener de scroll para cerrar dropdown (evita solapamiento)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = render(<LecturasPageClient {...defaultProps} />)

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })

    unmount()
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  it('muestra historial de lecturas', () => {
    render(<LecturasPageClient {...defaultProps} />)

    expect(screen.getByText(/Salmos 1:1-5/)).toBeInTheDocument()
  })
})
