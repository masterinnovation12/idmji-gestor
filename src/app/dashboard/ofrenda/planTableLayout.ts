import type { CSSProperties } from 'react'

/** Anchos fijos de columnas — tabla desktop Labor Ofrenda. */
export const PLAN_SERVICE_COL_WIDTH_PX = 120
export const PLAN_ROLE_COL_WIDTH_PX = 180

export const PLAN_ROLE_COL_STYLE: CSSProperties = {
    minWidth: PLAN_ROLE_COL_WIDTH_PX,
    width: PLAN_ROLE_COL_WIDTH_PX,
    maxWidth: PLAN_ROLE_COL_WIDTH_PX,
}

export const PLAN_SERVICE_COL_STYLE: CSSProperties = {
    minWidth: PLAN_SERVICE_COL_WIDTH_PX,
    width: PLAN_SERVICE_COL_WIDTH_PX,
    maxWidth: PLAN_SERVICE_COL_WIDTH_PX,
}

export function planTableMinWidthPx(serviceCount: number): number {
    return PLAN_ROLE_COL_WIDTH_PX + serviceCount * PLAN_SERVICE_COL_WIDTH_PX
}
