import { describe, it, expect } from 'vitest'
import {
    normalizeSequenceDate,
    isAlabanzaIncrementalCulto,
    isEnsenanzaIncrementalCulto,
} from './sequenceAutofillDate'

describe('sequenceAutofillDate', () => {
    it('normaliza ISO a yyyy-MM-dd', () => {
        expect(normalizeSequenceDate('2026-03-30T00:00:00.000Z')).toBe('2026-03-30')
    })

    it('Alabanza: domingo es incremental si el disparo es domingo aunque el puntero siga en jueves', () => {
        expect(
            isAlabanzaIncrementalCulto('2026-03-30', '2026-03-26', '2026-03-30')
        ).toBe(true)
    })

    it('Alabanza: jueves incremental si el puntero es jueves', () => {
        expect(
            isAlabanzaIncrementalCulto('2026-03-26', '2026-03-26', '2026-03-30')
        ).toBe(true)
    })

    it('Enseñanza: domingo incremental si el disparo es domingo aunque los punteros sean jueves', () => {
        expect(
            isEnsenanzaIncrementalCulto('2026-03-30', '2026-03-26', '2026-03-26', '2026-03-30')
        ).toBe(true)
    })

    it('Enseñanza: mantiene el OR con himno/coro (cualquiera coincide)', () => {
        expect(
            isEnsenanzaIncrementalCulto('2026-03-26', '2026-03-26', '2026-03-20', '2026-03-30')
        ).toBe(true)
    })
})
