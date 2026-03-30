import { describe, it, expect } from 'vitest'
import { pickLastHimnoCoroIdsForSequence, pickLastCoroIdForSequence } from './sequencePlanPick'

describe('pickLastHimnoCoroIdsForSequence', () => {
    it('toma el último himno y el último coro por orden dentro de cada tipo', () => {
        const rows = [
            { tipo: 'coro' as const, orden: 1, himno_id: null, coro_id: 10 },
            { tipo: 'himno' as const, orden: 2, himno_id: 1, coro_id: null },
            { tipo: 'himno' as const, orden: 3, himno_id: 2, coro_id: null },
            { tipo: 'coro' as const, orden: 4, himno_id: null, coro_id: 20 },
        ]
        expect(pickLastHimnoCoroIdsForSequence(rows)).toEqual({ lastHimnoId: 2, lastCoroId: 20 })
    })

    it('devuelve null si falta un tipo', () => {
        expect(
            pickLastHimnoCoroIdsForSequence([
                { tipo: 'himno', orden: 1, himno_id: 5, coro_id: null },
            ])
        ).toEqual({ lastHimnoId: 5, lastCoroId: null })
    })
})

describe('pickLastCoroIdForSequence', () => {
    it('devuelve el último coro por orden', () => {
        const rows = [
            { tipo: 'coro' as const, orden: 1, himno_id: null, coro_id: 1 },
            { tipo: 'coro' as const, orden: 3, himno_id: null, coro_id: 99 },
        ]
        expect(pickLastCoroIdForSequence(rows)).toBe(99)
    })
})
