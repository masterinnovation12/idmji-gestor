import type { Language } from '@/lib/i18n/types'

/** Perfil tal como viene de Supabase (columna real: idioma_preferido) o tipos legacy */
export type ProfileLanguageFields = {
    language?: string | null
    idioma_preferido?: string | null
} | null | undefined

/**
 * Idioma UI del usuario: prioriza `language` si existiera en BD, si no `idioma_preferido`.
 */
export function profilePreferredLanguage(profile: ProfileLanguageFields): Language {
    const raw = profile?.language ?? profile?.idioma_preferido
    if (raw === 'ca-ES' || raw === 'ca') return 'ca-ES'
    return 'es-ES'
}
