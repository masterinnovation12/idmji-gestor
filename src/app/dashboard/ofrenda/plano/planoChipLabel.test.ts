import { describe, it, expect } from 'vitest'
import { planoServicioChipLabel } from './planoChipLabel'

const t = (key: string): string => {
    const map: Record<string, string> = {
        'ofrenda.days.jueShort': 'Jue',
        'ofrenda.days.domShort': 'Dom',
        'ofrenda.days.manana': 'Mañana',
        'ofrenda.days.tarde': 'Tarde',
    }
    return map[key] ?? key
}

describe('planoServicioChipLabel', () => {
    it('jueves: día sin turno', () => {
        expect(planoServicioChipLabel({ fecha: '2026-08-06', dia_tipo: 'jueves' }, t)).toBe('Jue 6')
    })

    it('domingo mañana y tarde llevan el turno para distinguirlos', () => {
        expect(planoServicioChipLabel({ fecha: '2026-08-09', dia_tipo: 'domingo' }, t)).toBe('Dom 9 · Mañana')
        expect(planoServicioChipLabel({ fecha: '2026-08-09', dia_tipo: 'domingo_tarde' }, t)).toBe('Dom 9 · Tarde')
    })

    it('no deja ceros a la izquierda en el día', () => {
        expect(planoServicioChipLabel({ fecha: '2026-08-02', dia_tipo: 'domingo' }, t)).toBe('Dom 2 · Mañana')
    })
})
