/**
 * Métricas compartidas PlanoCard (pantalla) ↔ export PNG (WYSIWYG).
 * El salto de línea replica `break-words` de PlanoCard (padding 7px, nameFont 800).
 */
import type { PlanoTarjetasLayout } from './planoTypes'

export const PLANO_CARD_NAME_PAD_X = 7

export function planoCardWidth(tarjetas: PlanoTarjetasLayout): number {
    return Math.round((tarjetas.minW + tarjetas.maxW) / 2)
}

export function planoNameMaxWidth(tarjetas: PlanoTarjetasLayout): number {
    return planoCardWidth(tarjetas) - PLANO_CARD_NAME_PAD_X * 2
}

/** Estimación ancho texto nombre (font-weight 800) — tests sin canvas. */
export function estimatePlanoNameTextWidth(text: string, nameFont: number): number {
    let w = 0
    for (const ch of text) {
        if ('il.:|!1'.includes(ch)) w += nameFont * 0.28
        else if ('MWQ@%'.includes(ch)) w += nameFont * 0.72
        else if (ch === ' ') w += nameFont * 0.28
        else w += nameFont * 0.52
    }
    return w
}

/**
 * Word-wrap como `break-words` en PlanoCard (por palabras, respeta \\n).
 * @param measureText opcional — en export PNG usar ctx.measureText para fidelidad.
 */
export function wrapPlanoNameLines(
    text: string,
    maxWidth: number,
    nameFont: number,
    measureText?: (t: string) => number,
): string[] {
    const widthOf = measureText ?? ((t: string) => estimatePlanoNameTextWidth(t, nameFont))
    const paragraphs = text.split(/\r?\n/)
    const lines: string[] = []

    for (const para of paragraphs) {
        if (!para) {
            lines.push('')
            continue
        }
        const words = para.split(/\s+/).filter(Boolean)
        if (!words.length) {
            lines.push('')
            continue
        }
        let line = words[0]
        for (let i = 1; i < words.length; i++) {
            const next = `${line} ${words[i]}`
            if (maxWidth > 0 && widthOf(next) > maxWidth) {
                lines.push(line)
                line = words[i]
            } else {
                line = next
            }
        }
        lines.push(line)
    }

    return lines.length ? lines : ['']
}

/** Líneas visibles del nombre — igual criterio en pantalla y export. */
export function layoutPlanoNameLines(
    text: string,
    tarjetas: PlanoTarjetasLayout,
    measureText?: (t: string) => number,
): string[] {
    const trimmed = text.trim()
    if (!trimmed) return [text]
    if (trimmed.includes('\n')) {
        return trimmed.split(/\r?\n/).slice(0, 2)
    }
    return wrapPlanoNameLines(
        trimmed,
        planoNameMaxWidth(tarjetas),
        tarjetas.nameFont,
        measureText,
    )
}

export function planoNameBodyMinHeight(lineCount: number, nameFont: number): number {
    const lines = Math.max(1, lineCount)
    return Math.max(26, lines * (nameFont + 3) + 10)
}

/** Franja de rol (bloque + OFRENDARIO/APOYO) — replica PlanoCard. */
export function planoRoleBandHeight(tarjetas: PlanoTarjetasLayout): number {
    return tarjetas.roleFont + 11
}

export interface PlanoCardChrome {
    width: number
    roleH: number
    nameBodyH: number
    totalH: number
    nameLineH: number
    nameLines: string[]
}

export function computePlanoCardChrome(
    tarjetas: PlanoTarjetasLayout,
    nombreRaw: string,
    placeholder: string,
    measureText?: (t: string) => number,
): PlanoCardChrome {
    const display = nombreRaw?.trim() || placeholder
    const nameLines = layoutPlanoNameLines(display, tarjetas, measureText)
    const roleH = planoRoleBandHeight(tarjetas)
    const nameBodyH = planoNameBodyMinHeight(nameLines.length, tarjetas.nameFont)
    return {
        width: planoCardWidth(tarjetas),
        roleH,
        nameBodyH,
        totalH: roleH + nameBodyH,
        nameLineH: tarjetas.nameFont + 3,
        nameLines,
    }
}

/** Orden de capas en lienzo (z-index ascendente). */
export const PLANO_EXPORT_LAYER_ORDER = ['figuras', 'tarjetas', 'discos'] as const

export function figureSvgSize(figuraScale: number): { w: number; h: number } {
    return { w: Math.round(46 * figuraScale), h: Math.round(62 * figuraScale) }
}
