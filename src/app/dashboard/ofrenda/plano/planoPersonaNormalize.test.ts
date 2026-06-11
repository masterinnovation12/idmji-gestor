import { describe, it, expect } from 'vitest'
import { normalizePlanoPersonaNombre, validatePlanoPersonaNombre } from './planoPersonaNormalize'

describe('normalizePlanoPersonaNombre', () => {
    it('colapsa espacios y quita tildes', () => {
        expect(normalizePlanoPersonaNombre('  José   Pérez  ')).toBe('jose perez')
    })

    it('trata variantes como iguales', () => {
        expect(normalizePlanoPersonaNombre('Jose Perez')).toBe(
            normalizePlanoPersonaNombre('josé pérez'),
        )
    })
})

describe('validatePlanoPersonaNombre', () => {
    it('rechaza nombres muy cortos', () => {
        expect(validatePlanoPersonaNombre('A')).toBeTruthy()
    })

    it('acepta nombres válidos', () => {
        expect(validatePlanoPersonaNombre('María García')).toBeNull()
    })
})
