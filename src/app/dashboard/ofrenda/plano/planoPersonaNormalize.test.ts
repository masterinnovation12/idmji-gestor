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
    it('rechaza nombres muy cortos con código too_short', () => {
        expect(validatePlanoPersonaNombre('A')).toBe('too_short')
        expect(validatePlanoPersonaNombre(' x ')).toBe('too_short')
    })

    it('rechaza nombres muy largos con código too_long', () => {
        expect(validatePlanoPersonaNombre('a'.repeat(81))).toBe('too_long')
    })

    it('acepta nombres válidos', () => {
        expect(validatePlanoPersonaNombre('María García')).toBeNull()
        expect(validatePlanoPersonaNombre('Jo')).toBeNull()
    })
})
