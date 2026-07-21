import { IDMJI_BRAND } from '../exportBrand'
import {
    computePlanoHeaderBlockLayout,
    PLANO_HEADER_HEIGHT,
    PLANO_HEADER_LOGO_INNER,
} from './laborOfrendaHeaderPlanoLayout'
import {
    computeSquareHeaderBlockLayout,
    SQUARE_HEADER_LOGO,
} from './laborOfrendaHeaderSquareLayout'

export interface LaborOfrendaHeaderLabels {
    churchName: string
    title: string
    subtitle: string
    /** Segunda línea bajo el subtítulo (p. ej. recuentos por día). */
    detail?: string
}

/** Altura fija de cabecera premium plano (logo 112px). */
export const LABOR_OFRENDA_HEADER_H = PLANO_HEADER_HEIGHT

/** Logo en cabecera apilada (lista cuadrada móvil). */
export const LABOR_OFRENDA_HEADER_SQUARE_LOGO = SQUARE_HEADER_LOGO

export {
    SQUARE_HEADER_HEIGHT as LISTA_HEADER_SQUARE_H,
    computeSquareHeaderBlockLayout,
} from './laborOfrendaHeaderSquareLayout'

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('logo'))
        img.src = src
    })
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

function drawLogoBadge(
    ctx: CanvasRenderingContext2D,
    logo: HTMLImageElement,
    x: number,
    y: number,
    outer: number,
    inner: number,
) {
    const gold = ctx.createLinearGradient(x, y, x + outer, y + outer)
    gold.addColorStop(0, '#d4b86a')
    gold.addColorStop(1, '#b8964a')
    ctx.fillStyle = gold
    roundRect(ctx, x, y, outer, outer, 14)
    ctx.fill()
    ctx.fillStyle = '#fff'
    roundRect(ctx, x + 3, y + 3, outer - 6, outer - 6, 11)
    ctx.fill()
    const pad = (outer - inner) / 2
    ctx.drawImage(logo, x + pad, y + pad, inner, inner)
}

export async function drawLaborOfrendaExportHeaderSquare(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    labels: LaborOfrendaHeaderLabels,
): Promise<void> {
    const grad = ctx.createLinearGradient(0, 0, width, height)
    grad.addColorStop(0, IDMJI_BRAND.navy)
    grad.addColorStop(1, IDMJI_BRAND.navyDark)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    const layout = computeSquareHeaderBlockLayout(width, height)

    let logo: HTMLImageElement | null = null
    try {
        logo = await loadImage('/logo.jpg')
    } catch {
        logo = null
    }

    const logoOuter = layout.logoOuter
    const logoInner = logoOuter - 12
    const logoX = (width - logoOuter) / 2

    if (logo) {
        drawLogoBadge(ctx, logo, logoX, layout.logoY, logoOuter, logoInner)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    ctx.fillStyle = '#ffffff'
    ctx.font = `800 ${layout.titleFontPx}px Montserrat, Inter, Arial, sans-serif`
    ctx.fillText(labels.title, width / 2, layout.titleY, layout.textMax)

    ctx.fillStyle = IDMJI_BRAND.goldLight
    ctx.font = `700 ${layout.subtitleFontPx}px Montserrat, Inter, Arial, sans-serif`
    ctx.fillText(labels.subtitle, width / 2, layout.subtitleY, layout.textMax)

    if (labels.detail) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
        ctx.font = `600 ${Math.max(13, layout.subtitleFontPx - 4)}px Montserrat, Inter, Arial, sans-serif`
        ctx.fillText(labels.detail, width / 2, layout.subtitleY + layout.subtitleFontPx + 6, layout.textMax)
    }
}

/** Cabecera landscape — export PNG plano (jueves / domingo mañana / tarde). */
export async function drawLaborOfrendaExportHeader(
    ctx: CanvasRenderingContext2D,
    width: number,
    labels: LaborOfrendaHeaderLabels,
): Promise<void> {
    const h = LABOR_OFRENDA_HEADER_H
    const base = computePlanoHeaderBlockLayout(width)

    // Medir el texto real (título/subtítulo) para centrar el cluster sobre la
    // tinta y no sobre el hueco máximo reservado.
    ctx.font = `800 ${base.titleFontPx}px Montserrat, Inter, Arial, sans-serif`
    const titleW = ctx.measureText(labels.title).width
    ctx.font = `700 ${base.subtitleFontPx}px Montserrat, Inter, Arial, sans-serif`
    const subtitleW = ctx.measureText(labels.subtitle).width
    const layout = computePlanoHeaderBlockLayout(width, Math.max(titleW, subtitleW))

    const grad = ctx.createLinearGradient(0, 0, width, h)
    grad.addColorStop(0, IDMJI_BRAND.navy)
    grad.addColorStop(0.55, '#243590')
    grad.addColorStop(1, IDMJI_BRAND.navyDark)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, h)

    let logo: HTMLImageElement | null = null
    try {
        logo = await loadImage('/logo.jpg')
    } catch {
        logo = null
    }

    if (logo) {
        drawLogoBadge(
            ctx,
            logo,
            layout.logoX,
            layout.logoY,
            layout.logoOuter,
            PLANO_HEADER_LOGO_INNER,
        )
    }

    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    ctx.fillStyle = '#ffffff'
    ctx.font = `800 ${layout.titleFontPx}px Montserrat, Inter, Arial, sans-serif`
    ctx.fillText(labels.title, layout.textX, layout.titleY, layout.textW)

    ctx.fillStyle = IDMJI_BRAND.goldLight
    ctx.font = `700 ${layout.subtitleFontPx}px Montserrat, Inter, Arial, sans-serif`
    ctx.fillText(labels.subtitle, layout.textX, layout.subtitleY, layout.textW)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
    ctx.fillRect(0, h - 2, width, 2)
}

