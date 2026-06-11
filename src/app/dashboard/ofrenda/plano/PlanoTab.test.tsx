/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlanoTab } from './PlanoTab'
import type { PlanCompleto } from '../actions'
import { OfrendaFeedbackProvider } from '../ofrendaFeedback'

vi.mock('./planoActions', () => ({
    getPlanoData: vi.fn().mockResolvedValue({ data: undefined }),
    savePlanoAsignacion: vi.fn(),
    savePlanoLayout: vi.fn().mockResolvedValue({}),
    clearPlanoNombres: vi.fn(),
    resetPlanoLayout: vi.fn(),
    searchPlanoPersonas: vi.fn().mockResolvedValue({ data: [] }),
    createPlanoPersona: vi.fn(),
}))

vi.mock('./PlanoCanvas', () => ({
    PlanoCanvas: () => <div data-testid="plano-canvas-mock" />,
}))

vi.mock('./PlanoEditorSheet', () => ({
    PlanoEditorSheet: () => <div data-testid="plano-editor-mock" />,
}))

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'ofrenda.plano.serviceSelector': 'Servicios',
                'ofrenda.plano.modoBadge': '{sacos} sacos · {bloques} bloques',
                'ofrenda.plano.vista2d': '2D',
                'ofrenda.plano.vista3d': '3D',
                'ofrenda.plano.vistaToggle': 'Vista',
                'ofrenda.plano.canvasLabel': 'Plano',
                'ofrenda.plano.tabla.bloque': 'Bloque',
                'ofrenda.plano.tabla.rol': 'Rol',
                'ofrenda.plano.tabla.nombre': 'Nombre',
                'ofrenda.plano.rol.ofrendario': 'Ofrendario',
                'ofrenda.plano.rol.apoyo': 'Apoyo',
                'ofrenda.plano.loading': 'Cargando',
                'ofrenda.days.jueShort': 'Jue',
                'ofrenda.days.domShort': 'Dom',
                'ofrenda.days.manana': 'Mañana',
                'ofrenda.days.tarde': 'Tarde',
                'ofrenda.emptyPlan.title': 'Sin plan',
                'ofrenda.plano.emptyDesc': 'Genera el plan',
                'ofrenda.plano.goToPlan': 'Ir al plan',
            }
            return map[key] ?? key
        },
        language: 'es',
    }),
}))

const plan: PlanCompleto = {
    plan: {
        id: 'plan-1',
        mes: 6,
        anio: 2026,
        sacos_jueves: 8,
        sacos_domingo: 4,
        sacos_domingo_tarde: 8,
        secuencia_maximo: 20,
        secuencia_puntero: 1,
        secuencia_puntero_fin: 5,
        updated_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
    },
    servicios: [
        {
            id: 'srv-1',
            plan_id: 'plan-1',
            fecha: '2026-06-05',
            dia_tipo: 'jueves',
            semana_iso: 23,
            secuencia_desde: 1,
            secuencia_hasta: 8,
            secuencia_texto: '01 al 08',
            posicion: 0,
        },
    ],
    asignaciones: [],
    miembros: [],
}

function renderTab(props: Partial<React.ComponentProps<typeof PlanoTab>> = {}) {
    return render(
        <OfrendaFeedbackProvider>
            <PlanoTab
                plan={plan}
                tituloMes="Junio 2026"
                canEdit={false}
                onGoToPlan={vi.fn()}
                {...props}
            />
        </OfrendaFeedbackProvider>,
    )
}

describe('PlanoTab', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('muestra el lienzo cuando hay plan y servicio', async () => {
        renderTab()
        expect(screen.getByTestId('plano-tab')).toBeTruthy()
        await waitFor(() => {
            expect(screen.getByTestId('plano-canvas-mock')).toBeTruthy()
        })
    })

    it('muestra badge de modo según sacos del jueves (8)', () => {
        renderTab()
        expect(screen.getByTestId('plano-modo-badge').textContent).toContain('8')
    })

    it('cambia a vista 3D al pulsar el toggle', async () => {
        const { getPlanoData } = await import('./planoActions')
        renderTab()
        fireEvent.click(screen.getByRole('button', { name: '3D' }))
        await waitFor(() => {
            expect(getPlanoData).toHaveBeenCalledWith('srv-1', '3d', 'sacos_8')
        })
    })

    it('estado vacío sin plan', () => {
        renderTab({ plan: null })
        expect(screen.getByText(/Ir al plan/i)).toBeTruthy()
    })
})
