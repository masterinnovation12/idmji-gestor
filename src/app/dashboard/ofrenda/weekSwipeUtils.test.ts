import { describe, it, expect } from 'vitest'
import {
    applyWeekSwipeRubberBand,
    resolveWeekSwipePage,
    weekSwipeEdgeGlow,
    WEEK_SWIPE_OFFSET_THRESHOLD,
    WEEK_SWIPE_VELOCITY_THRESHOLD,
} from './weekSwipeUtils'

describe('weekSwipeUtils', () => {
    it('aplica rubber band al inicio y al final', () => {
        expect(applyWeekSwipeRubberBand(100, true, false)).toBeLessThan(30)
        expect(applyWeekSwipeRubberBand(-100, false, true)).toBeGreaterThan(-30)
        expect(applyWeekSwipeRubberBand(80, false, false)).toBe(80)
    })

    it('resuelve página siguiente con offset', () => {
        expect(
            resolveWeekSwipePage(
                -(WEEK_SWIPE_OFFSET_THRESHOLD + 10),
                0,
                1,
                4,
            ),
        ).toBe(2)
    })

    it('resuelve página anterior con flick', () => {
        expect(
            resolveWeekSwipePage(
                10,
                WEEK_SWIPE_VELOCITY_THRESHOLD + 50,
                2,
                4,
            ),
        ).toBe(1)
    })

    it('no avanza en la última semana', () => {
        expect(
            resolveWeekSwipePage(-200, -500, 3, 4),
        ).toBe(3)
    })

    it('no retrocede en la primera semana', () => {
        expect(
            resolveWeekSwipePage(200, 500, 0, 4),
        ).toBe(0)
    })

    it('indica brillo de borde en extremos', () => {
        expect(weekSwipeEdgeGlow(40, 0, 4)).toBe('start')
        expect(weekSwipeEdgeGlow(-40, 3, 4)).toBe('end')
        expect(weekSwipeEdgeGlow(-40, 1, 4)).toBeNull()
    })
})
