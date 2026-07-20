/**
 * Geometría cabecera landscape — export PNG plano (jueves / domingo / tarde).
 */

export const PLANO_HEADER_HEIGHT = 148
export const PLANO_HEADER_LOGO = 112
export const PLANO_HEADER_LOGO_INNER = 96
export const PLANO_HEADER_LOGO_GAP = 20
export const PLANO_HEADER_SIDE_PAD = 32

export interface PlanoHeaderBlockLayout {
    height: number
    logoX: number
    logoY: number
    logoOuter: number
    textX: number
    textW: number
    titleY: number
    titleFontPx: number
    subtitleY: number
    subtitleFontPx: number
}

// Sin línea de iglesia (el logo ya identifica a la congregación): solo título y
// día (jueves / domingo mañana / domingo tarde), más grandes para leerse bien.
const LINE = {
    title: 46,
    subtitle: 32,
} as const

const GAP = {
    titleSubtitle: 8,
} as const

function textBlockHeight(): number {
    return LINE.title + GAP.titleSubtitle + LINE.subtitle
}

/** Cluster logo + textos centrado horizontalmente en el lienzo. */
export function computePlanoHeaderBlockLayout(canvasWidth: number): PlanoHeaderBlockLayout {
    const height = PLANO_HEADER_HEIGHT
    const logoOuter = PLANO_HEADER_LOGO
    const textW = Math.min(620, canvasWidth - PLANO_HEADER_SIDE_PAD * 2 - logoOuter - PLANO_HEADER_LOGO_GAP)
    const clusterW = logoOuter + PLANO_HEADER_LOGO_GAP + textW
    const startX = Math.max(PLANO_HEADER_SIDE_PAD, Math.floor((canvasWidth - clusterW) / 2))
    const logoX = startX
    const logoY = (height - logoOuter) / 2
    const textX = logoX + logoOuter + PLANO_HEADER_LOGO_GAP

    const blockH = textBlockHeight()
    const blockY = (height - blockH) / 2
    const titleY = blockY
    const subtitleY = titleY + LINE.title + GAP.titleSubtitle

    return {
        height,
        logoX,
        logoY,
        logoOuter,
        textX,
        textW,
        titleY,
        titleFontPx: 40,
        subtitleY,
        subtitleFontPx: 26,
    }
}

export function planoHeaderBlockFits(layout: PlanoHeaderBlockLayout): boolean {
    const bottom = layout.subtitleY + LINE.subtitle
    return layout.logoY >= 8 && bottom <= layout.height - 8
}

export function planoHeaderTextRightOfLogo(layout: PlanoHeaderBlockLayout): boolean {
    return layout.textX > layout.logoX + layout.logoOuter
}
