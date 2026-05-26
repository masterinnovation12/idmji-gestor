/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BibleSelector from './BibleSelector'

const checkCapituloEnHistorialMock = vi.fn()
const getBibliaLibrosMock = vi.fn()

vi.mock('@/app/dashboard/lecturas/actions', () => ({
    getBibliaLibros: (...args: unknown[]) => getBibliaLibrosMock(...args),
    checkCapituloEnHistorial: (...args: unknown[]) => checkCapituloEnHistorialMock(...args),
}))

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        language: 'es-ES',
    }),
}))

const mockLibros = [
    {
        id: 43,
        nombre: 'Juan',
        abreviatura: 'Jn',
        testamento: 'NT',
        capitulos: [{ n: 1, v: 51 }, { n: 2, v: 25 }, { n: 3, v: 36 }],
    },
]

describe('BibleSelector chapter history', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        getBibliaLibrosMock.mockResolvedValue({ data: mockLibros })
    })

    it('no muestra aviso si el capítulo no está en historial', async () => {
        checkCapituloEnHistorialMock.mockResolvedValue({ found: false, totalCount: 0, previousCount: 0 })

        render(<BibleSelector onSelect={vi.fn()} cultoId="culto-1" />)

        await waitFor(() => expect(getBibliaLibrosMock).toHaveBeenCalled())

        const libroInput = screen.getByPlaceholderText(/Buscar libro/i)
        fireEvent.change(libroInput, { target: { value: 'Juan' } })
        fireEvent.click(screen.getByText('Juan'))

        const capInput = screen.getByPlaceholderText('Ej: 1')
        fireEvent.change(capInput, { target: { value: '3' } })
        fireEvent.blur(capInput)

        await waitFor(() => {
            expect(checkCapituloEnHistorialMock).toHaveBeenCalledWith('Juan', 3, {
                cultoId: 'culto-1',
                lecturaId: undefined,
            })
        })

        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(screen.getByPlaceholderText('Inicio')).not.toBeDisabled()
    })

    it('muestra aviso bloqueante y deshabilita versículos hasta confirmar', async () => {
        checkCapituloEnHistorialMock.mockResolvedValue({
            found: true,
            totalCount: 2,
            previousCount: 1,
            mostRecent: {
                id: 'r1',
                cultoId: 'culto-old',
                tipoLectura: 'introduccion',
                fecha: '2025-01-15',
                horaInicio: '10:00',
                cultoNombre: 'Alabanza',
                lectorNombre: 'Pedro López',
                pasaje: 'Juan 3:1-5',
            },
        })

        render(<BibleSelector onSelect={vi.fn()} cultoId="culto-1" />)

        await waitFor(() => expect(getBibliaLibrosMock).toHaveBeenCalled())

        fireEvent.change(screen.getByPlaceholderText(/Buscar libro/i), { target: { value: 'Juan' } })
        fireEvent.click(screen.getByText('Juan'))

        const capInput = screen.getByPlaceholderText('Ej: 1')
        fireEvent.change(capInput, { target: { value: '3' } })
        fireEvent.blur(capInput)

        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

        expect(screen.getByPlaceholderText('Inicio')).toBeDisabled()
        expect(screen.getByText('lecturas.chapterHistoryContinue')).toBeInTheDocument()

        fireEvent.click(screen.getByText('lecturas.chapterHistoryContinue'))

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Inicio')).not.toBeDisabled()
        })
    })

    it('al pulsar No borra el capítulo y mantiene el libro', async () => {
        checkCapituloEnHistorialMock.mockResolvedValue({
            found: true,
            totalCount: 1,
            previousCount: 0,
            mostRecent: {
                id: 'r1',
                cultoId: 'culto-1',
                tipoLectura: 'introduccion',
                fecha: '2025-01-15',
                horaInicio: null,
                cultoNombre: 'Estudio',
                lectorNombre: 'Ana',
                pasaje: 'Juan 3:16',
            },
        })

        render(<BibleSelector onSelect={vi.fn()} cultoId="culto-1" />)

        await waitFor(() => expect(getBibliaLibrosMock).toHaveBeenCalled())

        const libroInput = screen.getByPlaceholderText(/Buscar libro/i)
        fireEvent.change(libroInput, { target: { value: 'Juan' } })
        fireEvent.click(screen.getByText('Juan'))

        const capInput = screen.getByPlaceholderText('Ej: 1')
        fireEvent.change(capInput, { target: { value: '3' } })
        fireEvent.blur(capInput)

        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

        fireEvent.click(screen.getByText('lecturas.chapterHistoryCancel'))

        await waitFor(() => {
            expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        })
        expect((capInput as HTMLInputElement).value).toBe('')
        expect(libroInput).toHaveValue('Juan')
    })
})
