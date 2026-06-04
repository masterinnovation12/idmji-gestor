/**
 * @vitest-environment happy-dom
 * QA: una sola vista (móvil vs desktop) y columnas desktop sin colapsar.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { scrollLeftForWeekIndex } from './planTableScroll'
import { PlanTable } from './PlanTable'
import type { PlanCompleto, OfrMiembro } from './actions'
import { planTableMinWidthPx } from './planTableLayout'
import { makeOfrMiembro } from './ofrendaTestFixtures'

const miembros: OfrMiembro[] = [
    makeOfrMiembro({
        id: 'm1',
        nombre: 'Ana Test',
        grupo: 1,
        orden: 0,
    }),
]

function buildPlan(serviceCount: number): PlanCompleto {
    const servicios = Array.from({ length: serviceCount }, (_, i) => ({
        id: `s${i}`,
        plan_id: 'p1',
        fecha: `2026-05-${String(7 + i).padStart(2, '0')}`,
        dia_tipo: (i % 3 === 0 ? 'jueves' : i % 3 === 1 ? 'domingo' : 'domingo_tarde') as const,
        semana_iso: 19 + Math.floor(i / 3),
        mes: 5,
        anio: 2026,
        secuencia_desde: 1,
        secuencia_hasta: 4,
        secuencia_texto: '01 al 04',
    }))

    return {
        plan: {
            id: 'p1',
            mes: 5,
            anio: 2026,
            sacos_jueves: 4,
            sacos_domingo: 8,
            sacos_domingo_tarde: 4,
            created_at: '2026-01-01T00:00:00Z',
        },
        servicios,
        asignaciones: [],
    }
}

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const map: Record<string, string> = {
                'ofrenda.table.rolFecha': 'Rol / Fecha',
                'ofrenda.table.sacos': 'Sacos',
                'ofrenda.legend.jueves': 'Jueves',
                'ofrenda.legend.domManana': 'Dom. mañana',
                'ofrenda.legend.domTarde': 'Dom. tarde',
                'ofrenda.scrollHint': 'Desliza horizontalmente',
                'ofrenda.week.of': 'Semana {current} de {total}',
                'ofrenda.week.short': 'S.{n}',
                'ofrenda.week.swipeHint': 'Desliza para cambiar semana',
                'ofrenda.week.prev': 'Anterior',
                'ofrenda.week.next': 'Siguiente',
                'ofrenda.roles.realiza': 'Realiza la labor',
                'ofrenda.roles.apoyo': 'Apoyo',
                'ofrenda.roles.vigilancia': 'Vigilancia',
                'ofrenda.roles.colaborador': 'Colaborador',
                'ofrenda.days.jueShort': 'Jue',
                'ofrenda.days.domShort': 'Dom',
                'ofrenda.days.manana': 'Mañana',
                'ofrenda.days.tarde': 'Tarde',
            }
            return map[key] ?? key
        },
        language: 'es',
    }),
}))

vi.mock('./ofrendaFeedback', () => ({
    useOfrendaToast: () => ({
        quickSuccess: vi.fn(),
        quickWarning: vi.fn(),
        quickError: vi.fn(),
    }),
}))

const mobileMock = vi.fn(() => true)
vi.mock('./ofrendaViewport', () => ({
    useOfrendaMobileOrTablet: () => mobileMock(),
    useOfrendaClientMounted: () => true,
}))

describe('PlanTable — layout móvil vs desktop', () => {
    beforeEach(() => {
        mobileMock.mockReset()
    })

    it('desktop: solo tabla, sin pager móvil ni hint de swipe', () => {
        mobileMock.mockReturnValue(false)
        render(
            <PlanTable
                plan={buildPlan(6)}
                miembros={miembros}
                canEdit
                onAsignacionChange={vi.fn()}
            />,
        )

        expect(screen.getByTestId('ofrenda-plan-desktop')).toBeInTheDocument()
        expect(screen.getByTestId('ofrenda-plan-desktop-table')).toBeInTheDocument()
        expect(screen.queryByTestId('ofrenda-mobile-week-pager')).not.toBeInTheDocument()
        expect(screen.queryByText('Desliza para cambiar semana')).not.toBeInTheDocument()
        expect(screen.getByText('Rol / Fecha')).toBeInTheDocument()
    })

    it('desktop: tabla con table-layout fixed y ancho mínimo correcto', () => {
        mobileMock.mockReturnValue(false)
        const serviceCount = 9
        render(
            <PlanTable
                plan={buildPlan(serviceCount)}
                miembros={miembros}
                canEdit
                onAsignacionChange={vi.fn()}
            />,
        )

        const table = screen.getByTestId('ofrenda-plan-desktop-table')
        expect(table).toHaveStyle({
            tableLayout: 'fixed',
            minWidth: `${planTableMinWidthPx(serviceCount)}px`,
        })
        expect(table.querySelectorAll('colgroup col')).toHaveLength(serviceCount + 1)
    })

    it('desktop: contenedor de scroll inicia en scrollLeft 0', () => {
        mobileMock.mockReturnValue(false)
        render(
            <PlanTable
                plan={buildPlan(9)}
                miembros={miembros}
                canEdit
                onAsignacionChange={vi.fn()}
            />,
        )

        const scroll = screen.getByTestId('ofrenda-plan-desktop-scroll') as HTMLDivElement
        expect(scroll.scrollLeft).toBe(0)
    })

    it('desktop: scroll con padding para columna Rol fija (anti-solape)', () => {
        mobileMock.mockReturnValue(false)
        render(
            <PlanTable
                plan={buildPlan(9)}
                miembros={miembros}
                canEdit
                onAsignacionChange={vi.fn()}
            />,
        )

        const scroll = screen.getByTestId('ofrenda-plan-desktop-scroll')
        expect(scroll).toHaveClass('ofrenda-plan-desktop-scroll')
        expect(screen.getByTestId('ofrenda-plan-sticky-role-header')).toHaveClass(
            'ofrenda-plan-sticky-role',
        )
        expect(screen.getByTestId('ofrenda-plan-desktop')).toHaveClass('ofrenda-plan-desktop-shell')
    })

    it('desktop: navegador semana 2 aplica scrollLeft alineado (3 columnas)', () => {
        mobileMock.mockReturnValue(false)
        render(
            <PlanTable
                plan={buildPlan(9)}
                miembros={miembros}
                canEdit
                onAsignacionChange={vi.fn()}
            />,
        )

        expect(document.querySelector('[data-week-col="1"]')).toBeTruthy()
        const scroll = screen.getByTestId('ofrenda-plan-desktop-scroll') as HTMLDivElement
        Object.defineProperty(scroll, 'scrollWidth', { value: 2000, configurable: true })
        Object.defineProperty(scroll, 'clientWidth', { value: 800, configurable: true })
        scroll.scrollTo = vi.fn((opts?: ScrollToOptions) => {
            if (typeof opts?.left === 'number') scroll.scrollLeft = opts.left
        }) as typeof scroll.scrollTo

        fireEvent.click(screen.getByTestId('ofrenda-desktop-week-2'))

        expect(scroll.scrollTo).toHaveBeenCalledWith(
            expect.objectContaining({ left: scrollLeftForWeekIndex(1) }),
        )
        expect(scroll.scrollLeft).toBe(360)
    })

    it('móvil: solo pager, sin tabla desktop', () => {
        mobileMock.mockReturnValue(true)
        render(
            <PlanTable
                plan={buildPlan(6)}
                miembros={miembros}
                canEdit
                onAsignacionChange={vi.fn()}
            />,
        )

        expect(screen.getByTestId('ofrenda-mobile-week-pager')).toBeInTheDocument()
        expect(screen.queryByTestId('ofrenda-plan-desktop-table')).not.toBeInTheDocument()
    })
})
