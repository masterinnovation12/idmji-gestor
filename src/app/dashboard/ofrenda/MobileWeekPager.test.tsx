/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileWeekPager } from './MobileWeekPager'

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'ofrenda.week.prev': 'Anterior',
                'ofrenda.week.next': 'Siguiente',
                'ofrenda.week.of': 'Semana {current} de {total}',
                'ofrenda.week.swipeHint': 'Desliza horizontalmente',
            }
            return map[key] ?? key
        },
        language: 'es',
    }),
}))

describe('MobileWeekPager', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(() => ({
                matches: true,
                media: '',
                onchange: null,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        })
    })

    it('renderiza área swipe y cambia semana con flecha', () => {
        const onPageChange = vi.fn()
        render(
            <MobileWeekPager
                weeksCount={4}
                currentPage={1}
                onPageChange={onPageChange}
                weekLabel="Semana 2 de 4"
                weekRangeLabel="7 – 10 may"
            >
                <p>Contenido semana</p>
            </MobileWeekPager>,
        )

        expect(screen.getByTestId('ofrenda-week-swipe-area')).toBeInTheDocument()
        expect(screen.getByText('Contenido semana')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
        expect(onPageChange).toHaveBeenCalledWith(2)
    })

    it('swipe horizontal avanza de semana', () => {
        const onPageChange = vi.fn()
        render(
            <MobileWeekPager
                weeksCount={3}
                currentPage={0}
                onPageChange={onPageChange}
                weekLabel="Semana 1 de 3"
            >
                <p>S1</p>
            </MobileWeekPager>,
        )

        const area = screen.getByTestId('ofrenda-week-swipe-area')

        fireEvent.touchStart(area, {
            touches: [{ clientX: 200, clientY: 100 }],
        })
        fireEvent.touchMove(area, {
            touches: [{ clientX: 120, clientY: 102 }],
        })
        fireEvent.touchEnd(area, {
            changedTouches: [{ clientX: 100, clientY: 103 }],
        })

        expect(onPageChange).toHaveBeenCalledWith(1)
    })

    it('muestra resistencia visual en primera semana al tirar a la derecha', () => {
        render(
            <MobileWeekPager
                weeksCount={3}
                currentPage={0}
                onPageChange={vi.fn()}
                weekLabel="Semana 1 de 3"
            >
                <p>S1</p>
            </MobileWeekPager>,
        )

        const area = screen.getByTestId('ofrenda-week-swipe-area')

        fireEvent.touchStart(area, {
            touches: [{ clientX: 100, clientY: 100 }],
        })
        fireEvent.touchMove(area, {
            touches: [{ clientX: 160, clientY: 102 }],
        })

        expect(screen.getByTestId('ofrenda-week-edge-start')).toBeInTheDocument()
    })
})
