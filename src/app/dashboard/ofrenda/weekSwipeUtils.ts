/** Umbral de desplazamiento (px) para cambiar de semana. */
export const WEEK_SWIPE_OFFSET_THRESHOLD = 48

/** Velocidad horizontal mínima (px/s) para flick. */
export const WEEK_SWIPE_VELOCITY_THRESHOLD = 320

/** Factor de resistencia en el primer/último slide. */
export const WEEK_SWIPE_RUBBER_BAND = 0.28

export function applyWeekSwipeRubberBand(
    dx: number,
    atStart: boolean,
    atEnd: boolean,
): number {
    if (atStart && dx > 0) return dx * WEEK_SWIPE_RUBBER_BAND
    if (atEnd && dx < 0) return dx * WEEK_SWIPE_RUBBER_BAND
    return dx
}

export function resolveWeekSwipePage(
    dx: number,
    velocityX: number,
    currentPage: number,
    weeksCount: number,
): number {
    if (weeksCount <= 1) return currentPage

    const wantNext =
        dx < -WEEK_SWIPE_OFFSET_THRESHOLD || velocityX < -WEEK_SWIPE_VELOCITY_THRESHOLD
    const wantPrev =
        dx > WEEK_SWIPE_OFFSET_THRESHOLD || velocityX > WEEK_SWIPE_VELOCITY_THRESHOLD

    if (wantNext && currentPage < weeksCount - 1) return currentPage + 1
    if (wantPrev && currentPage > 0) return currentPage - 1
    return currentPage
}

export type WeekSwipeEdgeGlow = 'start' | 'end' | null

export function weekSwipeEdgeGlow(
    dx: number,
    currentPage: number,
    weeksCount: number,
): WeekSwipeEdgeGlow {
    if (currentPage === 0 && dx > 24) return 'start'
    if (currentPage >= weeksCount - 1 && dx < -24) return 'end'
    return null
}
