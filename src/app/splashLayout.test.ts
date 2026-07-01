/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    computeSplashBadgeLayout,
    SPLASH_IPHONE_HEIGHT,
    SPLASH_IPHONE_WIDTH,
} from './splashLayout'

describe('computeSplashBadgeLayout', () => {
    const layout = computeSplashBadgeLayout(SPLASH_IPHONE_WIDTH, SPLASH_IPHONE_HEIGHT)

    it('centra el badge en el lienzo', () => {
        expect(layout.left).toBe(Math.round((SPLASH_IPHONE_WIDTH - layout.size) / 2))
        expect(layout.top).toBe(Math.round((SPLASH_IPHONE_HEIGHT - layout.size) / 2))
    })

    it('el badge cabe en el lienzo con margen', () => {
        expect(layout.size).toBeLessThan(SPLASH_IPHONE_WIDTH)
        expect(layout.size).toBeGreaterThan(0)
    })

    it('marco y radios coherentes', () => {
        expect(layout.rim).toBeGreaterThanOrEqual(6)
        expect(layout.innerRadius).toBe(Math.max(0, layout.radius - layout.rim))
    })

    it('el logo queda dentro de la zona blanca interior', () => {
        expect(layout.innerPad).toBeGreaterThan(layout.rim)
        expect(layout.logo.left).toBe(layout.left + layout.innerPad)
        expect(layout.logo.top).toBe(layout.top + layout.innerPad)
        expect(layout.logo.size).toBe(layout.size - layout.innerPad * 2)
        expect(layout.logo.left + layout.logo.size).toBeLessThanOrEqual(layout.left + layout.size)
    })

    it('escala con el lado corto para lienzos cuadrados', () => {
        const sq = computeSplashBadgeLayout(1000, 1000)
        expect(sq.size).toBe(Math.round(Math.min(1000 * 0.46, 1000 * 0.28)))
    })
})
