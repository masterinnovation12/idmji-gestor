import { describe, it, expect } from 'vitest'
import { buildAllLayoutSeeds } from './planoSeed'

describe('buildAllLayoutSeeds', () => {
    it('genera 4 packs (2 modos × 2 vistas)', () => {
        const seeds = buildAllLayoutSeeds()
        expect(seeds).toHaveLength(4)
        expect(seeds.map(s => `${s.vista}:${s.modo}`).sort()).toEqual([
            '2d:sacos_4',
            '2d:sacos_8',
            '3d:sacos_4',
            '3d:sacos_8',
        ])
    })

    it('2d usa fondo svg y 3d jpg', () => {
        const seeds = buildAllLayoutSeeds()
        expect(seeds.find(s => s.vista === '2d')?.fondo).toBe('svg')
        expect(seeds.find(s => s.vista === '3d')?.fondo).toBe('jpg')
    })
})
