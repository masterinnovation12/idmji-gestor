import { describe, expect, it } from 'vitest'
import { translations } from './translations'
import type { TranslationKey } from './types'

describe('translations es/ca', () => {
    it('tiene las mismas claves en es-ES y ca-ES', () => {
        const esKeys = new Set(Object.keys(translations['es-ES']) as TranslationKey[])
        const caKeys = new Set(Object.keys(translations['ca-ES']) as TranslationKey[])
        const onlyEs = [...esKeys].filter((k) => !caKeys.has(k)).sort()
        const onlyCa = [...caKeys].filter((k) => !esKeys.has(k)).sort()
        expect(onlyEs, `Claves solo en es-ES: ${onlyEs.join(', ')}`).toEqual([])
        expect(onlyCa, `Claves solo en ca-ES: ${onlyCa.join(', ')}`).toEqual([])
    })

    it('ningún valor está vacío en ningún idioma', () => {
        for (const lang of ['es-ES', 'ca-ES'] as const) {
            for (const [k, v] of Object.entries(translations[lang])) {
                expect(v.trim().length, `${lang} ${k}`).toBeGreaterThan(0)
            }
        }
    })
})
