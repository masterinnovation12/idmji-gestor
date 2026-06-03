import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import type { OfrServicio } from './actions'

/** Misma agrupación que PlanTable: bloques de 3 servicios (Jue + Dom M + Dom T). */
export function groupServiciosByWeek(servicios: OfrServicio[]): OfrServicio[][] {
    const chunks: OfrServicio[][] = []
    for (let i = 0; i < servicios.length; i += 3) {
        chunks.push(servicios.slice(i, i + 3))
    }
    return chunks
}

export function formatWeekRangeLabel(week: OfrServicio[], dateLocale: Locale): string {
    if (week.length === 0) return ''
    const first = new Date(`${week[0].fecha}T00:00:00`)
    const last = new Date(`${week[week.length - 1].fecha}T00:00:00`)
    if (week.length === 1) return format(first, 'd MMM', { locale: dateLocale })
    const sameMonth = first.getMonth() === last.getMonth()
    if (sameMonth) {
        return `${format(first, 'd', { locale: dateLocale })} – ${format(last, 'd MMM', { locale: dateLocale })}`
    }
    return `${format(first, 'd MMM', { locale: dateLocale })} – ${format(last, 'd MMM', { locale: dateLocale })}`
}

export { exportLayoutWidthPx } from './exportLayoutMetrics'

export function buildWeekFileSlug(weekIndex: number, weekRange: string): string {
    const rangeSlug = weekRange
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[·–—]/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    return `semana-${weekIndex + 1}${rangeSlug ? `-${rangeSlug}` : ''}`
}
