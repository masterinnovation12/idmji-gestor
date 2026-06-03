import { SERVICE_EXPORT_COLORS } from './exportBrand'
import type { OfrendaExportLabels } from './ofrendaLocale'

/** Colores de leyenda visibles sobre fondo navy (domingo mañana no usa navy puro). */
export const EXPORT_LEGEND_SWATCHES = {
    jueves: SERVICE_EXPORT_COLORS.jueves.headerBg,
    domingo: '#5b9fd4',
    domingo_tarde: SERVICE_EXPORT_COLORS.domingo_tarde.headerBg,
} as const

export interface ExportLegendItem {
    color: string
    label: string
}

/** Evita «Mayo 2026 2026» cuando tituloMes ya incluye el año. */
export function formatExportPeriodLabel(monthOrTitulo: string, year: number): string {
    const y = String(year)
    const trimmed = monthOrTitulo.trim()
    if (!trimmed) return y
    if (trimmed.endsWith(y) || new RegExp(`\\b${y}\\b$`).test(trimmed)) return trimmed
    return `${trimmed} ${y}`
}

export function buildExportLegend(labels: OfrendaExportLabels): ExportLegendItem[] {
    return [
        { color: EXPORT_LEGEND_SWATCHES.jueves, label: labels.legendJueves },
        { color: EXPORT_LEGEND_SWATCHES.domingo, label: labels.legendDomManana },
        { color: EXPORT_LEGEND_SWATCHES.domingo_tarde, label: labels.legendDomTarde },
    ]
}
