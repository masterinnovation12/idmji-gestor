import { describe, it, expect } from 'vitest'
import { pickDefaultServicioId } from './planoDefaultServicio'

const servicios = [
    { id: 'jue-4', fecha: '2026-06-04', posicion: 0 },
    { id: 'dom-7-am', fecha: '2026-06-07', posicion: 1 },
    { id: 'dom-7-pm', fecha: '2026-06-07', posicion: 2 },
    { id: 'jue-11', fecha: '2026-06-11', posicion: 3 },
    { id: 'dom-14-am', fecha: '2026-06-14', posicion: 4 },
    { id: 'dom-14-pm', fecha: '2026-06-14', posicion: 5 },
]

describe('pickDefaultServicioId', () => {
    it('selecciona hoy si hay servicio ese día', () => {
        expect(pickDefaultServicioId(servicios, '2026-06-11')).toBe('jue-11')
    })

    it('selecciona el siguiente si hoy no tiene servicio', () => {
        expect(pickDefaultServicioId(servicios, '2026-06-12')).toBe('dom-14-am')
    })

    it('el mismo domingo elige el turno de mañana primero', () => {
        expect(pickDefaultServicioId(servicios, '2026-06-14')).toBe('dom-14-am')
    })

    it('si todo el mes pasó, elige el último servicio', () => {
        expect(pickDefaultServicioId(servicios, '2026-06-30')).toBe('dom-14-pm')
    })

    it('mes futuro: el primer servicio', () => {
        expect(pickDefaultServicioId(servicios, '2026-05-01')).toBe('jue-4')
    })
})
