/**
 * Textos de cabecera export Labor Ofrenda (plano + lista).
 */
import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import type { PlanoDiaTipo } from './planoTypes'

/**
 * Subtítulo cabecera export.
 * - Jueves: solo fecha (EEEE ya incluye «jueves» — sin duplicar).
 * - Domingo: fecha · Mañana | Tarde.
 */
export function formatLaborOfrendaExportSubtitle(
    fecha: Date,
    diaTipo: PlanoDiaTipo,
    labels: { manana: string; tarde: string },
    dateLocale: Locale,
): string {
    const fechaFmt = format(fecha, 'EEEE d MMM yyyy', { locale: dateLocale })
    if (diaTipo === 'jueves') return fechaFmt
    const turno = diaTipo === 'domingo' ? labels.manana : labels.tarde
    return `${fechaFmt} · ${turno}`
}
