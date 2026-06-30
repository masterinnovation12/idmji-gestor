'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { translations } from './translations'
import type { Language, TranslationKey } from './types'
import { I18nContext } from './i18nContext'

export { useI18n } from './i18nContext'
export { getStaticI18n } from './staticI18n'
export type { I18nContextType } from './i18nContext'

export function I18nProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('es-ES')

    useEffect(() => {
        const saved = localStorage.getItem('language') as Language
        if (saved && (saved === 'es-ES' || saved === 'ca-ES')) {
            setLanguageState(saved)
        }
    }, [])

    useEffect(() => {
        if (typeof document === 'undefined') return
        document.documentElement.lang = language === 'ca-ES' ? 'ca' : 'es'
    }, [language])

    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem('language', lang)
    }

    const t = (key: TranslationKey): string => {
        return translations[language][key] || key
    }

    return (
        <I18nContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </I18nContext.Provider>
    )
}
