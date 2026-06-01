/** Borrador permitido mientras el usuario escribe (solo dígitos, puede estar vacío). */
export function isSacosDraftAllowed(raw: string, maxDigits: number): boolean {
    if (raw === '') return true
    return new RegExp(`^\\d{1,${maxDigits}}$`).test(raw)
}

/** Convierte borrador a entero acotado; vacío o inválido → min. */
export function commitSacosDraft(raw: string, min: number, max: number): number {
    const n = Number.parseInt(raw.trim(), 10)
    if (Number.isNaN(n)) return min
    return Math.max(min, Math.min(max, n))
}
