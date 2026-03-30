import type { PlanHimnoCoro } from '@/types/database'

/** Culto de enseñanza (nombre puede venir con/sin tilde). */
export function isTipoCultoEnsenanza(tipoCulto?: string | null): boolean {
    const t = (tipoCulto || '').toLowerCase()
    return t.includes('enseñanza') || t.includes('ensenanza')
}

/**
 * Lista de reproducción para enseñanza: siempre todos los himnos (por su orden relativo)
 * y después todos los coros (por su orden relativo).
 */
export function displayListEnsenanza(items: PlanHimnoCoro[]): PlanHimnoCoro[] {
    const himnos = items.filter((i) => i.tipo === 'himno').sort((a, b) => a.orden - b.orden)
    const coros = items.filter((i) => i.tipo === 'coro').sort((a, b) => a.orden - b.orden)
    return [...himnos, ...coros]
}

/** Asigna orden global 1..n según el orden del array (himnos primero si viene de displayListEnsenanza). */
export function assignGlobalOrden(items: PlanHimnoCoro[]): PlanHimnoCoro[] {
    return items.map((item, i) => ({ ...item, orden: i + 1 }))
}

/**
 * True si el orden por campo `orden` en BD no coincide con la regla himnos→coros.
 */
export function needsEnsenanzaOrderNormalization(items: PlanHimnoCoro[]): boolean {
    if (items.length <= 1) return false
    const byOrdenAsc = [...items].sort((a, b) => a.orden - b.orden)
    const display = displayListEnsenanza(items)
    return byOrdenAsc.some((row, i) => row.id !== display[i].id)
}
