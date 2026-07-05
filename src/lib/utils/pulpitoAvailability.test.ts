import { describe, it, expect } from 'vitest'
import {
    isHermanoDisponible,
    dayOfWeekFromDateStr,
    tieneDisponibilidadConfigurada,
    PULPITO_ROLES,
} from './pulpitoAvailability'

// Fechas de referencia (julio 2026): 2026-07-06 = lunes, 2026-07-12 = domingo.
const LUNES = '2026-07-06'
const DOMINGO = '2026-07-12'

describe('dayOfWeekFromDateStr', () => {
    it('resuelve el día de la semana sin desfase de zona horaria', () => {
        expect(dayOfWeekFromDateStr(LUNES)).toBe(1)
        expect(dayOfWeekFromDateStr(DOMINGO)).toBe(0)
        expect(dayOfWeekFromDateStr('2026-07-11')).toBe(6) // sábado
    })
})

describe('isHermanoDisponible', () => {
    it('sin availability → disponible para todo', () => {
        for (const rol of PULPITO_ROLES) {
            expect(isHermanoDisponible(null, LUNES, rol)).toBe(true)
            expect(isHermanoDisponible(undefined, LUNES, rol)).toBe(true)
        }
    })

    it('patrón semanal: solo lo marcado en el día es true', () => {
        const availability = {
            template: {
                '1': { intro: true, finalization: false },
                '0': { intro: true, teaching: true, testimonies: true },
            },
        }
        expect(isHermanoDisponible(availability, LUNES, 'introduccion')).toBe(true)
        expect(isHermanoDisponible(availability, LUNES, 'finalizacion')).toBe(false)
        // Día sin entrada en el template → no disponible
        expect(isHermanoDisponible(availability, '2026-07-07', 'introduccion')).toBe(false)
        // Domingo con enseñanza y testimonios
        expect(isHermanoDisponible(availability, DOMINGO, 'ensenanza')).toBe(true)
        expect(isHermanoDisponible(availability, DOMINGO, 'testimonios')).toBe(true)
        expect(isHermanoDisponible(availability, DOMINGO, 'finalizacion')).toBe(false)
    })

    it('excepción por fecha manda sobre el patrón', () => {
        const availability = {
            template: { '1': { intro: true, finalization: true } },
            exceptions: { [LUNES]: { finalization: true } },
        }
        // La excepción no incluye intro → ese día NO puede hacer intro
        expect(isHermanoDisponible(availability, LUNES, 'introduccion')).toBe(false)
        expect(isHermanoDisponible(availability, LUNES, 'finalizacion')).toBe(true)
        // Otro lunes sin excepción → vuelve el patrón
        expect(isHermanoDisponible(availability, '2026-07-13', 'introduccion')).toBe(true)
    })

    it('estructura legacy availability[díaSemana]', () => {
        const availability = { 1: { intro: false } } as Record<string, unknown>
        expect(isHermanoDisponible(availability, LUNES, 'introduccion')).toBe(false)
        // Legacy: solo excluye lo explícitamente false
        expect(isHermanoDisponible(availability, LUNES, 'finalizacion')).toBe(true)
    })

    it('estructura presente sin regla aplicable → no disponible', () => {
        expect(isHermanoDisponible({ exceptions: {} }, LUNES, 'introduccion')).toBe(false)
    })
})

describe('tieneDisponibilidadConfigurada', () => {
    it('detecta template con algún valor activo', () => {
        expect(tieneDisponibilidadConfigurada({ template: { '1': { intro: true } } })).toBe(true)
        expect(tieneDisponibilidadConfigurada({ template: { '1': { intro: false } } })).toBe(false)
        expect(tieneDisponibilidadConfigurada(null)).toBe(false)
        expect(tieneDisponibilidadConfigurada({ exceptions: { '2026-07-06': { intro: true } } })).toBe(true)
    })
})
