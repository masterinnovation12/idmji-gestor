/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    PERSONAS_EXPORT_SCALE,
    PERSONAS_EXPORT_WIDTH,
    computePersonasExportLayout,
} from './planoPersonasExportLayout'
import { LABOR_EXPORT_WHATSAPP_HD_MIN_LONGEST_PX } from './laborExportResolution'

describe('planoPersonasExportLayout — contrato WhatsApp HD', () => {
    it('ancho @3x supera umbral HD', () => {
        expect(PERSONAS_EXPORT_SCALE).toBe(3)
        expect(PERSONAS_EXPORT_WIDTH * PERSONAS_EXPORT_SCALE).toBe(3240)
        expect(PERSONAS_EXPORT_WIDTH * PERSONAS_EXPORT_SCALE).toBeGreaterThanOrEqual(
            LABOR_EXPORT_WHATSAPP_HD_MIN_LONGEST_PX,
        )
    })

    it('alto export con muchas filas también supera umbral HD', () => {
        const layout = computePersonasExportLayout(60)
        const outH = layout.height * PERSONAS_EXPORT_SCALE
        expect(outH).toBeGreaterThanOrEqual(LABOR_EXPORT_WHATSAPP_HD_MIN_LONGEST_PX)
    })
})
