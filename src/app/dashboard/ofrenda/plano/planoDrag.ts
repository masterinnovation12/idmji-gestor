/**
 * Utilidades de drag conscientes de escala (misma fórmula que calibracion.html).
 */

import type { PlanoLienzo, PlanoPunto } from './planoTypes'

const PAD = 4

export function clampPlanoPunto(p: PlanoPunto, lienzo: PlanoLienzo): PlanoPunto {
    return {
        x: Math.max(PAD, Math.min(lienzo.w - PAD, p.x)),
        y: Math.max(PAD, Math.min(lienzo.h - PAD, p.y)),
    }
}

export interface PlanoDragStart {
    px: number
    py: number
    cx: number
    cy: number
    rw: number
    rh: number
}

/** Convierte delta de pantalla a coords naturales del lienzo. */
export function deltaToNatural(
    start: PlanoDragStart,
    clientX: number,
    clientY: number,
    lienzo: PlanoLienzo,
): PlanoPunto {
    const nx = start.px + ((clientX - start.cx) / start.rw) * lienzo.w
    const ny = start.py + ((clientY - start.cy) / start.rh) * lienzo.h
    return clampPlanoPunto({ x: nx, y: ny }, lienzo)
}
