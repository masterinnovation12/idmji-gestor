/**
 * @vitest-environment happy-dom
 *
 * QA senior — aviso de rol al asignar fuera de la capacidad de la persona:
 * ofrendario→hueco apoyo y apoyo→hueco ofrendario, con las 3 salidas
 * (No / solo esta vez / permanente→'ambos'). 'ambos' nunca avisa.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlanoTab } from './PlanoTab'
import type { PlanCompleto } from '../actions'
import { OfrendaFeedbackProvider } from '../ofrendaFeedback'

const I18N: Record<string, string> = {
    'ofrenda.plano.modoBadge': '{sacos} sacos · {bloques} bloques',
    'ofrenda.plano.vista2d': '2D',
    'ofrenda.plano.vista3d': '3D',
    'ofrenda.plano.rol.ofrendario': 'Ofrendario',
    'ofrenda.plano.rol.apoyo': 'Apoyo',
    'ofrenda.plano.rolWarn.title': 'Aviso de rol',
    'ofrenda.plano.rolWarn.toApoyo': '{nombre} está en la lista de ofrendarios. ¿Asignarla a apoyo igualmente?',
    'ofrenda.plano.rolWarn.toOfrendario': '{nombre} solo hace sobres. ¿Asignarla a ofrendario igualmente?',
    'ofrenda.plano.rolWarn.once': 'Sí, solo esta vez',
    'ofrenda.plano.rolWarn.permanent': 'Sí, dejarla en ambas listas',
    'ofrenda.plano.rolWarn.no': 'No, cancelar',
    'ofrenda.plano.capacidad.updated': 'Lista de la persona actualizada',
    'ofrenda.plano.combobox.reused': 'Ya estaba en la lista; se ha usado esa',
    'ofrenda.plano.toast.saved': 'Nombre guardado',
    'ofrenda.days.jueShort': 'Jue',
}

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({ t: (k: string) => I18N[k] ?? k, language: 'es' }),
}))

// Diálogos passthrough: renderizan su contenido cuando open.
vi.mock('../OfrendaLiquidShell', () => ({
    OfrendaLiquidShell: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
        open ? <div data-testid="shell">{children}</div> : null,
    useOfrendaMobileOrTablet: () => false,
}))

// Canvas: botones que disparan onEditPosicion con un hueco apoyo u ofrendario.
vi.mock('./PlanoCanvas', () => ({
    PlanoCanvas: (props: { onEditPosicion: (p: unknown) => void }) => (
        <div>
            <button
                data-testid="edit-apoyo"
                onClick={() => props.onEditPosicion({ id: 'a1', bloque: 1, rol: 'apoyo', card: { x: 0, y: 0 }, figura: { x: 0, y: 0 } })}
            />
            <button
                data-testid="edit-ofr"
                onClick={() => props.onEditPosicion({ id: 'o1', bloque: 1, rol: 'ofrendario', card: { x: 0, y: 0 }, figura: { x: 0, y: 0 } })}
            />
        </div>
    ),
}))

vi.mock('./PlanoEditorSheet', () => ({ PlanoEditorSheet: () => <div /> }))

// Combobox: botones que llaman onSelect con capacidades controladas.
vi.mock('./PlanoPersonaCombobox', () => ({
    PlanoPersonaCombobox: (props: {
        onSelect: (id: string | null, n: string | null, c: string | null, exists?: boolean) => void
    }) => (
        <div>
            <button data-testid="pick-ofr" onClick={() => props.onSelect('p1', 'Juan', 'ofrendario')} />
            <button data-testid="pick-apoyo" onClick={() => props.onSelect('p2', 'Ana', 'apoyo')} />
            <button data-testid="pick-ambos" onClick={() => props.onSelect('p3', 'Eva', 'ambos')} />
            <button data-testid="pick-reused" onClick={() => props.onSelect('p4', 'Leo', 'ambos', true)} />
        </div>
    ),
}))

vi.mock('./planoActions', () => {
    const vista = {
        vista: '2d',
        modo: 'sacos_4',
        lienzo: { w: 100, h: 100 },
        layout: {},
        bloques: [{ n: 1, color: '#000', labelText: '1', labelPos: { x: 0, y: 0 } }],
        posiciones: [],
        fondoUrl: null,
    }
    return {
        getPlanoData: vi.fn().mockResolvedValue({ data: { data: vista, asignaciones: [] } }),
        savePlanoAsignacion: vi.fn().mockResolvedValue({}),
        setPlanoPersonaCapacidad: vi.fn().mockResolvedValue({}),
        savePlanoLayout: vi.fn().mockResolvedValue({}),
        clearPlanoNombres: vi.fn().mockResolvedValue({}),
        resetPlanoLayout: vi.fn().mockResolvedValue({}),
        searchPlanoPersonas: vi.fn().mockResolvedValue({ data: [] }),
        createPlanoPersona: vi.fn(),
    }
})

import { savePlanoAsignacion, setPlanoPersonaCapacidad } from './planoActions'
const saveAsig = vi.mocked(savePlanoAsignacion)
const setCap = vi.mocked(setPlanoPersonaCapacidad)

const plan: PlanCompleto = {
    plan: {
        id: 'plan-1', mes: 6, anio: 2026,
        sacos_jueves: 4, sacos_domingo: 4, sacos_domingo_tarde: 4,
        secuencia_maximo: 20, secuencia_puntero: 1, secuencia_puntero_fin: 5,
        updated_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z',
    },
    servicios: [{
        id: 'srv-1', plan_id: 'plan-1', fecha: '2026-06-05', dia_tipo: 'jueves',
        semana_iso: 23, secuencia_desde: 1, secuencia_hasta: 4, secuencia_texto: '01 al 04', posicion: 0,
    }],
    asignaciones: [], miembros: [],
}

function renderTab() {
    render(
        <OfrendaFeedbackProvider>
            <PlanoTab plan={plan} tituloMes="Junio 2026" canEdit onGoToPlan={vi.fn()} />
        </OfrendaFeedbackProvider>,
    )
}

beforeEach(() => vi.clearAllMocks())

describe('PlanoTab — aviso de rol', () => {
    it('ofrendario en hueco de apoyo: muestra aviso y NO guarda aún', async () => {
        renderTab()
        const apoyoBtn = await screen.findByTestId('edit-apoyo')
        fireEvent.click(apoyoBtn)
        fireEvent.click(screen.getByTestId('pick-ofr'))

        await waitFor(() =>
            expect(screen.getByText(/Juan está en la lista de ofrendarios/)).toBeTruthy(),
        )
        expect(saveAsig).not.toHaveBeenCalled()
    })

    it('apoyo en hueco de ofrendario: muestra el aviso inverso', async () => {
        renderTab()
        fireEvent.click(await screen.findByTestId('edit-ofr'))
        fireEvent.click(screen.getByTestId('pick-apoyo'))

        await waitFor(() => expect(screen.getByText(/Ana solo hace sobres/)).toBeTruthy())
    })

    it('"solo esta vez" guarda la asignación y NO cambia la capacidad', async () => {
        renderTab()
        fireEvent.click(await screen.findByTestId('edit-apoyo'))
        fireEvent.click(screen.getByTestId('pick-ofr'))
        fireEvent.click(await screen.findByText('Sí, solo esta vez'))

        await waitFor(() =>
            expect(saveAsig).toHaveBeenCalledWith('srv-1', 1, 'apoyo', 'p1', 'Juan'),
        )
        expect(setCap).not.toHaveBeenCalled()
    })

    it('"permanente" cambia la capacidad a "ambos" y luego guarda', async () => {
        renderTab()
        fireEvent.click(await screen.findByTestId('edit-apoyo'))
        fireEvent.click(screen.getByTestId('pick-ofr'))
        fireEvent.click(await screen.findByText('Sí, dejarla en ambas listas'))

        await waitFor(() => expect(setCap).toHaveBeenCalledWith('p1', 'ambos'))
        await waitFor(() =>
            expect(saveAsig).toHaveBeenCalledWith('srv-1', 1, 'apoyo', 'p1', 'Juan'),
        )
    })

    it('"No" cancela: no guarda ni cambia capacidad', async () => {
        renderTab()
        fireEvent.click(await screen.findByTestId('edit-apoyo'))
        fireEvent.click(screen.getByTestId('pick-ofr'))
        fireEvent.click(await screen.findByText('No, cancelar'))

        expect(saveAsig).not.toHaveBeenCalled()
        expect(setCap).not.toHaveBeenCalled()
    })

    it('capacidad "ambos" encaja en cualquier hueco: guarda directo sin aviso', async () => {
        renderTab()
        fireEvent.click(await screen.findByTestId('edit-apoyo'))
        fireEvent.click(screen.getByTestId('pick-ambos'))

        await waitFor(() =>
            expect(saveAsig).toHaveBeenCalledWith('srv-1', 1, 'apoyo', 'p3', 'Eva'),
        )
        expect(screen.queryByText('Aviso de rol')).toBeNull()
    })
})
