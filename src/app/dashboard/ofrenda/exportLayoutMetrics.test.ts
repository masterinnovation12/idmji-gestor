import { describe, it, expect } from 'vitest'

import {
    exportImageLayoutWidthPx,
    exportLayoutWidthPx,
    exportPdfColumnLayout,
    exportPdfHeaderHeightMm,
    EXPORT_LAYOUT_MIN_PX,
    EXPORT_WEEK_LAYOUT_WIDTH_PX,
} from './exportLayoutMetrics'

describe('exportLayoutMetrics', () => {
    it('ancho minimo 1600 y crece con mas servicios', () => {
        expect(exportLayoutWidthPx(3)).toBe(EXPORT_LAYOUT_MIN_PX)
        expect(exportLayoutWidthPx(20)).toBeGreaterThan(EXPORT_LAYOUT_MIN_PX)
        expect(exportLayoutWidthPx(3)).toBe(exportLayoutWidthPx(12))
    })

    it('JPG semanal usa lienzo vertical movil', () => {
        expect(exportImageLayoutWidthPx(3, 'week')).toBe(EXPORT_WEEK_LAYOUT_WIDTH_PX)
        expect(exportImageLayoutWidthPx(3, 'month')).toBe(EXPORT_LAYOUT_MIN_PX)
    })

    it('PDF reparte todo el ancho imprimible entre columnas', () => {
        const marginX = 12
        const pageW = 297
        const printableW = pageW - marginX * 2
        const { firstColW, colW, tableW, tableX } = exportPdfColumnLayout(pageW, marginX, 3)

        expect(tableX).toBe(marginX)
        expect(tableW).toBe(printableW)
        expect(firstColW + 3 * colW).toBeCloseTo(printableW, 5)
    })

    it('cabecera PDF mas alta con subtitulo de semana', () => {
        expect(exportPdfHeaderHeightMm(true)).toBe(54)
        expect(exportPdfHeaderHeightMm(false)).toBe(46)
        expect(exportPdfHeaderHeightMm(true)).toBeGreaterThan(exportPdfHeaderHeightMm(false))
    })
})
