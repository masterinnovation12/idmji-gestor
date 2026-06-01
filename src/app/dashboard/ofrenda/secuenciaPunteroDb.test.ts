import { describe, it, expect } from 'vitest'
import { advancePuntero, generarPlan } from '@/lib/utils/ofrendaEngine'

/**
 * Documenta por qué el CHECK 1..20 en puntero_fin rompía al usar ciclo > 20.
 */
describe('secuencia puntero vs máximo del ciclo', () => {
    const sacos = { jueves: 4, domingo: 8, domingoTarde: 4 }

    it('el motor permite punteros > 20 cuando el ciclo es 25 (BD antigua solo 1..20 fallaba)', () => {
        expect(advancePuntero(20, 5, 25)).toBe(25)
        expect(advancePuntero(20, 5, 25)).toBeGreaterThan(20)
    })

    it('generarPlan con ciclo 25 deja punteroFin dentro del ciclo', () => {
        const { punteroFin } = generarPlan(2026, 12, 1, [], {}, null, {
            ...sacos,
            secuenciaMax: 25,
        })
        expect(punteroFin).toBeGreaterThanOrEqual(1)
        expect(punteroFin).toBeLessThanOrEqual(25)
    })

    it('con ciclo 99 el puntero final sigue dentro del rango del ciclo', () => {
        const { punteroFin } = generarPlan(2026, 5, 1, [], {}, null, {
            ...sacos,
            secuenciaMax: 99,
        })
        expect(punteroFin).toBeLessThanOrEqual(99)
        expect(punteroFin).toBeGreaterThanOrEqual(1)
    })

    it('con ciclo 20 el puntero final nunca supera 20', () => {
        const { punteroFin } = generarPlan(2026, 5, 1, [], {}, null, {
            ...sacos,
            secuenciaMax: 20,
        })
        expect(punteroFin).toBeLessThanOrEqual(20)
    })
})
