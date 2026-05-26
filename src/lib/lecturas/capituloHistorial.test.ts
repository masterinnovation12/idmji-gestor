import { describe, expect, it } from 'vitest'
import {
    buildHistorialCapituloUrl,
    formatPasajeLectura,
    lecturaIncluyeCapitulo,
} from './capituloHistorial'

describe('capituloHistorial', () => {
    it('lecturaIncluyeCapitulo detecta solape por capítulo', () => {
        expect(lecturaIncluyeCapitulo(3, 3, 3)).toBe(true)
        expect(lecturaIncluyeCapitulo(3, 1, 5)).toBe(true)
        expect(lecturaIncluyeCapitulo(3, 4, 6)).toBe(false)
    })

    it('formatPasajeLectura formatea rangos', () => {
        expect(
            formatPasajeLectura({
                libro: 'Juan',
                capitulo_inicio: 3,
                versiculo_inicio: 16,
                capitulo_fin: 3,
                versiculo_fin: 16,
            })
        ).toBe('Juan 3:16')

        expect(
            formatPasajeLectura({
                libro: 'Jueces',
                capitulo_inicio: 1,
                versiculo_inicio: 1,
                capitulo_fin: 1,
                versiculo_fin: 7,
            })
        ).toBe('Jueces 1:1-7')
    })

    it('buildHistorialCapituloUrl incluye filtros y excludeCulto', () => {
        expect(buildHistorialCapituloUrl('Juan', 3)).toBe(
            '/dashboard/historial/lecturas?search=Juan&capitulo=3'
        )
        expect(buildHistorialCapituloUrl('Juan', 3, 'culto-abc')).toBe(
            '/dashboard/historial/lecturas?search=Juan&capitulo=3&excludeCulto=culto-abc'
        )
    })
})
