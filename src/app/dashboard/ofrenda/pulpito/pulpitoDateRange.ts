/**
 * Rangos de fecha para Labor Púlpito (semana lunes→domingo o mes natural).
 * Funciones puras basadas en date-fns → testeables.
 */
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    addWeeks,
    addMonths,
    format,
} from 'date-fns'

export type PulpitoScope = 'week' | 'month'

export interface PulpitoRange {
    inicio: string // 'YYYY-MM-DD'
    fin: string    // 'YYYY-MM-DD'
}

const OPTS = { weekStartsOn: 1 as const } // lunes

export function rangoDePulpito(ref: Date, scope: PulpitoScope): PulpitoRange {
    if (scope === 'week') {
        return {
            inicio: format(startOfWeek(ref, OPTS), 'yyyy-MM-dd'),
            fin: format(endOfWeek(ref, OPTS), 'yyyy-MM-dd'),
        }
    }
    return {
        inicio: format(startOfMonth(ref), 'yyyy-MM-dd'),
        fin: format(endOfMonth(ref), 'yyyy-MM-dd'),
    }
}

/** Avanza/retrocede la fecha de referencia según el scope. */
export function desplazarRef(ref: Date, scope: PulpitoScope, delta: number): Date {
    return scope === 'week' ? addWeeks(ref, delta) : addMonths(ref, delta)
}
