import { describe, it, expect } from 'vitest'
import { clampPlanoPunto, deltaToNatural } from './planoDrag'

const lienzo = { w: 1024, h: 768 }

describe('planoDrag', () => {
    it('clampPlanoPunto respeta márgenes', () => {
        expect(clampPlanoPunto({ x: -10, y: 900 }, lienzo)).toEqual({ x: 4, y: 764 })
    })

    it('deltaToNatural convierte delta de pantalla a px del lienzo', () => {
        const start = { px: 100, py: 200, cx: 50, cy: 50, rw: 512, rh: 384 }
        const p = deltaToNatural(start, 150, 100, lienzo)
        expect(p.x).toBeGreaterThan(100)
        expect(p.y).toBeGreaterThan(200)
    })
})
