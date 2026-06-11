/**
 * Genera los packs de layout para Supabase desde la calibración embebida.
 * 4 filas: (sacos_4|sacos_8) × (2d|3d).
 */

import { PLANO_CALIBRACION } from './planoData'
import type { PlanoBloque, PlanoModo, PlanoPosicion, PlanoVista, PlanoVista3d } from './planoTypes'

export interface PlanoLayoutElementos {
    schemaVersion: number
    lienzo: { w: number; h: number }
    layout: Record<string, unknown>
    fondoSrc: string | null
    bloques: PlanoBloque[]
    posiciones: Omit<PlanoPosicion, 'nombre'>[]
}

function stripNombres(posiciones: PlanoPosicion[]): Omit<PlanoPosicion, 'nombre'>[] {
    return posiciones.map(({ nombre: _n, ...rest }) => rest)
}

/** Elementos JSONB listos para ofrenda_plano_layouts.elementos */
export function buildLayoutElementos(vista: PlanoVista, modo: PlanoModo): PlanoLayoutElementos {
    const v = PLANO_CALIBRACION.vistas[vista]
    const pack = v[modo]
    if (vista === '2d') {
        return {
            schemaVersion: 3,
            lienzo: v.lienzo,
            layout: v.layout as unknown as Record<string, unknown>,
            fondoSrc: null,
            bloques: pack.bloques,
            posiciones: stripNombres(pack.posiciones),
        }
    }
    const v3d = v as PlanoVista3d
    return {
        schemaVersion: 3,
        lienzo: v.lienzo,
        layout: v.layout as unknown as Record<string, unknown>,
        fondoSrc: v3d.fondos[modo],
        bloques: pack.bloques,
        posiciones: stripNombres(pack.posiciones),
    }
}

export function buildAllLayoutSeeds(): Array<{
    modo: PlanoModo
    vista: PlanoVista
    fondo: 'svg' | 'jpg'
    elementos: PlanoLayoutElementos
}> {
    const modos: PlanoModo[] = ['sacos_4', 'sacos_8']
    const vistas: PlanoVista[] = ['2d', '3d']
    return vistas.flatMap(vista =>
        modos.map(modo => ({
            modo,
            vista,
            fondo: vista === '2d' ? ('svg' as const) : ('jpg' as const),
            elementos: buildLayoutElementos(vista, modo),
        })),
    )
}
