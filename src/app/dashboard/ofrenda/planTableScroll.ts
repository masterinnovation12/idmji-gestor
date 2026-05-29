import {
    PLAN_ROLE_COL_WIDTH_PX,
    PLAN_SERVICE_COL_WIDTH_PX,
} from './planTableLayout'

/** Servicios por semana: jueves + domingo mañana + domingo tarde. */
export const PLAN_SERVICES_PER_WEEK = 3

/** Ancho de la columna Rol fija (referencia geométrica en tests). */
export const PLAN_STICKY_SCROLL_PADDING_PX = PLAN_ROLE_COL_WIDTH_PX

/**
 * scrollLeft para alinear el primer servicio de la semana justo después de la columna Rol.
 */
export function scrollLeftForWeekIndex(weekIndex: number): number {
    return Math.max(0, weekIndex * PLAN_SERVICES_PER_WEEK * PLAN_SERVICE_COL_WIDTH_PX)
}

/**
 * Índice de semana a partir de scrollLeft (contenedor con scroll-padding-left).
 */
export function weekIndexFromScrollLeft(scrollLeft: number): number {
    const slot = PLAN_SERVICES_PER_WEEK * PLAN_SERVICE_COL_WIDTH_PX
    if (slot <= 0) return 0
    return Math.max(0, Math.round(scrollLeft / slot))
}

/**
 * Comprueba que la columna de servicio no quede bajo la columna Rol (geometría viewport).
 */
export function isServiceColumnClearOfStickyRole(
    roleRect: DOMRectReadOnly,
    serviceRect: DOMRectReadOnly,
    minGapPx = 4
): boolean {
    return serviceRect.left >= roleRect.right - minGapPx
}
