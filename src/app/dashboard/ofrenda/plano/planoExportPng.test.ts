/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { laborExportScaleForDesign, laborExportOutputLongestPx } from './laborExportResolution'
import { LABOR_OFRENDA_HEADER_H } from './drawLaborOfrendaExportHeader'

/** Lienzo calibrado 3D (planoData / calibración embebida). */
const PLANO_LIENZO_W = 1448
const PLANO_LIENZO_H = 1316

describe('exportPlanoPng — contrato WhatsApp HD', () => {
    it('lienzo 1448×1316 + cabecera exporta con lado largo ≥3024px', () => {
        const designLongest = Math.max(PLANO_LIENZO_W, PLANO_LIENZO_H + LABOR_OFRENDA_HEADER_H)
        const scale = laborExportScaleForDesign(designLongest)
        expect(scale).toBe(3)
        expect(laborExportOutputLongestPx(PLANO_LIENZO_W, scale)).toBeGreaterThanOrEqual(3024)
        expect(
            laborExportOutputLongestPx(PLANO_LIENZO_H + LABOR_OFRENDA_HEADER_H, scale),
        ).toBeGreaterThanOrEqual(3024)
    })
})
