import { describe, it, expect } from 'vitest'
import { rangoDePulpito, desplazarRef } from './pulpitoDateRange'

describe('rangoDePulpito', () => {
    it('semana: lunes a domingo que contiene la fecha', () => {
        // 2026-07-08 es miércoles → semana 6 (lun) a 12 (dom)
        expect(rangoDePulpito(new Date('2026-07-08T12:00:00'), 'week')).toEqual({
            inicio: '2026-07-06',
            fin: '2026-07-12',
        })
    })

    it('semana: un domingo pertenece a la semana que empezó el lunes anterior', () => {
        expect(rangoDePulpito(new Date('2026-07-12T12:00:00'), 'week')).toEqual({
            inicio: '2026-07-06',
            fin: '2026-07-12',
        })
    })

    it('mes: primer a último día del mes natural', () => {
        expect(rangoDePulpito(new Date('2026-07-15T12:00:00'), 'month')).toEqual({
            inicio: '2026-07-01',
            fin: '2026-07-31',
        })
    })

    it('mes: febrero de año no bisiesto', () => {
        expect(rangoDePulpito(new Date('2026-02-10T12:00:00'), 'month')).toEqual({
            inicio: '2026-02-01',
            fin: '2026-02-28',
        })
    })
})

describe('desplazarRef', () => {
    it('semana ±1 salta 7 días', () => {
        const ref = new Date('2026-07-08T12:00:00')
        expect(rangoDePulpito(desplazarRef(ref, 'week', 1), 'week').inicio).toBe('2026-07-13')
        expect(rangoDePulpito(desplazarRef(ref, 'week', -1), 'week').inicio).toBe('2026-06-29')
    })

    it('mes ±1 cambia de mes', () => {
        const ref = new Date('2026-07-15T12:00:00')
        expect(rangoDePulpito(desplazarRef(ref, 'month', 1), 'month').inicio).toBe('2026-08-01')
        expect(rangoDePulpito(desplazarRef(ref, 'month', -1), 'month').inicio).toBe('2026-06-01')
    })

    it('mes +1 desde 31 de enero cae en febrero (no desborda a marzo)', () => {
        const ref = new Date('2026-01-31T12:00:00')
        expect(rangoDePulpito(desplazarRef(ref, 'month', 1), 'month')).toEqual({
            inicio: '2026-02-01',
            fin: '2026-02-28',
        })
    })
})
