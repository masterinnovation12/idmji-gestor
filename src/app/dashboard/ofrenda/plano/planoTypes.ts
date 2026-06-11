/**
 * planoTypes.ts — Tipos del dominio "Plano del Templo" (Labor Ofrenda)
 *
 * Modela el JSON de calibración schema v3 producido por la herramienta
 * `docs/plano-templo/herramienta/calibracion.html`:
 * - Dos vistas con coordenadas independientes: 2D (SVG 1448×1316) y 3D (foto 1024×768).
 * - Dos modos por vista: sacos_8 (8 bloques) y sacos_4 (4 columnas).
 * - Cada pack de modo: bloques (número + color + posición de etiqueta) y
 *   posiciones (tarjeta + muñequito por bloque/rol).
 *
 * @author Equipo de Desarrollo IDMJI
 * @date 2026-06-11
 */

export type PlanoModo = 'sacos_4' | 'sacos_8'
export type PlanoVista = '2d' | '3d'
export type PlanoRol = 'ofrendario' | 'apoyo'

export interface PlanoPunto {
    x: number
    y: number
}

export interface PlanoLienzo {
    w: number
    h: number
}

/** Bloque del plano: disco numerado con el color que tiñe asientos, tarjetas y muñequitos. */
export interface PlanoBloque {
    n: number
    color: string
    labelText: string
    labelPos: PlanoPunto
    /** Overrides opcionales por bloque (la herramienta permite redimensionar el disco). */
    labelSize?: number
    labelFont?: number
}

/** Posición de una pareja tarjeta + muñequito (coords en px del lienzo natural de SU vista). */
export interface PlanoPosicion {
    id: string
    bloque: number
    rol: PlanoRol
    nombre?: string
    card: PlanoPunto
    figura: PlanoPunto
}

/** Pack de un modo (sacos_4 / sacos_8) dentro de una vista. */
export interface PlanoModoPack {
    bloques: PlanoBloque[]
    posiciones: PlanoPosicion[]
}

export interface PlanoTarjetasLayout {
    minW: number
    maxW: number
    roleFont: number
    nameFont: number
    pad: number
}

export interface PlanoEtiquetaBloqueLayout {
    size: number
    font: number
}

/** Layout común a ambas vistas (tamaños de tarjetas, etiquetas y escala de muñequitos). */
export interface PlanoLayoutComun {
    tarjetas: PlanoTarjetasLayout
    etiquetaBloque: PlanoEtiquetaBloqueLayout
    figuraScale: number
    lienzo: PlanoLienzo
}

export interface PlanoPulpito {
    cx: number
    cy: number
    tarimaW: number
    tarimaH: number
    podiumW: number
    podiumH: number
    topW: number
    topH: number
    scale: number
}

export interface PlanoAlfoli {
    cx: number
    cy: number
    w: number
    h: number
    doorW: number
    doorH: number
}

/** Layout de la vista 2D: añade geometría del templo (asientos, paredes, púlpito, alfolí). */
export interface PlanoLayout2d extends PlanoLayoutComun {
    margenPared: { izq: number; der: number; sup: number; inf: number }
    pasillo: number
    asiento: { w: number; h: number; gapX: number; rowH: number; frontY: number }
    pared: { inset: number; stroke: number }
    alfolid: PlanoAlfoli
    pulpito: PlanoPulpito
}

export interface PlanoVista2d {
    lienzo: PlanoLienzo
    layout: PlanoLayout2d
    sacos_8: PlanoModoPack
    sacos_4: PlanoModoPack
}

export interface PlanoVista3d {
    lienzo: PlanoLienzo
    layout: PlanoLayoutComun
    /** Nombre de archivo de la foto de fondo por modo (servida desde /plano-templo/). */
    fondos: Record<PlanoModo, string>
    sacos_8: PlanoModoPack
    sacos_4: PlanoModoPack
}

/** JSON completo de calibración (schema v3). */
export interface PlanoCalibracion {
    schemaVersion: number
    vistas: {
        '2d': PlanoVista2d
        '3d': PlanoVista3d
    }
}

/** Datos resueltos para pintar una vista+modo concretos en la app. */
export interface PlanoVistaResuelta {
    vista: PlanoVista
    modo: PlanoModo
    lienzo: PlanoLienzo
    layout: PlanoLayoutComun
    bloques: PlanoBloque[]
    posiciones: PlanoPosicion[]
    /** URL pública de la foto de fondo (solo vista 3D). */
    fondoUrl: string | null
}

// ─── Regla de negocio: modo según sacos del plan ──────────────────────────────

export type PlanoDiaTipo = 'jueves' | 'domingo' | 'domingo_tarde'

/** Sacos configurados en el plan para un tipo de servicio (fuente de verdad: ofrenda_planes). */
export function sacosParaDia(
    plan: { sacos_jueves: number; sacos_domingo: number; sacos_domingo_tarde: number },
    diaTipo: PlanoDiaTipo,
): number {
    if (diaTipo === 'jueves') return plan.sacos_jueves
    if (diaTipo === 'domingo') return plan.sacos_domingo
    return plan.sacos_domingo_tarde
}

/** Resuelve el modo del plano a partir del nº de sacos; null si no hay disposición (≠4 y ≠8). */
export function resolverModo(sacos: number): PlanoModo | null {
    if (sacos === 4) return 'sacos_4'
    if (sacos === 8) return 'sacos_8'
    return null
}
