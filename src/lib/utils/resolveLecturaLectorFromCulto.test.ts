import { describe, expect, it } from 'vitest'
import { resolveLecturaLectorFromCulto } from './resolveLecturaLectorFromCulto'

describe('resolveLecturaLectorFromCulto', () => {
    const registrador = 'registrador-uuid'
    const intro = 'intro-uuid'
    const finalizacion = 'final-uuid'

    describe('introduccion', () => {
        it('prioriza id_usuario_intro cuando está asignado', () => {
            expect(
                resolveLecturaLectorFromCulto({
                    tipoLectura: 'introduccion',
                    idUsuarioIntro: intro,
                    idUsuarioFinalizacion: finalizacion,
                    fallbackUserId: registrador,
                })
            ).toBe(intro)
        })

        it('ignora finalización: un admin puede registrar pero el lector es el de intro', () => {
            expect(
                resolveLecturaLectorFromCulto({
                    tipoLectura: 'introduccion',
                    idUsuarioIntro: intro,
                    idUsuarioFinalizacion: null,
                    fallbackUserId: registrador,
                })
            ).toBe(intro)
        })

        it('sin intro asignado usa fallback (quien guarda en la app)', () => {
            expect(
                resolveLecturaLectorFromCulto({
                    tipoLectura: 'introduccion',
                    idUsuarioIntro: null,
                    idUsuarioFinalizacion: finalizacion,
                    fallbackUserId: registrador,
                })
            ).toBe(registrador)
        })
    })

    describe('finalizacion', () => {
        it('prioriza id_usuario_finalizacion cuando está asignado', () => {
            expect(
                resolveLecturaLectorFromCulto({
                    tipoLectura: 'finalizacion',
                    idUsuarioIntro: intro,
                    idUsuarioFinalizacion: finalizacion,
                    fallbackUserId: registrador,
                })
            ).toBe(finalizacion)
        })

        it('sin hermano de finalización usa fallback', () => {
            expect(
                resolveLecturaLectorFromCulto({
                    tipoLectura: 'finalizacion',
                    idUsuarioIntro: intro,
                    idUsuarioFinalizacion: null,
                    fallbackUserId: registrador,
                })
            ).toBe(registrador)
        })

        it('no usa id_usuario_intro para lectura de finalización', () => {
            expect(
                resolveLecturaLectorFromCulto({
                    tipoLectura: 'finalizacion',
                    idUsuarioIntro: intro,
                    idUsuarioFinalizacion: null,
                    fallbackUserId: registrador,
                })
            ).not.toBe(intro)
        })
    })

    it('trata cadena vacía como sin asignar y usa fallback', () => {
        expect(
            resolveLecturaLectorFromCulto({
                tipoLectura: 'introduccion',
                idUsuarioIntro: '',
                idUsuarioFinalizacion: null,
                fallbackUserId: registrador,
            })
        ).toBe(registrador)
    })
})
