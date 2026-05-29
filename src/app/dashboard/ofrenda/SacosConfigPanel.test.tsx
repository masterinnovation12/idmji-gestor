/**
 * @vitest-environment happy-dom
 */
import type { ComponentProps } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SacosConfigPanel } from './SacosConfigPanel'
import type { OfrPlan } from './actions'
import { OfrendaFeedbackProvider } from './ofrendaFeedback'

const plan: OfrPlan = {
    id: 'plan-1',
    mes: 5,
    anio: 2026,
    sacos_jueves: 4,
    sacos_domingo: 8,
    sacos_domingo_tarde: 4,
    secuencia_maximo: 20,
    secuencia_puntero: 1,
    secuencia_puntero_fin: 5,
    updated_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
}

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'ofrenda.sacos.configTitle': 'Configuración de sacos por servicio',
                'ofrenda.sacos.configDesc': 'Cantidad de sacos por tipo de servicio.',
                'ofrenda.sacos.jueves': 'Jueves',
                'ofrenda.sacos.domingo': 'Dom. mañana',
                'ofrenda.sacos.domingoTarde': 'Dom. tarde',
                'ofrenda.sacos.apply': 'Aplicar y recalcular',
                'ofrenda.toast.sacosInvalid': 'Valores incorrectos',
                'ofrenda.toast.sacosInvalidDesc': 'Entre 1 y 20.',
                'common.cancel': 'Cancelar',
                'ofrenda.sacos.secuenciaMax': 'Máximo del ciclo',
                'ofrenda.sacos.secuenciaMaxHint': 'Ciclo 1 a N.',
            }
            return map[key] ?? key
        },
        language: 'es',
    }),
}))

function renderPanel(props: Partial<ComponentProps<typeof SacosConfigPanel>> = {}) {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(
        <OfrendaFeedbackProvider>
            <SacosConfigPanel
                plan={plan}
                isLoading={false}
                onUpdate={onUpdate}
                {...props}
            />
        </OfrendaFeedbackProvider>,
    )
    return { onUpdate }
}

function openPanel() {
    fireEvent.click(screen.getByTestId('ofrenda-sacos-config-toggle'))
}

describe('SacosConfigPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('cabecera navy legible (texto blanco, no muted)', () => {
        renderPanel()
        const toggle = screen.getByTestId('ofrenda-sacos-config-toggle')
        expect(toggle).toHaveClass('from-[#1f2e85]')
        expect(screen.getByText('Configuración de sacos por servicio')).toHaveClass('text-white')
    })

    it('etiquetas solo día, sin palabra Sacos', () => {
        renderPanel()
        openPanel()

        expect(screen.getByText('Jueves')).toBeInTheDocument()
        expect(screen.getByText('Dom. mañana')).toBeInTheDocument()
        expect(screen.getByText('Dom. tarde')).toBeInTheDocument()
        expect(screen.queryByText(/sacos jueves/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/^sacos$/i)).not.toBeInTheDocument()
    })

    it('inputs sin spinners, teclado numérico y label asociado al campo (móvil)', () => {
        renderPanel()
        openPanel()

        const field = screen.getByTestId('ofrenda-sacos-jueves')
        const input = field.querySelector('input') as HTMLInputElement

        expect(input.className).toMatch(/appearance-none/)
        expect(input).toHaveAttribute('inputmode', 'numeric')
        expect(field).toHaveAttribute('for', input.id)
        expect(field.tagName).toBe('LABEL')
        expect(input.className).toMatch(/min-h-\[48px\]/)
    })

    it('aplicar invoca onUpdate con valores actuales', () => {
        const { onUpdate } = renderPanel()
        openPanel()

        const input = screen
            .getByTestId('ofrenda-sacos-jueves')
            .querySelector('input') as HTMLInputElement
        fireEvent.change(input, { target: { value: '6' } })

        fireEvent.click(screen.getByTestId('ofrenda-sacos-apply'))

        expect(onUpdate).toHaveBeenCalledWith(6, 8, 4, 20)
    })

    it('muestra campo máximo del ciclo de secuencia', () => {
        renderPanel()
        openPanel()
        expect(screen.getByTestId('ofrenda-sacos-secuencia-max')).toBeInTheDocument()
        expect(screen.getByText('Máximo del ciclo')).toBeInTheDocument()
    })
})
