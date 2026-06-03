import { describe, it, expect } from 'vitest'
import {
    computePdfHeaderMeasurements,
    EXPORT_HEADER_LOGO_GAP_MM,
    EXPORT_HEADER_LOGO_MM,
} from './exportHeaderLayout'

describe('exportHeaderLayout — cabecera centrada', () => {
    it('cluster queda centrado en la página PDF', () => {
        const pageW = 297
        const churchW = 80
        const titleRowW = 120
        const badgeW = 0
        const legendW = 90
        const m = computePdfHeaderMeasurements(pageW, churchW, titleRowW, badgeW, legendW)

        expect(m.clusterW).toBe(EXPORT_HEADER_LOGO_MM + EXPORT_HEADER_LOGO_GAP_MM + 120)
        expect(m.clusterStartX).toBeCloseTo((pageW - m.clusterW) / 2, 5)
        expect(m.textCenterX).toBeCloseTo(
            m.clusterStartX + EXPORT_HEADER_LOGO_MM + EXPORT_HEADER_LOGO_GAP_MM + m.textBlockW / 2,
            5,
        )
        expect(m.legendStartX).toBeCloseTo(m.textCenterX - legendW / 2, 5)
    })

    it('textCenterX coincide con el centro geométrico del bloque de texto', () => {
        const pageW = 420
        const m = computePdfHeaderMeasurements(pageW, 50, 200, 60, 100)
        const textLeft = m.clusterStartX + EXPORT_HEADER_LOGO_MM + EXPORT_HEADER_LOGO_GAP_MM
        expect(m.textCenterX).toBeCloseTo(textLeft + m.textBlockW / 2, 5)
    })
})
