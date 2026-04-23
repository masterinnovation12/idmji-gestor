import { describe, expect, it } from 'vitest'
import { upsertReadingPreserveOrder } from './upsert-reading'

describe('upsertReadingPreserveOrder', () => {
    it('actualiza elemento existente sin cambiar su posicion', () => {
        const list = [
            { id: 'a', libro: 'Jueces 1:1' },
            { id: 'b', libro: 'Jueces 1:5-7' },
            { id: 'c', libro: 'Jueces 2:1-2' },
        ]
        const updated = upsertReadingPreserveOrder(list, { id: 'a', libro: 'Exodo 1:1' })
        expect(updated.map((x) => x.id)).toEqual(['a', 'b', 'c'])
        expect(updated[0]?.libro).toBe('Exodo 1:1')
    })

    it('agrega al final cuando el id no existe', () => {
        const list = [{ id: 'a' }, { id: 'b' }]
        const updated = upsertReadingPreserveOrder(list, { id: 'c' })
        expect(updated.map((x) => x.id)).toEqual(['a', 'b', 'c'])
    })
})

