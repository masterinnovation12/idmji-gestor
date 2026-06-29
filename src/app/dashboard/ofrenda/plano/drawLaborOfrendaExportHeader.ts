import { IDMJI_BRAND } from '../exportBrand'

export interface LaborOfrendaHeaderLabels {
    churchName: string
    title: string
    subtitle: string
}

const LOGO_OUTER = 112
const LOGO_INNER = 96

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

/** Altura fija de cabecera premium (logo 112px). */
export const LABOR_OFRENDA_HEADER_H = 148

export async function drawLaborOfrendaExportHeader(
    ctx: CanvasRenderingContext2D,
    width: number,
    labels: LaborOfrendaHeaderLabels,
): Promise<void> {
    const h = LABOR_OFRENDA_HEADER_H
    const grad = ctx.createLinearGradient(0, 0, width, h)
    grad.addColorStop(0, IDMJI_BRAND.navy)
    grad.addColorStop(1, IDMJI_BRAND.navyDark)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, h)

    let logo: HTMLImageElement | null = null
    try {
        logo = await loadImage('/logo.jpg')
    } catch {
        logo = null
    }

    const clusterW = Math.min(width - 48, 560)
    const startX = (width - clusterW) / 2
    const logoX = startX
    const logoY = (h - LOGO_OUTER) / 2

    if (logo) {
        const gold = ctx.createLinearGradient(logoX, logoY, logoX + LOGO_OUTER, logoY + LOGO_OUTER)
        gold.addColorStop(0, '#d4b86a')
        gold.addColorStop(1, '#b8964a')
        ctx.fillStyle = gold
        roundRect(ctx, logoX, logoY, LOGO_OUTER, LOGO_OUTER, 14)
        ctx.fill()
        ctx.fillStyle = '#fff'
        roundRect(ctx, logoX + 3, logoY + 3, LOGO_OUTER - 6, LOGO_OUTER - 6, 11)
        ctx.fill()
        const pad = (LOGO_OUTER - LOGO_INNER) / 2
        ctx.drawImage(logo, logoX + pad, logoY + pad, LOGO_INNER, LOGO_INNER)
    }

    const textX = logoX + LOGO_OUTER + 24
    const textW = clusterW - LOGO_OUTER - 24
    const centerY = h / 2

    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(232, 217, 168, 0.92)'
    ctx.font = '600 10px Inter, Arial, sans-serif'
    ctx.fillText(labels.churchName.toUpperCase(), textX, centerY - 34, textW)

    ctx.fillStyle = '#ffffff'
    ctx.font = '800 28px Inter, Arial, sans-serif'
    ctx.fillText(labels.title, textX, centerY - 4, textW)

    ctx.fillStyle = IDMJI_BRAND.goldLight
    ctx.font = '600 18px Inter, Arial, sans-serif'
    ctx.fillText(labels.subtitle, textX, centerY + 26, textW)
}
