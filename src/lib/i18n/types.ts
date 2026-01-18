
import { translations } from './translations'

export type Language = keyof typeof translations
export type TranslationKey = keyof typeof translations['es-ES']
