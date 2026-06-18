import { describe, it, expect } from 'vitest'
import { capacidadEncajaRol } from './planoTypes'

describe('capacidadEncajaRol — regla de aviso ofrendario/apoyo', () => {
    it('"ambos" encaja en cualquier hueco', () => {
        expect(capacidadEncajaRol('ambos', 'ofrendario')).toBe(true)
        expect(capacidadEncajaRol('ambos', 'apoyo')).toBe(true)
    })

    it('ofrendario encaja en hueco de ofrendario', () => {
        expect(capacidadEncajaRol('ofrendario', 'ofrendario')).toBe(true)
    })

    it('apoyo encaja en hueco de apoyo', () => {
        expect(capacidadEncajaRol('apoyo', 'apoyo')).toBe(true)
    })

    it('avisa: ofrendario puesto en hueco de apoyo NO encaja', () => {
        expect(capacidadEncajaRol('ofrendario', 'apoyo')).toBe(false)
    })

    it('avisa: solo-sobres (apoyo) puesto en hueco de ofrendario NO encaja', () => {
        expect(capacidadEncajaRol('apoyo', 'ofrendario')).toBe(false)
    })
})
