/**
 * @vitest-environment happy-dom
 *
 * QA senior — gestión de personas del plano: cargar, buscar, cambiar capacidad,
 * añadir, renombrar (con error de duplicado) y borrar. Y modo solo-lectura.
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

beforeEach(() => {
    vi.clearAllMocks()
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
        const row = screen.getByText('Maria Edilma Aricapa').closest('li')!
        fireEvent.click(within(row).getByText('ofrenda.plano.cap.apoyo'))
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
        const row = screen.getByText('Carlos Galvis').closest('li')!
        fireEvent.click(within(row).getByLabelText('common.delete'))
        // diálogo de confirmación
        fireEvent.click(await screen.findByText('common.delete'))
        await waitFor(() => expect(del).toHaveBeenCalledWith('p2'))
    })

    it('renombrar a un nombre duplicado muestra el error', async () => {
        rename.mockResolvedValue({ errorCode: 'duplicate' })
        renderManager()
        await screen.findByText('Maria Edilma Aricapa')
        const row = screen.getByText('Maria Edilma Aricapa').closest('li')!
        fireEvent.click(within(row).getByLabelText('common.edit'))
        const input = await screen.findByDisplayValue('Maria Edilma Aricapa')
        fireEvent.change(input, { target: { value: 'Carlos Galvis' } })
        fireEvent.click(screen.getByText('common.save').closest('button')!)
        await waitFor(() => expect(screen.getByText('ofrenda.plano.personas.duplicate')).toBeTruthy())
    })

    it('solo-lectura: sin añadir, editar ni borrar; capacidad deshabilitada', async () => {
        renderManager(false)
        await screen.findByText('Maria Edilma Aricapa')
        expect(screen.queryByPlaceholderText('ofrenda.plano.personas.addPlaceholder')).toBeNull()
        expect(screen.queryByLabelText('common.edit')).toBeNull()
        expect(screen.queryByLabelText('common.delete')).toBeNull()
        const row = screen.getByText('Maria Edilma Aricapa').closest('li')!
        expect(within(row).getByText('ofrenda.plano.cap.apoyo').hasAttribute('disabled')).toBe(true)
    })
})
