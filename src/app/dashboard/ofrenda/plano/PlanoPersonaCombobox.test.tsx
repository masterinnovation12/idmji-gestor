/**
 * @vitest-environment happy-dom
 *
 * QA senior — viaje del usuario final al asignar un nombre en el plano:
 * buscar, seleccionar, crear nuevo, reutilizar si ya existe, dejar vacío,
 * y todos los mensajes de error de validación/permisos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlanoPersonaCombobox } from './PlanoPersonaCombobox'

const I18N: Record<string, string> = {
    'ofrenda.plano.combobox.search': 'Buscar o escribir nombre',
    'ofrenda.plano.combobox.clear': 'Dejar vacío',
    'ofrenda.plano.combobox.loading': 'Buscando…',
    'ofrenda.plano.combobox.add': '+ Añadir "{nombre}" a la lista',
    'ofrenda.plano.combobox.noMatch': 'Sin coincidencias',
    'ofrenda.plano.combobox.typeMore': 'Escribe al menos 2 caracteres',
    'ofrenda.plano.combobox.tooShort': 'El nombre es demasiado corto',
    'ofrenda.plano.combobox.tooLong': 'El nombre es demasiado largo',
    'ofrenda.plano.combobox.noPermission': 'No tienes permisos para añadir personas',
    'ofrenda.plano.combobox.createError': 'No se pudo añadir la persona',
}

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({ t: (k: string) => I18N[k] ?? k, language: 'es' }),
}))

// Shell passthrough + escritorio (no móvil) para renderizar el contenido del combobox.
vi.mock('../OfrendaLiquidShell', () => ({
    OfrendaLiquidShell: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
        open ? <div data-testid="shell">{children}</div> : null,
    useOfrendaMobileOrTablet: () => false,
}))

vi.mock('./planoActions', () => ({
    searchPlanoPersonas: vi.fn(),
    createPlanoPersona: vi.fn(),
}))

import { searchPlanoPersonas, createPlanoPersona } from './planoActions'

const search = vi.mocked(searchPlanoPersonas)
const create = vi.mocked(createPlanoPersona)

function setup(overrides: Partial<React.ComponentProps<typeof PlanoPersonaCombobox>> = {}) {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(
        <PlanoPersonaCombobox
            open
            onClose={onClose}
            bloque={1}
            rolLabel="Apoyo"
            color="#ec2f87"
            value=""
            onSelect={onSelect}
            {...overrides}
        />,
    )
    return { onSelect, onClose }
}

function typeQuery(text: string) {
    const input = screen.getByPlaceholderText('Buscar o escribir nombre') as HTMLInputElement
    fireEvent.change(input, { target: { value: text } })
}

beforeEach(() => {
    vi.clearAllMocks()
    search.mockResolvedValue({ data: [] })
})

describe('PlanoPersonaCombobox — buscar y seleccionar', () => {
    it('muestra resultados y al pulsar uno llama onSelect con id, nombre y capacidad', async () => {
        search.mockResolvedValue({
            data: [{ id: 'p1', nombre: 'Maria Edilma Aricapa', capacidad: 'ambos' }],
        })
        const { onSelect, onClose } = setup()
        typeQuery('maria')

        const row = await screen.findByText('Maria Edilma Aricapa')
        fireEvent.click(row.closest('button')!)

        expect(onSelect).toHaveBeenCalledWith('p1', 'Maria Edilma Aricapa', 'ambos')
        expect(onClose).toHaveBeenCalled()
    })

    it('"Dejar vacío" limpia el hueco: onSelect(null,null,null)', () => {
        const { onSelect, onClose } = setup()
        fireEvent.click(screen.getByText('Dejar vacío').closest('button')!)
        expect(onSelect).toHaveBeenCalledWith(null, null, null)
        expect(onClose).toHaveBeenCalled()
    })

    it('con coincidencia exacta NO ofrece el botón de añadir', async () => {
        search.mockResolvedValue({ data: [{ id: 'p1', nombre: 'Sandra Alcaraz', capacidad: 'ambos' }] })
        setup()
        typeQuery('Sandra Alcaraz')
        await screen.findByText('Sandra Alcaraz')
        expect(screen.queryByText(/Añadir "Sandra Alcaraz"/)).toBeNull()
    })

    it('menos de 2 caracteres pide escribir más', async () => {
        setup()
        typeQuery('a')
        await waitFor(() => expect(screen.getByText('Escribe al menos 2 caracteres')).toBeTruthy())
    })
})

describe('PlanoPersonaCombobox — crear y reutilizar', () => {
    it('crea una persona nueva y la asigna (alreadyExisted=false)', async () => {
        create.mockResolvedValue({
            data: { id: 'new1', nombre: 'Pepito Nuevo', capacidad: 'ambos' },
            alreadyExisted: false,
        })
        const { onSelect, onClose } = setup()
        typeQuery('Pepito Nuevo')

        const addBtn = await screen.findByText(/Añadir "Pepito Nuevo"/)
        fireEvent.click(addBtn.closest('button')!)

        await waitFor(() => expect(create).toHaveBeenCalledWith('Pepito Nuevo'))
        expect(onSelect).toHaveBeenCalledWith('new1', 'Pepito Nuevo', 'ambos', false)
        expect(onClose).toHaveBeenCalled()
    })

    it('si ya existe, la reutiliza (alreadyExisted=true) sin duplicar', async () => {
        create.mockResolvedValue({
            data: { id: 'p9', nombre: 'Carlos Galvis', capacidad: 'ambos' },
            alreadyExisted: true,
        })
        const { onSelect } = setup()
        typeQuery('Carlos Galvis')

        const addBtn = await screen.findByText(/Añadir "Carlos Galvis"/)
        fireEvent.click(addBtn.closest('button')!)

        await waitFor(() =>
            expect(onSelect).toHaveBeenCalledWith('p9', 'Carlos Galvis', 'ambos', true),
        )
    })
})

describe('PlanoPersonaCombobox — errores (QA negativo)', () => {
    it.each([
        ['too_short', 'El nombre es demasiado corto'],
        ['too_long', 'El nombre es demasiado largo'],
        ['no_permission', 'No tienes permisos para añadir personas'],
        ['unknown', 'No se pudo añadir la persona'],
    ] as const)('errorCode %s muestra mensaje traducido y NO asigna', async (code, msg) => {
        create.mockResolvedValue({ errorCode: code })
        const { onSelect } = setup()
        typeQuery('Nombre X')

        const addBtn = await screen.findByText(/Añadir "Nombre X"/)
        fireEvent.click(addBtn.closest('button')!)

        await waitFor(() => expect(screen.getByText(msg)).toBeTruthy())
        expect(onSelect).not.toHaveBeenCalled()
    })

    it('si la búsqueda falla, muestra el error y no rompe', async () => {
        search.mockResolvedValue({ error: 'fallo de red' })
        setup()
        typeQuery('mar')
        await waitFor(() => expect(screen.getByText('fallo de red')).toBeTruthy())
    })
})
