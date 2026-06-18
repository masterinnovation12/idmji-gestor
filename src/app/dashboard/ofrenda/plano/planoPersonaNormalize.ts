/**
 * Normalización de nombres para ofrenda_plano_personas (anti-duplicados).
 * Una sola implementación compartida por server actions y tests.
 */

/** lower + sin tildes + espacios colapsados */
export function normalizePlanoPersonaNombre(nombre: string): string {
    return nombre
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
}

/** Código de error de validación (se traduce en el cliente, no se hardcodea texto). */
export type PlanoNombreError = 'too_short' | 'too_long'

export function validatePlanoPersonaNombre(nombre: string): PlanoNombreError | null {
    const trimmed = nombre.trim().replace(/\s+/g, ' ')
    if (trimmed.length < 2) return 'too_short'
    if (trimmed.length > 80) return 'too_long'
    return null
}
