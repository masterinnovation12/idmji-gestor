import { describe, it, expect } from 'vitest'
import { formatDisponibilidadProblemas } from './ofrendaGeneracionValidation'
import type { ValidacionGeneracionTurno } from './ofrendaMemberAvailability'

const t = (key: string) => {
    const map: Record<string, string> = {
        'ofrenda.days.jueves': 'Jueves',
        'ofrenda.days.manana': 'Domingo mañana',
        'ofrenda.days.tarde': 'Domingo tarde',
        'ofrenda.generate.noEligible': 'No hay personas activas para: {detalle}.',
        'ofrenda.generate.noEligibleItem': '{turno} (Grupo {grupo})',
        'ofrenda.generate.noEligibleGeneric': 'No hay personas disponibles.',
    }
    return map[key] ?? key
}

describe('formatDisponibilidadProblemas', () => {
    it('mensaje genérico sin problemas', () => {
        expect(formatDisponibilidadProblemas(t, [])).toBe('No hay personas disponibles.')
    })

    it('lista turnos y grupos en detalle', () => {
        const problemas: ValidacionGeneracionTurno[] = [
            { diaTipo: 'jueves', grupo: 1, elegibles: 0 },
            { diaTipo: 'domingo_tarde', grupo: 2, elegibles: 0 },
        ]
        const msg = formatDisponibilidadProblemas(t, problemas)
        expect(msg).toContain('Jueves (Grupo 1)')
        expect(msg).toContain('Domingo tarde (Grupo 2)')
        expect(msg).toMatch(/No hay personas activas/)
    })
})
