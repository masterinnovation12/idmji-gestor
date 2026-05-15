import { describe, expect, it } from 'vitest'
import { resolveHistorialLectorDisplay, unwrapSupabaseJoin } from './lecturasHistorialLector'

describe('unwrapSupabaseJoin', () => {
    it('devuelve el único elemento del array', () => {
        expect(unwrapSupabaseJoin([{ id: 'a', x: 1 }])).toEqual({ id: 'a', x: 1 })
    })
    it('devuelve el objeto tal cual', () => {
        expect(unwrapSupabaseJoin({ id: 'b' })).toEqual({ id: 'b' })
    })
})

describe('resolveHistorialLectorDisplay', () => {
    const lectorRegistrador = { id: 'jeffrey', nombre: 'Jeffrey', apellidos: 'Bolaños' }
    const introAndres = { id: 'andres', nombre: 'Andres', apellidos: 'Zapata' }

    it('introducción: prioriza usuario_intro del culto sobre id_usuario_lector (legacy)', () => {
        expect(
            resolveHistorialLectorDisplay({
                tipo_lectura: 'introduccion',
                lector: lectorRegistrador,
                culto: { usuario_intro: introAndres },
            })
        ).toEqual({ id: 'andres', nombre: 'Andres', apellidos: 'Zapata' })
    })

    it('introducción: sin intro en culto mantiene lector del join', () => {
        expect(
            resolveHistorialLectorDisplay({
                tipo_lectura: 'introduccion',
                lector: lectorRegistrador,
                culto: { usuario_intro: null },
            })
        ).toEqual({ id: 'jeffrey', nombre: 'Jeffrey', apellidos: 'Bolaños' })
    })

    it('finalización: prioriza usuario_finalizacion', () => {
        expect(
            resolveHistorialLectorDisplay({
                tipo_lectura: 'finalizacion',
                lector: lectorRegistrador,
                culto: {
                    usuario_intro: introAndres,
                    usuario_finalizacion: { id: 'f1', nombre: 'Final', apellidos: 'User' },
                },
            })
        ).toEqual({ id: 'f1', nombre: 'Final', apellidos: 'User' })
    })
})
