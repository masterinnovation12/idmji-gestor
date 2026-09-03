import { describe, expect, it } from 'vitest'
import { filterPulpitoProfiles, normalizePulpitoSearch } from './filterPulpitoProfiles'

const hermanos = [
    { nombre: 'Jeffrey', apellidos: 'Bolaños' },
    { nombre: 'Andrés', apellidos: 'Zapata' },
    { nombre: 'José', apellidos: 'García' },
    { nombre: 'María', apellidos: 'Núñez' },
]

describe('normalizePulpitoSearch', () => {
    it('quita acentos, mayúsculas y espacios extra', () => {
        expect(normalizePulpitoSearch('  José  Núñez ')).toBe('jose nunez')
    })
})

describe('filterPulpitoProfiles', () => {
    it('sin query devuelve la lista completa', () => {
        expect(filterPulpitoProfiles(hermanos, '')).toHaveLength(4)
        expect(filterPulpitoProfiles(hermanos, '   ')).toHaveLength(4)
    })

    it('filtra por nombre de forma instantánea e insensible a acentos', () => {
        expect(filterPulpitoProfiles(hermanos, 'jef').map((h) => h.nombre)).toEqual(['Jeffrey'])
        expect(filterPulpitoProfiles(hermanos, 'ANDRES').map((h) => h.nombre)).toEqual(['Andrés'])
        expect(filterPulpitoProfiles(hermanos, 'nunez').map((h) => h.nombre)).toEqual(['María'])
    })

    it('acepta nombre y apellido juntos', () => {
        expect(filterPulpitoProfiles(hermanos, 'jeffrey bol').map((h) => h.nombre)).toEqual(['Jeffrey'])
        expect(filterPulpitoProfiles(hermanos, 'jose garcia').map((h) => h.nombre)).toEqual(['José'])
    })

    it('prioriza coincidencias que empiezan por lo escrito', () => {
        const lista = [
            { nombre: 'Ana', apellidos: 'Jeferson' },
            { nombre: 'Jeffrey', apellidos: 'Bolaños' },
        ]
        expect(filterPulpitoProfiles(lista, 'jef').map((h) => h.nombre)).toEqual(['Jeffrey', 'Ana'])
    })

    it('no encuentra nada si no hay coincidencia', () => {
        expect(filterPulpitoProfiles(hermanos, 'xyz')).toEqual([])
    })
})
