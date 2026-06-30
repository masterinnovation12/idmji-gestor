/**
 * @vitest-environment happy-dom
 *
 * QA senior — gestión de personas del plano: cargar, buscar, filas expandibles,
 * cambiar capacidad, añadir, renombrar (con error de duplicado) y borrar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { PlanoPersonasManager } from './PlanoPersonasManager'
import { OfrendaFeedbackProvider } from '../ofrendaFeedback'

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({ t: (k: string) => k, language: 'es' }),
}))

vi.mock('../OfrendaLiquidShell', () => ({
    OfrendaLiquidShell: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
        open ? <div data-testid="shell">{children}</div> : null,
    useOfrendaMobileOrTablet: () => false,
}))

vi.mock('./planoActions', () => ({
    listPlanoPersonas: vi.fn(),
    createPlanoPersona: vi.fn(),
    renamePlanoPersona: vi.fn(),
    deletePlanoPersona: vi.fn(),
    setPlanoPersonaCapacidad: vi.fn(),
    setPlanoPersonaTurnos: vi.fn(),
    setPlanoPersonaPrioridad: vi.fn(),
    setPlanoPersonaActivo: vi.fn(),
    setPlanoPareja: vi.fn(),
    removePlanoPareja: vi.fn(),
}))

const exportPng = vi.fn().mockResolvedValue(undefined)
vi.mock('./planoPersonasExportPng', () => ({
    exportPlanoPersonasPng: (...args: unknown[]) => exportPng(...args),
}))

import {
    listPlanoPersonas,
    createPlanoPersona,
    renamePlanoPersona,
    deletePlanoPersona,
    setPlanoPersonaCapacidad,
} from './planoActions'

const list = vi.mocked(listPlanoPersonas)
const create = vi.mocked(createPlanoPersona)
const rename = vi.mocked(renamePlanoPersona)
const del = vi.mocked(deletePlanoPersona)
const setCap = vi.mocked(setPlanoPersonaCapacidad)

const PERSONAS_BASE = {
    puede_jueves: true,
    puede_domingo_manana: false,
    puede_domingo_tarde: false,
    genero: 'hombre' as const,
    prioridad_ofrendario: false,
    parejaId: null,
    parejaNombre: null,
}

const PERSONAS = [
    { id: 'p1', nombre: 'Maria Edilma Aricapa', capacidad: 'ambos' as const, activo: true, asignaciones: 2, ...PERSONAS_BASE, genero: 'mujer' as const },
    { id: 'p2', nombre: 'Carlos Galvis', capacidad: 'ofrendario' as const, activo: true, asignaciones: 0, ...PERSONAS_BASE },
]

function renderManager(canEdit = true) {
    return render(
        <OfrendaFeedbackProvider>
            <PlanoPersonasManager canEdit={canEdit} />
        </OfrendaFeedbackProvider>,
    )
}

async function expandRow(personaId: string) {
    fireEvent.click(screen.getByTestId(`plano-persona-expand-${personaId}`))
    await screen.findByTestId(`plano-persona-expanded-${personaId}`)
}

beforeEach(() => {
    vi.clearAllMocks()
    exportPng.mockResolvedValue(undefined)
    list.mockResolvedValue({ data: PERSONAS })
    setCap.mockResolvedValue({})
    del.mockResolvedValue({})
    create.mockResolvedValue({ data: { id: 'p9', nombre: 'Nuevo', capacidad: 'ambos' }, alreadyExisted: false })
    rename.mockResolvedValue({})
})

describe('PlanoPersonasManager', () => {
    it('carga y muestra el directorio', async () => {
        renderManager()
        expect(await screen.findByText('Maria Edilma Aricapa')).toBeTruthy()
        expect(screen.getByText('Carlos Galvis')).toBeTruthy()
    })

    it('muestra caja de ayuda y leyenda de turnos', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        expect(screen.getByText('ofrenda.plano.personas.hint')).toBeTruthy()
        expect(screen.getByTestId('plano-personas-turn-legend')).toBeTruthy()
    })

    it('fila colapsada: puntos de turno visibles, chips de capacidad ocultos', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        expect(screen.getByTestId('plano-turns-p1-summary')).toBeTruthy()
        expect(screen.queryByTestId('plano-turns-p1-puede_jueves')).not.toBeInTheDocument()
        expect(screen.queryByText('ofrenda.plano.cap.apoyo')).not.toBeInTheDocument()
    })

    it('muestra badge de capacidad y asignaciones en fila compacta', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        expect(screen.getByTestId('plano-persona-cap-badge-p1')).toHaveTextContent('ofrenda.plano.cap.ambos')
        expect(screen.getByTestId('plano-persona-assignments-p1')).toHaveTextContent('ofrenda.plano.personas.assigned')
        expect(screen.getByTestId('plano-persona-assignments-p2')).toHaveTextContent('ofrenda.plano.personas.notAssigned')
    })

    it('al expandir muestra chips de capacidad y turnos', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        await expandRow('p1')
        expect(screen.getByTestId('plano-turns-p1-puede_jueves')).toBeTruthy()
        expect(screen.getByText('ofrenda.plano.cap.apoyo')).toBeTruthy()
    })

    it('el buscador filtra por nombre (sin tildes)', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        fireEvent.change(screen.getByPlaceholderText('common.search'), { target: { value: 'carlos' } })
        expect(screen.queryByText('Maria Edilma Aricapa')).toBeNull()
        expect(screen.getByText('Carlos Galvis')).toBeTruthy()
    })

    it('cambiar capacidad llama a setPlanoPersonaCapacidad', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        await expandRow('p1')
        const expanded = screen.getByTestId('plano-persona-expanded-p1')
        fireEvent.click(within(expanded).getByText('ofrenda.plano.cap.apoyo'))
        await waitFor(() => expect(setCap).toHaveBeenCalledWith('p1', 'apoyo'))
    })

    it('añadir persona llama a createPlanoPersona y recarga', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        fireEvent.change(screen.getByPlaceholderText('ofrenda.plano.personas.addPlaceholder'), {
            target: { value: 'Persona Nueva' },
        })
        fireEvent.click(screen.getByText('common.add').closest('button')!)
        await waitFor(() => expect(create).toHaveBeenCalledWith('Persona Nueva'))
        await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    })

    it('borrar abre confirmación y llama a deletePlanoPersona', async () => {
        renderManager()
        await screen.findByText('Carlos Galvis')
        const row = screen.getByTestId('plano-persona-row-p2')
        fireEvent.click(within(row).getByLabelText('common.delete'))
        fireEvent.click(await screen.findByText('common.delete'))
        await waitFor(() => expect(del).toHaveBeenCalledWith('p2'))
    })

    it('renombrar a un nombre duplicado muestra el error', async () => {
        rename.mockResolvedValue({ errorCode: 'duplicate' })
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        await expandRow('p1')
        const expanded = screen.getByTestId('plano-persona-expanded-p1')
        fireEvent.click(within(expanded).getByLabelText('common.edit'))
        const input = await screen.findByDisplayValue('Maria Edilma Aricapa')
        fireEvent.change(input, { target: { value: 'Carlos Galvis' } })
        fireEvent.click(screen.getByText('common.save').closest('button')!)
        await waitFor(() => expect(screen.getByText('ofrenda.plano.personas.duplicate')).toBeTruthy())
    })

    it('solo-lectura: sin añadir, expandir ni borrar; capacidad deshabilitada al expandir manualmente no aplica', async () => {
        renderManager(false)
        await screen.findByText('Maria Edilma Aricapa')
        expect(screen.queryByPlaceholderText('ofrenda.plano.personas.addPlaceholder')).toBeNull()
        expect(screen.queryByTestId('plano-persona-expand-p1')).toBeNull()
        expect(screen.queryByLabelText('common.delete')).toBeNull()
    })

    it('filtros: por defecto se ven todas las personas', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        expect(screen.getByText('Carlos Galvis')).toBeTruthy()
        expect(screen.getByTestId('plano-personas-filters-toggle')).toBeTruthy()
        expect(screen.getByTestId('plano-personas-export-btn')).toBeTruthy()
    })

    it('filtro por género mujeres deja solo a la mujer', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        fireEvent.click(screen.getByTestId('plano-personas-filters-toggle'))
        // deseleccionar "hombres" → grupo parcial = solo mujeres
        fireEvent.click(screen.getByTestId('plano-personas-filter-genero-hombre'))
        expect(screen.getByText('Maria Edilma Aricapa')).toBeTruthy()
        expect(screen.queryByText('Carlos Galvis')).toBeNull()
    })

    it('filtro sin coincidencias muestra estado vacío y limpiar restaura', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        fireEvent.click(screen.getByTestId('plano-personas-filters-toggle'))
        fireEvent.click(screen.getByTestId('plano-personas-filter-estrella'))
        expect(await screen.findByTestId('plano-personas-empty-filters')).toBeTruthy()
        fireEvent.click(screen.getByTestId('plano-personas-filters-clear'))
        expect(await screen.findByText('Maria Edilma Aricapa')).toBeTruthy()
    })

    it('exportar PNG usa el conjunto filtrado', async () => {
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        fireEvent.click(screen.getByTestId('plano-personas-filters-toggle'))
        fireEvent.click(screen.getByTestId('plano-personas-filter-genero-hombre'))
        fireEvent.click(screen.getByTestId('plano-personas-export-btn'))
        await waitFor(() => expect(exportPng).toHaveBeenCalledTimes(1))
        const rows = exportPng.mock.calls[0][0] as Array<{ nombre: string }>
        expect(rows).toHaveLength(1)
        expect(rows[0].nombre).toBe('Maria Edilma Aricapa')
    })
})
