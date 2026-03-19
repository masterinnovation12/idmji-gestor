/**
 * Tests de StatsClient - KPIs, tabs, responsive, i18n.
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StatsClient from './StatsClient'

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('./actions', () => ({
    getParticipationStats: vi.fn(),
    getBibleReadingStats: vi.fn(),
    getStatsSummary: vi.fn(),
}))

vi.mock('@/components/BackButton', () => ({
    default: () => <button type="button">Volver</button>,
}))

const mockStats = [
    {
        userId: 'u1',
        user: { id: 'u1', nombre: 'Ana', apellidos: 'García' },
        total: 5,
        stats: { introduccion: 2, finalizacion: 1, ensenanza: 2, testimonios: 0 },
    },
]

const defaultProps = {
    initialStats: mockStats,
    initialSummary: { totalCultos: 12, totalParticipaciones: 48, hermanosActivos: 8 },
    initialBibleStats: {
        topReadings: [{ label: 'Salmos 23:1-6', count: 4 }],
        readingsByType: [{ label: 'Introducción', count: 20 }, { label: 'Finalización', count: 15 }],
        totalLecturas: 35,
    },
    cultoTypes: [{ id: '1', nombre: 'Alabanza' }, { id: '2', nombre: 'Estudio' }],
    currentYear: 2025,
}

describe('StatsClient', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        const { getParticipationStats, getBibleReadingStats, getStatsSummary } = await import('./actions')
        ;(getParticipationStats as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: mockStats })
        ;(getBibleReadingStats as ReturnType<typeof vi.fn>).mockResolvedValue({
            success: true,
            data: defaultProps.initialBibleStats,
        })
        ;(getStatsSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
            success: true,
            data: defaultProps.initialSummary,
        })
        Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    })

    it('renderiza KPIs con totales', () => {
        render(<StatsClient {...defaultProps} />)

        expect(screen.getByText('12')).toBeInTheDocument()
        expect(screen.getByText('48')).toBeInTheDocument()
        expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('renderiza participación con hermano y total', async () => {
        render(<StatsClient {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getAllByText(/Ana García/).length).toBeGreaterThan(0)
            expect(screen.getAllByText('5').length).toBeGreaterThan(0)
        })
    })

    it('cambia a tab Biblia al hacer click', () => {
        render(<StatsClient {...defaultProps} />)

        fireEvent.click(screen.getByText('admin.stats.tabBible'))

        expect(screen.getByText('admin.stats.topReadings')).toBeInTheDocument()
        expect(screen.getAllByText('Salmos 23:1-6').length).toBeGreaterThan(0)
    })

    it('muestra BackButton', () => {
        render(<StatsClient {...defaultProps} />)

        expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument()
    })

    it('filtra por búsqueda', () => {
        render(<StatsClient {...defaultProps} />)

        const input = screen.getByPlaceholderText('admin.stats.searchPlaceholder')
        fireEvent.change(input, { target: { value: 'Pedro' } })

        expect(screen.queryByText('Ana García')).not.toBeInTheDocument()
    })

    it('tab activo tiene clases de contraste (bg-primary text-primary-foreground)', () => {
        render(<StatsClient {...defaultProps} />)

        const pulpitTab = screen.getByRole('button', { name: /admin\.stats\.tabPulpit/i })
        expect(pulpitTab).toHaveClass('bg-primary')
        expect(pulpitTab).toHaveClass('text-primary-foreground')
    })

    it('mobile card muestra labels cortos (Intro, Final)', async () => {
        Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
        render(<StatsClient {...defaultProps} />)

        await waitFor(() => {
            expect(screen.getAllByText('admin.stats.introShort').length).toBeGreaterThan(0)
            expect(screen.getAllByText('admin.stats.finalShort').length).toBeGreaterThan(0)
        })
    })

    it('tab Biblia muestra empty state cuando no hay lecturas', async () => {
        const { getBibleReadingStats } = await import('./actions')
        ;(getBibleReadingStats as ReturnType<typeof vi.fn>).mockResolvedValue({
            success: true,
            data: { topReadings: [], readingsByType: [], totalLecturas: 0 },
        })
        render(<StatsClient {...defaultProps} initialBibleStats={{ topReadings: [], readingsByType: [], totalLecturas: 0 }} />)

        fireEvent.click(screen.getByText('admin.stats.tabBible'))

        await waitFor(() => {
            expect(screen.getByText('admin.stats.emptyChartTop')).toBeInTheDocument()
            expect(screen.getByText('admin.stats.emptyChartType')).toBeInTheDocument()
        })
    })

    it('tab Biblia en móvil muestra lista de citas (no gráfico)', async () => {
        Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
        render(<StatsClient {...defaultProps} />)

        fireEvent.click(screen.getByText('admin.stats.tabBible'))

        await waitFor(() => {
            expect(screen.getAllByText('Salmos 23:1-6').length).toBeGreaterThan(0)
            expect(screen.getByText('20')).toBeInTheDocument()
            expect(screen.getByText('15')).toBeInTheDocument()
        })
    })

    it('cambiar bibleYear refetcha datos', async () => {
        const { getBibleReadingStats } = await import('./actions')
        render(<StatsClient {...defaultProps} />)

        fireEvent.click(screen.getByText('admin.stats.tabBible'))

        await waitFor(() => {
            expect(getBibleReadingStats).toHaveBeenCalled()
        })

        const callsBefore = (getBibleReadingStats as ReturnType<typeof vi.fn>).mock.calls.length
        const selects = screen.getAllByRole('combobox')
        const bibleYearSelect = selects.find((s: HTMLElement) => s.querySelector('option[value="all"]'))
        if (bibleYearSelect) {
            fireEvent.change(bibleYearSelect, { target: { value: 'all' } })
        }

        await waitFor(() => {
            const callsAfter = (getBibleReadingStats as ReturnType<typeof vi.fn>).mock.calls.length
            expect(callsAfter).toBeGreaterThan(callsBefore)
            const lastCall = (getBibleReadingStats as ReturnType<typeof vi.fn>).mock.calls[callsAfter - 1]
            expect(lastCall[0]).toBeUndefined()
        })
    })
})
