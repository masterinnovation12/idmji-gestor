import { describe, it, expect } from 'vitest'
import {
    isTipoCultoEnsenanza,
    displayListEnsenanza,
    assignGlobalOrden,
    needsEnsenanzaOrderNormalization,
} from './himnoCoroEnsenanzaOrder'
import type { PlanHimnoCoro } from '@/types/database'

function row(
    id: string,
    tipo: 'himno' | 'coro',
    orden: number,
    item_id: number
): PlanHimnoCoro {
    return {
        id,
        culto_id: 'c1',
        tipo,
        item_id,
        orden,
        [tipo === 'himno' ? 'himno' : 'coro']: { id: item_id, numero: item_id, titulo: 'x', duracion_segundos: 60 },
    }
}

describe('isTipoCultoEnsenanza', () => {
    it('detecta enseñanza con y sin tilde', () => {
        expect(isTipoCultoEnsenanza('Culto de Enseñanza')).toBe(true)
        expect(isTipoCultoEnsenanza('Culto de Ensenanza')).toBe(true)
        expect(isTipoCultoEnsenanza('Alabanza')).toBe(false)
    })
})

describe('displayListEnsenanza', () => {
    it('pone primero todos los himnos y luego los coros, respetando orden relativo dentro de cada tipo', () => {
        const h1 = row('a', 'himno', 10, 1)
        const h2 = row('b', 'himno', 20, 2)
        const c1 = row('c', 'coro', 5, 3)
        const c2 = row('d', 'coro', 15, 4)
        expect(displayListEnsenanza([c1, h2, c2, h1]).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
    })
})

describe('assignGlobalOrden', () => {
    it('asigna orden 1..n', () => {
        const out = assignGlobalOrden([row('a', 'himno', 99, 1), row('b', 'coro', 1, 2)])
        expect(out.map((x) => x.orden)).toEqual([1, 2])
    })
})

describe('needsEnsenanzaOrderNormalization', () => {
    it('false si solo hay un tipo o un elemento', () => {
        expect(needsEnsenanzaOrderNormalization([row('a', 'himno', 1, 1)])).toBe(false)
        expect(
            needsEnsenanzaOrderNormalization([row('a', 'himno', 1, 1), row('b', 'himno', 2, 2)])
        ).toBe(false)
    })

    it('true cuando un coro queda antes que un himno según orden global en BD', () => {
        const himno = row('h', 'himno', 2, 1)
        const coro = row('k', 'coro', 1, 2)
        expect(needsEnsenanzaOrderNormalization([himno, coro])).toBe(true)
    })

    it('false cuando ya coincide himnos primero y luego coros', () => {
        const himno = row('h', 'himno', 1, 1)
        const coro = row('k', 'coro', 2, 2)
        expect(needsEnsenanzaOrderNormalization([himno, coro])).toBe(false)
    })
})
