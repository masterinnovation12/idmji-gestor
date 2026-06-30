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
    churchY: number
    churchFontPx: number
    titleY: number
    titleFontPx: number
    subtitleY: number
    subtitleFontPx: number
}

const LINE = {
    church: 14,
    title: 36,
    subtitle: 22,
} as const

const GAP = {
    churchTitle: 4,
    titleSubtitle: 6,
} as const

function textBlockHeight(): number {
    return LINE.church + GAP.churchTitle + LINE.title + GAP.titleSubtitle + LINE.subtitle
}

/** Cluster logo + textos centrado horizontalmente en el lienzo. */
export function computePlanoHeaderBlockLayout(canvasWidth: number): PlanoHeaderBlockLayout {
    const height = PLANO_HEADER_HEIGHT
    const logoOuter = PLANO_HEADER_LOGO
    const textW = Math.min(520, canvasWidth - PLANO_HEADER_SIDE_PAD * 2 - logoOuter - PLANO_HEADER_LOGO_GAP)
    const clusterW = logoOuter + PLANO_HEADER_LOGO_GAP + textW
    const startX = Math.max(PLANO_HEADER_SIDE_PAD, Math.floor((canvasWidth - clusterW) / 2))
    const logoX = startX
    const logoY = (height - logoOuter) / 2
    const textX = logoX + logoOuter + PLANO_HEADER_LOGO_GAP

    const blockH = textBlockHeight()
    const blockY = (height - blockH) / 2
    const churchY = blockY
    const titleY = churchY + LINE.church + GAP.churchTitle
    const subtitleY = titleY + LINE.title + GAP.titleSubtitle

    return {
        height,
        logoX,
        logoY,
        logoOuter,
        textX,
        textW,
        churchY,
        churchFontPx: 11,
        titleY,
        titleFontPx: 30,
        subtitleY,
        subtitleFontPx: 17,
    }
}

export function planoHeaderBlockFits(layout: PlanoHeaderBlockLayout): boolean {
    const bottom = layout.subtitleY + LINE.subtitle
    return layout.logoY >= 8 && bottom <= layout.height - 8
}

export function planoHeaderTextRightOfLogo(layout: PlanoHeaderBlockLayout): boolean {
    return layout.textX > layout.logoX + layout.logoOuter
}
