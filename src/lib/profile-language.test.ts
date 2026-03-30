import { describe, it, expect } from 'vitest'
import { profilePreferredLanguage } from './profile-language'

describe('profilePreferredLanguage', () => {
    it('usa idioma_preferido', () => {
        expect(profilePreferredLanguage({ idioma_preferido: 'ca-ES' })).toBe('ca-ES')
        expect(profilePreferredLanguage({ idioma_preferido: 'es-ES' })).toBe('es-ES')
    })
    it('prioriza language si existiera', () => {
        expect(profilePreferredLanguage({ language: 'ca-ES', idioma_preferido: 'es-ES' })).toBe('ca-ES')
    })
    it('por defecto es-ES', () => {
        expect(profilePreferredLanguage(null)).toBe('es-ES')
        expect(profilePreferredLanguage({})).toBe('es-ES')
    })
})
