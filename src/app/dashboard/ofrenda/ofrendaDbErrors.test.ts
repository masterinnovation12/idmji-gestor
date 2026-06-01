import { describe, it, expect } from 'vitest'
import { formatOfrendaActionError, isOfrendaDbConstraintError } from './ofrendaDbErrors'

describe('ofrendaDbErrors', () => {
    it('detecta error de puntero fin (reproducción del bug)', () => {
        const raw =
            'new row for relation "ofrenda_planes" violates check constraint "ofrenda_planes_secuencia_puntero_fin_check"'
        expect(isOfrendaDbConstraintError(raw)).toBe(true)
        expect(formatOfrendaActionError(raw)).toMatch(/puntero de la secuencia/i)
        expect(formatOfrendaActionError(raw)).not.toMatch(/new row for relation/)
    })

    it('mensaje genérico para otros check constraints', () => {
        const raw = 'violates check constraint "foo_bar_check"'
        expect(formatOfrendaActionError(raw)).toMatch(/reglas de la base de datos/i)
    })

    it('devuelve el mensaje original si no es de BD', () => {
        expect(formatOfrendaActionError('Sin permisos')).toBe('Sin permisos')
    })
})
