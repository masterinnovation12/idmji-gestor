'use client'

import { createContext, useContext } from 'react'
import type { Language, TranslationKey } from './types'

export interface I18nContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: TranslationKey) => string
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined)

let fallbackI18n: I18nContextType | null = null

function getFallbackI18n(): I18nContextType {
    if (!fallbackI18n) {
        // require diferido: este módulo no importa translations (estable ante HMR de claves).
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getStaticI18n } = require('./staticI18n') as typeof import('./staticI18n')
        fallbackI18n = getStaticI18n()
    }
    return fallbackI18n
}

export function useI18n(): I18nContextType {
    const context = useContext(I18nContext)
    if (context) return context
    if (typeof globalThis.window === 'undefined') {
        return getFallbackI18n()
    }
    throw new Error('useI18n must be used within I18nProvider')
}
