/**
 * QA senior: la secuencia debe incluir exactamente los sacos configurados (ni más ni menos).
 */
import { describe, it, expect } from 'vitest'
import { calcHasta } from '@/lib/utils/ofrendaEngine'
import {
    countSacosInSequence,
    formatSecuenciaRange,
    getMaxSacosForDiaTipo,
    validateSecuenciaSacos,
    secuenciaAtMaxSacos,
} from './secuenciaSacosLimits'

const CONFIG = {
    sacos_jueves: 4,
    sacos_domingo: 8,
    sacos_domingo_tarde: 4,
}

describe('countSacosInSequence', () => {
    it('rango lineal: 01 al 04 = 4 sacos', () => {
        expect(countSacosInSequence(1, 4)).toBe(4)
    })

    it('rango lineal: 11 al 13 = 3 sacos (caso usuario)', () => {
        expect(countSacosInSequence(11, 13)).toBe(3)
    })

    it('wrap: 17 al 04 = 8 sacos', () => {
        expect(countSacosInSequence(17, 4)).toBe(8)
    })

    it('un solo saco', () => {
        expect(countSacosInSequence(7, 7)).toBe(1)
    })
})

describe('validateSecuenciaSacos — exactamente N sacos', () => {
    it('acepta 01 al 04 cuando el plan pide 4 (jueves)', () => {
        expect(validateSecuenciaSacos(1, 4, 4)).toEqual({
            ok: true,
            count: 4,
            requiredSacos: 4,
        })
    })

    it('rechaza 11 al 13 con motivo too_few cuando el plan pide 4', () => {
        const r = validateSecuenciaSacos(11, 13, 4)
        expect(r).toMatchObject({
            ok: false,
            count: 3,
            requiredSacos: 4,
            reason: 'too_few',
        })
    })

    it('rechaza 01 al 08 con motivo too_many cuando el plan pide 4', () => {
        const r = validateSecuenciaSacos(1, 8, 4)
        expect(r).toMatchObject({
            ok: false,
            count: 8,
            requiredSacos: 4,
            reason: 'too_many',
        })
    })

    it('acepta domingo mañana 17 al 04 con 8 sacos configurados', () => {
        expect(validateSecuenciaSacos(17, 4, 8).ok).toBe(true)
    })

    it('rechaza domingo tarde 09 al 13 (5 sacos) cuando el plan pide 4', () => {
        const r = validateSecuenciaSacos(9, 13, 4)
        expect(r).toMatchObject({ ok: false, reason: 'too_many', count: 5 })
    })

    it('rechaza 11 al 12 (2 sacos) cuando el plan pide 4', () => {
        expect(validateSecuenciaSacos(11, 12, 4)).toMatchObject({
            ok: false,
            reason: 'too_few',
            count: 2,
        })
    })

    it('rechaza valores fuera del ciclo 1–20', () => {
        expect(validateSecuenciaSacos(0, 4, 4)).toMatchObject({
            ok: false,
            reason: 'bounds',
        })
    })
})

describe('formatSecuenciaRange', () => {
    it('formatea el rango legible', () => {
        expect(formatSecuenciaRange(11, 13)).toBe('11 al 13')
    })
})

describe('getMaxSacosForDiaTipo', () => {
    it('lee la configuración del plan por tipo de día', () => {
        expect(getMaxSacosForDiaTipo('jueves', CONFIG)).toBe(4)
        expect(getMaxSacosForDiaTipo('domingo', CONFIG)).toBe(8)
    })
})

describe('secuenciaAtMaxSacos', () => {
    it('coincide con calcHasta del motor', () => {
        expect(secuenciaAtMaxSacos(1, 4)).toBe(calcHasta(1, 4))
        expect(secuenciaAtMaxSacos(11, 4)).toBe(calcHasta(11, 4))
    })
})

describe('integración motor ↔ límites', () => {
    it('secuencias generadas por el motor tienen exactamente los sacos configurados', () => {
        const casos: Array<{ desde: number; hasta: number; required: number }> = [
            { desde: 1, hasta: calcHasta(1, 4), required: 4 },
            { desde: 5, hasta: calcHasta(5, 8), required: 8 },
            { desde: 11, hasta: calcHasta(11, 4), required: 4 },
        ]
        for (const { desde, hasta, required } of casos) {
            const v = validateSecuenciaSacos(desde, hasta, required)
            expect(v.ok).toBe(true)
            if (v.ok) {
                expect(v.count).toBe(required)
            }
        }
    })
})
