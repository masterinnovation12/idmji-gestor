/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    LABOR_EXPORT_MOBILE_DESIGN_PX,
    LABOR_EXPORT_MOBILE_SCALE,
    LABOR_EXPORT_WHATSAPP_HD_MIN_LONGEST_PX,
    laborExportOutputLongestPx,
    laborExportScaleForDesign,
} from './laborExportResolution'

describe('laborExportResolution — contrato WhatsApp HD', () => {
    it('umbral mínimo calibrado a fotos 12MP (~3024px)', () => {
        expect(LABOR_EXPORT_WHATSAPP_HD_MIN_LONGEST_PX).toBe(3024)
    })

    it('lienzo móvil 1080px exporta a ≥3024px con escala 3', () => {
        expect(LABOR_EXPORT_MOBILE_SCALE).toBe(3)
        expect(LABOR_EXPORT_MOBILE_DESIGN_PX * LABOR_EXPORT_MOBILE_SCALE).toBe(3240)
        expect(
            laborExportOutputLongestPx(LABOR_EXPORT_MOBILE_DESIGN_PX),
        ).toBeGreaterThanOrEqual(LABOR_EXPORT_WHATSAPP_HD_MIN_LONGEST_PX)
    })

    it('plano lienzo 1448×1316 usa escala 3 (lado largo ≥3024)', () => {
        const scale = laborExportScaleForDesign(1448)
        expect(scale).toBe(3)
        expect(laborExportOutputLongestPx(1448, scale)).toBe(4344)
    })

    it('nunca baja de escala 2 aunque el diseño sea muy grande', () => {
        expect(laborExportScaleForDesign(4096)).toBe(2)
        expect(laborExportOutputLongestPx(4096)).toBe(8192)
    })

    it('diseños pequeños suben escala hasta cumplir umbral HD', () => {
        for (const design of [540, 720, 1080, 1200, 1448]) {
            const out = laborExportOutputLongestPx(design)
            expect(out).toBeGreaterThanOrEqual(LABOR_EXPORT_WHATSAPP_HD_MIN_LONGEST_PX)
        }
    })
})
