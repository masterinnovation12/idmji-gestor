/**
 * Geometría cabecera apilada — export lista cuadrado móvil.
 * Bloque logo + textos centrado verticalmente en el área navy.
 */

export const SQUARE_HEADER_HEIGHT = 220
export const SQUARE_HEADER_LOGO = 84
export const SQUARE_HEADER_TEXT_PAD_X = 40

export interface SquareHeaderBlockLayout {
    height: number
    textMax: number
    logoOuter: number
    logoY: number
    churchY: number
    churchFontPx: number
    titleY: number
    titleFontPx: number
    subtitleY: number
    subtitleFontPx: number
}

/** Alturas de línea usadas para centrar el bloque (sin canvas). */
export const SQUARE_HEADER_LINE = {
    church: 14,
    title: 38,
    subtitle: 22,
} as const

export const SQUARE_HEADER_GAP = {
    logoToChurch: 10,
    churchToTitle: 6,
    titleToSubtitle: 8,
} as const

export function squareHeaderContentHeight(logoOuter: number = SQUARE_HEADER_LOGO): number {
    const g = SQUARE_HEADER_GAP
    const l = SQUARE_HEADER_LINE
    return (
        logoOuter +
        g.logoToChurch +
        l.church +
        g.churchToTitle +
        l.title +
        g.titleToSubtitle +
        l.subtitle
    )
}

/** Calcula posiciones Y del bloque cabecera (lista PNG). */
export function computeSquareHeaderBlockLayout(
    canvasWidth: number,
    canvasHeight: number = SQUARE_HEADER_HEIGHT,
): SquareHeaderBlockLayout {
    const logoOuter = SQUARE_HEADER_LOGO
    const blockH = squareHeaderContentHeight(logoOuter)
    const logoY = Math.max(12, Math.floor((canvasHeight - blockH) / 2))
    const g = SQUARE_HEADER_GAP
    const l = SQUARE_HEADER_LINE

    const churchY = logoY + logoOuter + g.logoToChurch
    const titleY = churchY + l.church + g.churchToTitle
    const subtitleY = titleY + l.title + g.titleToSubtitle

    return {
        height: canvasHeight,
        textMax: canvasWidth - SQUARE_HEADER_TEXT_PAD_X * 2,
        logoOuter,
        logoY,
        churchY,
        churchFontPx: 11,
        titleY,
        titleFontPx: 30,
        subtitleY,
        subtitleFontPx: 17,
    }
}

/** El bloque cabe en el canvas con margen inferior mínimo. */
export function squareHeaderBlockFits(layout: SquareHeaderBlockLayout): boolean {
    const bottom =
        layout.subtitleY + SQUARE_HEADER_LINE.subtitle
    return (
        layout.logoY >= 10 &&
        bottom <= layout.height - 10 &&
        layout.churchY > layout.logoY + layout.logoOuter
    )
}

/** Bloque visualmente centrado (±4px). */
export function squareHeaderIsVerticallyCentered(
    layout: SquareHeaderBlockLayout,
): boolean {
    const blockH = squareHeaderContentHeight(layout.logoOuter)
    const top = layout.logoY
    const bottom = layout.height - (layout.subtitleY + SQUARE_HEADER_LINE.subtitle)
    return Math.abs(top - bottom) <= 4
}
