import { describe, it, expect } from 'vitest'
import {
    planTableMinWidthPx,
    PLAN_ROLE_COL_WIDTH_PX,
    PLAN_SERVICE_COL_WIDTH_PX,
    PLAN_ROLE_COL_STYLE,
    PLAN_SERVICE_COL_STYLE,
} from './planTableLayout'

describe('planTableLayout', () => {
    it('calcula ancho mínimo = rol + N servicios', () => {
        expect(planTableMinWidthPx(12)).toBe(PLAN_ROLE_COL_WIDTH_PX + 12 * PLAN_SERVICE_COL_WIDTH_PX)
    })

    it('fija ancho de cada columna de servicio', () => {
        expect(PLAN_SERVICE_COL_STYLE.width).toBe(120)
        expect(PLAN_ROLE_COL_STYLE.width).toBe(180)
    })
})
