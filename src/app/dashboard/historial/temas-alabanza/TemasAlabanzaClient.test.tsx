/**
 * Tests de TemasAlabanzaClient - modal, lectura, enlace a culto.
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TemasAlabanzaClient from './TemasAlabanzaClient'

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({ t: (k: string) => k, language: 'es-ES' }),
}))

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/dashboard/historial/temas-alabanza',
}))

vi.mock('./actions', () => ({
    getAllTemasAlabanza: vi.fn(),
    getTemasAlabanzaStats: vi.fn().mockResolvedValue({ totalUsos: 0, temaMasUsado: null, hermanoMasUsaTema: null, temasPorUso: [], hermanosPorTema: {} }),
    getHermanosConTemas: vi.fn().mockResolvedValue({ data: [] }),
    getTemasAlabanzaKeys: vi.fn().mockResolvedValue(['alabanza.tema.serReverentes']),
}))

vi.mock('@/components/BackButton', () => ({
    default: () => <button type="button">Volver</button>,
}))

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const mockRegistroConLectura = {
    id: 'c1',
    culto_id: 'c1',
    fecha: '2025-03-15',
    hora_inicio: '19:00',
    tema_key: 'alabanza.tema.serReverentes',
    tipo_culto: { id: '1', nombre: 'Alabanza' },
    usuario_intro: { id: 'u1', nombre: 'Jeffrey', apellidos: 'Bolaños' },
    lectura_intro: {
        libro: 'Salmos',
        capitulo_inicio: 100,
        versiculo_inicio: 1,
        capitulo_fin: 100,
        versiculo_fin: 5,
    },
}

const mockRegistroSinLectura = {
    ...mockRegistroConLectura,
    id: 'c2',
    culto_id: 'c2',
    lectura_intro: null,
}

const defaultProps = {
    initialData: [mockRegistroConLectura],
    initialTotalPages: 1,
    initialPage: 1,
}

describe('TemasAlabanzaClient', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    })

    it('renderiza tabla con datos y columna Lectura', () => {
        render(<TemasAlabanzaClient {...defaultProps} />)

        expect(screen.getAllByText('alabanza.tema.serReverentes').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Salmos 100:1-5').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Jeffrey Bolaños').length).toBeGreaterThan(0)
    })

    it('muestra noLectura cuando no hay lectura de introducción', () => {
        render(<TemasAlabanzaClient {...defaultProps} initialData={[mockRegistroSinLectura]} />)

        expect(screen.getByText('temasAlabanza.noLectura')).toBeInTheDocument()
    })

    it('abre modal al hacer click en la fila', () => {
        render(<TemasAlabanzaClient {...defaultProps} />)

        const rows = screen.getAllByText('alabanza.tema.serReverentes')
        const row = rows[0].closest('tr')
        expect(row).toBeInTheDocument()
        fireEvent.click(row!)

        expect(screen.getAllByText('Salmos 100:1-5').length).toBeGreaterThan(0)
    })

    it('enlace al culto tiene href correcto', () => {
        render(<TemasAlabanzaClient {...defaultProps} />)

        const links = screen.getAllByRole('link')
        const cultoLink = links.find((l) => l.getAttribute('href') === '/dashboard/cultos/c1')
        expect(cultoLink).toBeDefined()
    })

    it('modal puede cerrarse con botón Cerrar', () => {
        render(<TemasAlabanzaClient {...defaultProps} />)

        const rows = screen.getAllByText('alabanza.tema.serReverentes')
        fireEvent.click(rows[0].closest('tr')!)

        const closeBtn = document.querySelector('[aria-label="Cerrar"]')
        expect(closeBtn).toBeInTheDocument()
        if (closeBtn) fireEvent.click(closeBtn as HTMLElement)
    })
})
