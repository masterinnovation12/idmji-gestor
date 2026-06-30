/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    computeSquareHeaderBlockLayout,
    SQUARE_HEADER_HEIGHT,
    SQUARE_HEADER_LOGO,
    squareHeaderBlockFits,
    squareHeaderContentHeight,
    squareHeaderIsVerticallyCentered,
} from './laborOfrendaHeaderSquareLayout'

describe('laborOfrendaHeaderSquareLayout — cabecera lista organizada', () => {
    const width = 1080

    it('altura fija 220px (más espacio para tabla)', () => {
        expect(SQUARE_HEADER_HEIGHT).toBe(220)
        expect(SQUARE_HEADER_LOGO).toBe(84)
    })

    it('bloque logo + 3 líneas cabe en el canvas', () => {
        const layout = computeSquareHeaderBlockLayout(width)
        expect(squareHeaderBlockFits(layout)).toBe(true)
        expect(layout.height).toBe(SQUARE_HEADER_HEIGHT)
    })

    it('bloque centrado verticalmente (±4px)', () => {
        const layout = computeSquareHeaderBlockLayout(width)
        expect(squareHeaderIsVerticallyCentered(layout)).toBe(true)
    })

    it('orden jerárquico: logo → iglesia → título → fecha', () => {
        const l = computeSquareHeaderBlockLayout(width)
        expect(l.churchY).toBeGreaterThan(l.logoY + l.logoOuter)
        expect(l.titleY).toBeGreaterThan(l.churchY)
        expect(l.subtitleY).toBeGreaterThan(l.titleY)
    })

    it('tipografía: iglesia pequeña, título dominante, fecha intermedia', () => {
        const l = computeSquareHeaderBlockLayout(width)
        expect(l.churchFontPx).toBeLessThan(l.subtitleFontPx)
        expect(l.subtitleFontPx).toBeLessThan(l.titleFontPx)
        expect(l.titleFontPx).toBeGreaterThanOrEqual(28)
    })

    it('textMax deja margen lateral 40px', () => {
        const l = computeSquareHeaderBlockLayout(width)
        expect(l.textMax).toBe(width - 80)
    })

    it('contenido más compacto que cabecera antigua 236px', () => {
        const contentH = squareHeaderContentHeight()
        expect(contentH).toBeLessThan(236)
        expect(SQUARE_HEADER_HEIGHT).toBeLessThan(236)
    })
})
