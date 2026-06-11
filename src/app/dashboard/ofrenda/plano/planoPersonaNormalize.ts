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

export function validatePlanoPersonaNombre(nombre: string): string | null {
    const trimmed = nombre.trim().replace(/\s+/g, ' ')
    if (trimmed.length < 2) return 'Nombre demasiado corto'
    if (trimmed.length > 80) return 'Nombre demasiado largo'
    return null
}
