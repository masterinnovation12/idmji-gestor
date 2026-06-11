/**
 * Tests del motor puro de geometría del plano 2D (planoLayout.ts).
 * Valida la config real de asientos (662), la numeración derecha→izquierda
 * y el mapeo de colores bloque↔columna en modos 4 y 8 sacos.
 */
import { describe, it, expect } from 'vitest'
import {
    TEMPLO_SABADELL,
    totalAsientos,
    colorAsiento,
    computePlanoSvgGeometry,
    pulpitoBounds,
} from './planoLayout'
import { PLANO_CALIBRACION, getPlanoVista } from './planoData'

const layout2d = PLANO_CALIBRACION.vistas['2d'].layout
const bloques8 = PLANO_CALIBRACION.vistas['2d'].sacos_8.bloques
const bloques4 = PLANO_CALIBRACION.vistas['2d'].sacos_4.bloques

describe('TEMPLO_SABADELL (config real de asientos)', () => {
    it('tiene 662 asientos en total (18×8 + 20×11 + 17×10 + 16×8)', () => {
        expect(totalAsientos()).toBe(662)
    })

    it('define 4 columnas numeradas 1–4', () => {
        expect(TEMPLO_SABADELL.columnas.map(c => c.n)).toEqual([1, 2, 3, 4])
    })
})

describe('colorAsiento (mapeo bloque ↔ columna/sección)', () => {
    it('modo 8: columna 1 delantera = bloque 1, trasera = bloque 5', () => {
        expect(colorAsiento('sacos_8', bloques8, 1, true)).toBe(bloques8.find(b => b.n === 1)?.color)
        expect(colorAsiento('sacos_8', bloques8, 1, false)).toBe(bloques8.find(b => b.n === 5)?.color)
    })

    it('modo 8: columna 4 delantera = bloque 4, trasera = bloque 8', () => {
        expect(colorAsiento('sacos_8', bloques8, 4, true)).toBe(bloques8.find(b => b.n === 4)?.color)
        expect(colorAsiento('sacos_8', bloques8, 4, false)).toBe(bloques8.find(b => b.n === 8)?.color)
    })

    it('modo 4: la columna completa usa el color de su bloque', () => {
        for (const col of [1, 2, 3, 4]) {
            const esperado = bloques4.find(b => b.n === col)?.color
            expect(colorAsiento('sacos_4', bloques4, col, true)).toBe(esperado)
            expect(colorAsiento('sacos_4', bloques4, col, false)).toBe(esperado)
        }
    })
})

describe('computePlanoSvgGeometry', () => {
    const geo8 = computePlanoSvgGeometry(layout2d, 'sacos_8', bloques8)
    const geo4 = computePlanoSvgGeometry(layout2d, 'sacos_4', bloques4)

    it('genera 662 asientos en ambos modos', () => {
        expect(geo8.seats).toHaveLength(662)
        expect(geo4.seats).toHaveLength(662)
    })

    it('todos los asientos caben dentro del lienzo', () => {
        for (const s of geo8.seats) {
            expect(s.x).toBeGreaterThanOrEqual(0)
            expect(s.y).toBeGreaterThanOrEqual(0)
            expect(s.x + s.w).toBeLessThanOrEqual(geo8.lienzo.w)
            expect(s.y + s.h).toBeLessThanOrEqual(geo8.lienzo.h)
        }
    })

    it('columna 1 a la derecha y columna 4 a la izquierda (vista desde el púlpito)', () => {
        // Las etiquetas se generan en orden de columna 1→4; sus x deben decrecer.
        const xs = geo8.columnaLabels.map(l => l.x)
        expect(xs[0]).toBeGreaterThan(xs[1])
        expect(xs[1]).toBeGreaterThan(xs[2])
        expect(xs[2]).toBeGreaterThan(xs[3])
    })

    it('etiquetas de columna con el formato "Columna N · filas×asientos"', () => {
        expect(geo8.columnaLabels.map(l => l.text)).toEqual([
            'Columna 1 · 18×8',
            'Columna 2 · 20×11',
            'Columna 3 · 17×10',
            'Columna 4 · 16×8',
        ])
    })

    it('el púlpito cabe en el lienzo y no pisa la primera fila de asientos', () => {
        const b = pulpitoBounds(layout2d.pulpito)
        expect(b.y).toBeGreaterThanOrEqual(0)
        expect(b.y + b.h).toBeLessThanOrEqual(layout2d.lienzo.h + 30) // +30: rótulo inferior
        const maxSeatBottom = Math.max(...geo8.seats.map(s => s.y + s.h))
        expect(b.y).toBeGreaterThan(maxSeatBottom)
    })
})

describe('getPlanoVista (datos resueltos por vista+modo)', () => {
    it('2D no tiene foto de fondo; 3D apunta a /plano-templo/', () => {
        expect(getPlanoVista('2d', 'sacos_8').fondoUrl).toBeNull()
        expect(getPlanoVista('3d', 'sacos_8').fondoUrl).toBe('/plano-templo/plano-3d-sacos-8.jpg')
        expect(getPlanoVista('3d', 'sacos_4').fondoUrl).toBe('/plano-templo/plano-3d-sacos-4.jpg')
    })

    it('cada combinación tiene los bloques y posiciones esperados', () => {
        for (const vista of ['2d', '3d'] as const) {
            const v8 = getPlanoVista(vista, 'sacos_8')
            const v4 = getPlanoVista(vista, 'sacos_4')
            expect(v8.bloques).toHaveLength(8)
            expect(v8.posiciones).toHaveLength(16)
            expect(v4.bloques).toHaveLength(4)
            expect(v4.posiciones).toHaveLength(8)
        }
    })

    it('todas las posiciones caen dentro del lienzo de su vista', () => {
        for (const vista of ['2d', '3d'] as const) {
            for (const modo of ['sacos_8', 'sacos_4'] as const) {
                const v = getPlanoVista(vista, modo)
                for (const p of v.posiciones) {
                    for (const punto of [p.card, p.figura]) {
                        expect(punto.x).toBeGreaterThanOrEqual(0)
                        expect(punto.x).toBeLessThanOrEqual(v.lienzo.w)
                        expect(punto.y).toBeGreaterThanOrEqual(0)
                        expect(punto.y).toBeLessThanOrEqual(v.lienzo.h)
                    }
                }
            }
        }
    })

    it('los ids de posiciones son únicos y siguen el patrón B<bloque>-<rol>', () => {
        for (const vista of ['2d', '3d'] as const) {
            for (const modo of ['sacos_8', 'sacos_4'] as const) {
                const v = getPlanoVista(vista, modo)
                const ids = v.posiciones.map(p => p.id)
                expect(new Set(ids).size).toBe(ids.length)
                for (const p of v.posiciones) {
                    expect(p.id).toBe(`B${p.bloque}-${p.rol}`)
                }
            }
        }
    })
})
