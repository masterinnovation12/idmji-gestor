/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PlanoGeneratePanel } from './PlanoGeneratePanel'
import type { PlanCompleto } from '../actions'
import { OfrendaFeedbackProvider } from '../ofrendaFeedback'

vi.mock('./planoGenerateActions', () => ({
    generarPlanoLabor: vi.fn(),
}))

vi.mock('./planoActions', () => ({
    getPlanoAsignacionCountsForPlan: vi.fn().mockResolvedValue({ data: { s1: 8 } }),
}))

vi.mock('./planoInvoke', () => ({
    invokePlanoAction: vi.fn((fn: () => Promise<unknown>) => fn()),
}))

vi.mock('../OfrendaLiquidShell', () => ({
    OfrendaLiquidShell: ({
        open,
        children,
        onClose,
    }: {
        open: boolean
        children: React.ReactNode
        onClose: () => void
    }) =>
        open ? (
            <div data-testid="plano-generate-week-sheet">
                <button type="button" data-testid="plano-generate-week-sheet-close" onClick={onClose}>
                    close
                </button>
                {children}
            </div>
        ) : null,
    useOfrendaMobileOrTablet: () => false,
}))

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => key,
        language: 'es-ES',
    }),
}))

const plan: PlanCompleto = {
    plan: {
        id: 'p1',
        anio: 2026,
        mes: 7,
        sacos_jueves: 4,
        sacos_domingo: 8,
        sacos_domingo_tarde: 4,
        secuencia_maximo: 20,
        secuencia_puntero: 1,
        secuencia_puntero_fin: 20,
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
    },
    servicios: [
        {
            id: 's1',
            plan_id: 'p1',
            fecha: '2026-07-02',
            dia_tipo: 'jueves',
            posicion: 1,
            semana_iso: 27,
            secuencia_desde: 1,
            secuencia_hasta: 4,
            secuencia_texto: '01 al 04',
        },
        {
            id: 's2',
            plan_id: 'p1',
            fecha: '2026-07-05',
            dia_tipo: 'domingo',
            posicion: 2,
            semana_iso: 27,
            secuencia_desde: 5,
            secuencia_hasta: 12,
            secuencia_texto: '05 al 12',
        },
        {
            id: 's3',
            plan_id: 'p1',
            fecha: '2026-07-05',
            dia_tipo: 'domingo_tarde',
            posicion: 3,
            semana_iso: 27,
            secuencia_desde: 13,
            secuencia_hasta: 16,
            secuencia_texto: '13 al 16',
        },
        {
            id: 's4',
            plan_id: 'p1',
            fecha: '2026-07-09',
            dia_tipo: 'jueves',
            posicion: 4,
            semana_iso: 28,
            secuencia_desde: 1,
            secuencia_hasta: 4,
            secuencia_texto: '01 al 04',
        },
        {
            id: 's5',
            plan_id: 'p1',
            fecha: '2026-07-12',
            dia_tipo: 'domingo',
            posicion: 5,
            semana_iso: 28,
            secuencia_desde: 5,
            secuencia_hasta: 12,
            secuencia_texto: '05 al 12',
        },
        {
            id: 's6',
            plan_id: 'p1',
            fecha: '2026-07-12',
            dia_tipo: 'domingo_tarde',
            posicion: 6,
            semana_iso: 28,
            secuencia_desde: 13,
            secuencia_hasta: 16,
            secuencia_texto: '13 al 16',
        },
    ],
    asignaciones: [],
    miembros: [],
}

function renderPanel() {
    return render(
        <OfrendaFeedbackProvider>
            <PlanoGeneratePanel plan={plan} anio={2026} mes={7} canEdit onGenerated={() => {}} />
        </OfrendaFeedbackProvider>,
    )
}

describe('PlanoGeneratePanel — acciones diferenciadas', () => {
    it('muestra tres acciones con estilos distintos e icono info cada una', () => {
        renderPanel()

        const generar = screen.getByTestId('ofrenda-plano-generate-generar')
        const regenerar = screen.getByTestId('ofrenda-plano-generate-regenerar')
        const rellenar = screen.getByTestId('ofrenda-plano-generate-rellenar')

        expect(generar.className).toContain('from-[#1f2e85]')
        expect(generar.className).toContain('border-[#b8964a]')
        expect(regenerar.className).toContain('bg-[#f8f3e8]')
        expect(regenerar.className).not.toContain('from-[#1f2e85]')
        expect(rellenar.className).toContain('bg-white')
        expect(rellenar.className).not.toContain('from-[#1f2e85]')

        expect(screen.getByTestId('ofrenda-plano-generate-info-generar')).toBeTruthy()
        expect(screen.getByTestId('ofrenda-plano-generate-info-regenerar')).toBeTruthy()
        expect(screen.getByTestId('ofrenda-plano-generate-info-rellenar')).toBeTruthy()
    })

    it('selector de alcance usa navy corporativo (liquid), no naranja', () => {
        renderPanel()
        const month = screen.getByTestId('ofrenda-plano-generate-scope-month')
        expect(month.className).toContain('from-[#1f2e85]')
        expect(month.className).not.toContain('amber')
    })
})

describe('PlanoGeneratePanel — selector de semana liquid', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('modo semana muestra trigger liquid en lugar de select nativo', async () => {
        renderPanel()
        fireEvent.click(screen.getByTestId('ofrenda-plano-generate-scope-week'))
        await waitFor(() => {
            expect(screen.getByTestId('plano-generate-week-trigger')).toBeTruthy()
        })
        expect(screen.queryByRole('combobox')).toBeNull()
    })

    it('abre OfrendaLiquidShell con opciones de semana y estado de relleno', async () => {
        renderPanel()
        fireEvent.click(screen.getByTestId('ofrenda-plano-generate-scope-week'))
        await waitFor(() => screen.getByTestId('plano-generate-week-trigger'))
        fireEvent.click(screen.getByTestId('plano-generate-week-trigger'))

        expect(screen.getByTestId('plano-generate-week-sheet')).toBeTruthy()
        expect(screen.getByTestId('plano-generate-week-option-27')).toBeTruthy()
        expect(screen.getByTestId('plano-generate-week-option-28')).toBeTruthy()
        expect(screen.getByTestId('plano-generate-week-trigger-status').textContent).toContain(
            'ofrenda.planoGenerate.weekFill.partial',
        )
    })

    it('seleccionar otra semana cierra el sheet y actualiza trigger', async () => {
        renderPanel()
        fireEvent.click(screen.getByTestId('ofrenda-plano-generate-scope-week'))
        await waitFor(() => screen.getByTestId('plano-generate-week-trigger'))
        fireEvent.click(screen.getByTestId('plano-generate-week-trigger'))
        fireEvent.click(screen.getByTestId('plano-generate-week-option-28'))

        await waitFor(() => {
            expect(screen.queryByTestId('plano-generate-week-sheet')).toBeNull()
        })
        expect(screen.getByTestId('plano-generate-week-trigger-status').textContent).toContain(
            'ofrenda.planoGenerate.weekFill.empty',
        )
    })
})
