/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlanoGeneratePanel } from './PlanoGeneratePanel'
import type { PlanCompleto } from '../actions'
import { OfrendaFeedbackProvider } from '../ofrendaFeedback'

vi.mock('./planoGenerateActions', () => ({
    generarPlanoLabor: vi.fn(),
}))

vi.mock('./planoInvoke', () => ({
    invokePlanoAction: vi.fn(),
}))

vi.mock('../OfrendaLiquidShell', () => ({
    OfrendaLiquidShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
        mes: 6,
        sacos_jueves: 4,
        sacos_domingo: 8,
        sacos_domingo_tarde: 4,
        secuencia_maximo: 20,
        secuencia_puntero: 1,
        secuencia_puntero_fin: 20,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
    },
    servicios: [
        {
            id: 's1',
            plan_id: 'p1',
            fecha: '2026-06-25',
            dia_tipo: 'jueves',
            posicion: 1,
            semana_iso: 26,
            secuencia_desde: 1,
            secuencia_hasta: 4,
            secuencia_texto: '01 al 04',
        },
    ],
    asignaciones: [],
    miembros: [],
}

function renderPanel() {
    return render(
        <OfrendaFeedbackProvider>
            <PlanoGeneratePanel plan={plan} anio={2026} mes={6} canEdit onGenerated={() => {}} />
        </OfrendaFeedbackProvider>,
    )
}

describe('PlanoGeneratePanel — acciones diferenciadas', () => {
    it('muestra tres acciones con estilos distintos e icono info cada una', () => {
        renderPanel()

        const generar = screen.getByTestId('ofrenda-plano-generate-generar')
        const regenerar = screen.getByTestId('ofrenda-plano-generate-regenerar')
        const rellenar = screen.getByTestId('ofrenda-plano-generate-rellenar')

        expect(generar.className).toContain('bg-blue-600')
        expect(regenerar.className).toContain('border-2')
        expect(regenerar.className).toContain('border-blue-600')
        expect(rellenar.className).toContain('border-blue-500/40')
        expect(rellenar.className).not.toContain('bg-blue-600')

        expect(screen.getByTestId('ofrenda-plano-generate-info-generar')).toBeTruthy()
        expect(screen.getByTestId('ofrenda-plano-generate-info-regenerar')).toBeTruthy()
        expect(screen.getByTestId('ofrenda-plano-generate-info-rellenar')).toBeTruthy()
    })

    it('selector de alcance usa azul corporativo, no naranja', () => {
        renderPanel()
        const month = screen.getByTestId('ofrenda-plano-generate-scope-month')
        expect(month.className).toContain('bg-blue-600')
        expect(month.className).not.toContain('amber')
    })
})
