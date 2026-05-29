import { describe, it, expect } from 'vitest'
import {
    scrollLeftForWeekIndex,
    weekIndexFromScrollLeft,
    isServiceColumnClearOfStickyRole,
    PLAN_STICKY_SCROLL_PADDING_PX,
} from './planTableScroll'
import { PLAN_SERVICE_COL_WIDTH_PX } from './planTableLayout'

describe('planTableScroll', () => {
    it('scrollLeft semana 0 = 0', () => {
        expect(scrollLeftForWeekIndex(0)).toBe(0)
    })

    it('scrollLeft semana 1 = 3 columnas de servicio', () => {
        expect(scrollLeftForWeekIndex(1)).toBe(3 * PLAN_SERVICE_COL_WIDTH_PX)
    })

    it('scrollLeft semana 2', () => {
        expect(scrollLeftForWeekIndex(2)).toBe(6 * PLAN_SERVICE_COL_WIDTH_PX)
    })

    it('weekIndexFromScrollLeft es inverso aproximado', () => {
        expect(weekIndexFromScrollLeft(0)).toBe(0)
        expect(weekIndexFromScrollLeft(scrollLeftForWeekIndex(1))).toBe(1)
        expect(weekIndexFromScrollLeft(scrollLeftForWeekIndex(2))).toBe(2)
    })

    it('padding sticky coincide con ancho columna rol', () => {
        expect(PLAN_STICKY_SCROLL_PADDING_PX).toBe(180)
    })

    it('detecta solapamiento rol vs servicio', () => {
        const role = { left: 0, right: 180, top: 0, bottom: 40 } as DOMRectReadOnly
        const under = { left: 120, right: 240, top: 0, bottom: 40 } as DOMRectReadOnly
        const clear = { left: 184, right: 304, top: 0, bottom: 40 } as DOMRectReadOnly
        expect(isServiceColumnClearOfStickyRole(role, under)).toBe(false)
        expect(isServiceColumnClearOfStickyRole(role, clear)).toBe(true)
    })
})
