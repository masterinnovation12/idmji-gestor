/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanoServiceStrip } from './PlanoServiceStrip'
import type { OfrServicio } from '../actions'

let mobileMock = false

vi.mock('../ofrendaViewport', () => ({
    OFRENDA_MOBILE_TABLET_MQ: '(max-width: 1023px)',
    useOfrendaClientMounted: () => true,
    useOfrendaMobileOrTablet: () => mobileMock(),
}))

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'ofrenda.plano.serviceSelector': 'Servicios',
                'ofrenda.plano.servicePrev': 'Anteriores',
                'ofrenda.plano.serviceNext': 'Siguientes',
            }
            return map[key] ?? key
        },
    }),
}))

const accent = {
    jueves: { on: 'on-jue', off: 'off-jue', dot: 'dot-jue' },
    domingo: { on: 'on-dom', off: 'off-dom', dot: 'dot-dom' },
    domingo_tarde: { on: 'on-tar', off: 'off-tar', dot: 'dot-tar' },
} as const

function makeServicios(n: number): OfrServicio[] {
    return Array.from({ length: n }, (_, i) => ({
        id: `srv-${i}`,
        plan_id: 'plan-1',
        fecha: `2026-06-${String(i + 1).padStart(2, '0')}`,
        dia_tipo: i % 3 === 0 ? 'jueves' : i % 3 === 1 ? 'domingo' : 'domingo_tarde',
        semana_iso: 22,
        secuencia_desde: 1,
        secuencia_hasta: 8,
        secuencia_texto: '01 al 08',
        posicion: i,
    })) as OfrServicio[]
}

describe('PlanoServiceStrip', () => {
    beforeEach(() => {
        mobileMock = vi.fn(() => false)
    })

    it('permite scroll horizontal cuando hay muchos servicios', () => {
        const servicios = makeServicios(12)
        render(
            <PlanoServiceStrip
                servicios={servicios}
                activeId="srv-0"
                accent={accent}
                diaLabel={s => `Día ${s.fecha.slice(8)}`}
                onSelect={vi.fn()}
            />,
        )
        const scroll = screen.getByTestId('plano-service-strip-scroll')
        Object.defineProperty(scroll, 'clientWidth', { value: 200, configurable: true })
        Object.defineProperty(scroll, 'scrollWidth', { value: 900, configurable: true })
        fireEvent.scroll(scroll)
        expect(scroll).toHaveClass('plano-service-strip-scroll')
        expect(scroll).toHaveClass('overflow-x-auto')
    })

    it('notifica la selección al pulsar un servicio', () => {
        const onSelect = vi.fn()
        render(
            <PlanoServiceStrip
                servicios={makeServicios(3)}
                activeId="srv-0"
                accent={accent}
                diaLabel={s => `Día ${s.fecha.slice(8)}`}
                onSelect={onSelect}
            />,
        )
        fireEvent.click(screen.getByRole('tab', { name: 'Día 02' }))
        expect(onSelect).toHaveBeenCalledWith('srv-1')
    })

    it('usa snap en móvil', () => {
        mobileMock = vi.fn(() => true)
        render(
            <PlanoServiceStrip
                servicios={makeServicios(4)}
                activeId="srv-0"
                accent={accent}
                diaLabel={s => `Día ${s.fecha.slice(8)}`}
                onSelect={vi.fn()}
            />,
        )
        const scroll = screen.getByTestId('plano-service-strip-scroll')
        expect(scroll.className).toMatch(/snap-x/)
    })

    it('en móvil desplaza horizontalmente al arrastrar sobre los chips', () => {
        mobileMock = vi.fn(() => true)
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: query.includes('max-width: 1023px'),
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        })
        const onSelect = vi.fn()
        render(
            <PlanoServiceStrip
                servicios={makeServicios(8)}
                activeId="srv-0"
                accent={accent}
                diaLabel={s => `Día ${s.fecha.slice(8)}`}
                onSelect={onSelect}
            />,
        )
        const scroll = screen.getByTestId('plano-service-strip-scroll') as HTMLDivElement
        scroll.setPointerCapture = vi.fn()
        scroll.releasePointerCapture = vi.fn()
        Object.defineProperty(scroll, 'scrollLeft', { value: 0, writable: true, configurable: true })

        fireEvent.touchStart(scroll, { touches: [{ clientX: 100, clientY: 0 }] })
        fireEvent.touchMove(scroll, { touches: [{ clientX: 60, clientY: 0 }] })
        expect(scroll.scrollLeft).toBeGreaterThan(0)

        fireEvent.touchEnd(scroll)
        fireEvent.click(screen.getByRole('tab', { name: 'Día 02' }))
        expect(onSelect).not.toHaveBeenCalled()
    })
})
