import { translations } from './translations'
import type { Language, TranslationKey } from './types'
import type { I18nContextType } from './i18nContext'

/**
 * i18n por defecto (es-ES) sin React context.
 * Para skeletons de carga y UI que no puede usar useI18n de forma segura en SSR.
 */
export function getStaticI18n(language: Language = 'es-ES'): I18nContextType {
    return {
        language,
        setLanguage: () => {},
        t: (key: TranslationKey) => translations[language][key] || key,
    }
}
