import { describe, it, expect } from 'vitest'

import {

    exportLayoutWidthPx,

    exportPdfColumnLayout,

    exportPdfHeaderHeightMm,

    EXPORT_LAYOUT_MIN_PX,

} from './exportLayoutMetrics'



describe('exportLayoutMetrics', () => {

    it('ancho mínimo 1600 y crece con más servicios', () => {

        expect(exportLayoutWidthPx(3)).toBe(EXPORT_LAYOUT_MIN_PX)

        expect(exportLayoutWidthPx(20)).toBeGreaterThan(EXPORT_LAYOUT_MIN_PX)

        expect(exportLayoutWidthPx(3)).toBe(exportLayoutWidthPx(12))

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



    it('cabecera PDF más alta con subtítulo de semana', () => {
        expect(exportPdfHeaderHeightMm(true)).toBe(54)
        expect(exportPdfHeaderHeightMm(false)).toBe(46)
        expect(exportPdfHeaderHeightMm(true)).toBeGreaterThan(exportPdfHeaderHeightMm(false))
    })

})


