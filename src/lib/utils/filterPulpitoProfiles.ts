/**
 * Filtro local del selector de hermanos (púlpito).
 * Sin acentos, sin distinción de mayúsculas, coincide nombre + apellidos.
 */

export function normalizePulpitoSearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
}

export function filterPulpitoProfiles<T extends { nombre: string | null; apellidos: string | null }>(
    profiles: readonly T[],
    query: string,
): T[] {
    const q = normalizePulpitoSearch(query)
    if (!q) return [...profiles]

    const qCompact = q.replace(/\s+/g, '')

    const scored: { profile: T; starts: boolean }[] = []
    for (const profile of profiles) {
        const full = normalizePulpitoSearch(`${profile.nombre ?? ''} ${profile.apellidos ?? ''}`)
        const compact = full.replace(/\s+/g, '')
        if (!full.includes(q) && !compact.includes(qCompact)) continue
        scored.push({
            profile,
            starts: full.startsWith(q) || compact.startsWith(qCompact),
        })
    }

    scored.sort((a, b) => Number(b.starts) - Number(a.starts))
    return scored.map((row) => row.profile)
}
