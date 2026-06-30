/**
 * Export PNG del plano (2×) — WYSIWYG respecto a PlanoCanvas.
 */

import { computePlanoSvgGeometry, serializePlanoSvg } from './planoLayout'
import {
    computePlanoCardChrome,
    figureSvgSize,
} from './planoCardLayout'
import type { PlanoBloque, PlanoLayout2d, PlanoVistaResuelta } from './planoTypes'
import {
    drawLaborOfrendaExportHeader,
    LABOR_OFRENDA_HEADER_H,
    type LaborOfrendaHeaderLabels,
} from './drawLaborOfrendaExportHeader'

const figureImageCache = new Map<string, Promise<HTMLImageElement>>()

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('No se pudo cargar el fondo'))
        img.src = src
    })
}

function figureSvgMarkup(color: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 62" width="46" height="62">
  <circle cx="23" cy="13" r="10" fill="${color}" stroke="#fff" stroke-width="3"/>
  <path d="M9 58 v-16 a14 14 0 0 1 28 0 v16 a3 3 0 0 1 -3 3 h-22 a3 3 0 0 1 -3 -3 z" transform="translate(0,-4)" fill="${color}" stroke="#fff" stroke-width="3"/>
</svg>`
}

function loadFigureImage(color: string): Promise<HTMLImageElement> {
    const cached = figureImageCache.get(color)
    if (cached) return cached
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(figureSvgMarkup(color))}`
    const promise = loadImage(url)
    figureImageCache.set(color, promise)
    return promise
}

async function loadBackground(data: PlanoVistaResuelta): Promise<HTMLImageElement> {
    if (data.fondoUrl) return loadImage(data.fondoUrl)
    const geo = computePlanoSvgGeometry(data.layout as PlanoLayout2d, data.modo, data.bloques)
    const svg = serializePlanoSvg(geo)
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    try {
        return await loadImage(url)
    } finally {
        URL.revokeObjectURL(url)
    }
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

function drawCenteredLines(
    ctx: CanvasRenderingContext2D,
    lines: string[],
    cx: number,
    y0: number,
    lineHeight: number,
) {
    lines.forEach((line, i) => {
        ctx.fillText(line, cx, y0 + i * lineHeight)
    })
}

function labelDiscSize(b: PlanoBloque, defaultSize: number): number {
    return b.labelSize ?? defaultSize
}

function labelDiscFont(b: PlanoBloque, defaultFont: number): number {
    return b.labelFont ?? defaultFont
}

export interface PlanoExportLabels {
    ofrendario: string
    apoyo: string
    nombrePlaceholder: string
}

export async function exportPlanoPng(
    data: PlanoVistaResuelta,
    labels: PlanoExportLabels,
    filename: string,
    header?: LaborOfrendaHeaderLabels,
): Promise<void> {
    const bg = await loadBackground(data)
    const tarjetas = data.layout.tarjetas
    const figS = data.layout.figuraScale
    const W = data.lienzo.w
    const H = data.lienzo.h
    const headerH = header ? LABOR_OFRENDA_HEADER_H : 0
    const totalH = H + headerH
    const scale = 2

    const colorOf = (bloque: number) =>
        data.bloques.find(b => b.n === bloque)?.color ?? '#64748b'

    const figureColors = [...new Set(data.posiciones.map(p => colorOf(p.bloque)))]
    const figureImages = new Map(
        await Promise.all(
            figureColors.map(async c => [c, await loadFigureImage(c)] as const),
        ),
    )
    const figSize = figureSvgSize(figS)

    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = totalH * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas no disponible')

    ctx.scale(scale, scale)

    if (header) {
        await drawLaborOfrendaExportHeader(ctx, W, header)
    }

    ctx.drawImage(bg, 0, headerH, W, H)

    // Capas como PlanoCanvas (z7→z8→z9): todas las figuras, luego tarjetas, luego discos.

    for (const p of data.posiciones) {
        const c = colorOf(p.bloque)
        const img = figureImages.get(c)
        if (!img) continue
        ctx.drawImage(
            img,
            p.figura.x - figSize.w / 2,
            p.figura.y + headerH - figSize.h / 2,
            figSize.w,
            figSize.h,
        )
    }

    for (const p of data.posiciones) {
        const c = colorOf(p.bloque)
        ctx.font = `800 ${tarjetas.nameFont}px Inter, Montserrat, Arial, sans-serif`
        const measureName = (t: string) => ctx.measureText(t).width
        const chrome = computePlanoCardChrome(
            tarjetas,
            p.nombre ?? '',
            labels.nombrePlaceholder,
            measureName,
        )
        const { width: cw, roleH, nameBodyH, totalH: ch, nameLineH, nameLines } = chrome

        const x = p.card.x - cw / 2
        const y = p.card.y + headerH - ch / 2

        ctx.fillStyle = 'rgba(255,255,255,.97)'
        ctx.strokeStyle = c
        ctx.lineWidth = 2
        roundRect(ctx, x, y, cw, ch, 10)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = c
        roundRect(ctx, x + 2, y + 2, cw - 4, roleH - 2, 8)
        ctx.fill()

        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `900 ${tarjetas.roleFont}px Inter, Montserrat, Arial, sans-serif`
        const rolTxt = p.rol === 'ofrendario' ? labels.ofrendario : labels.apoyo
        ctx.fillText(`${p.bloque}- ${rolTxt}`, p.card.x, y + roleH / 2)

        ctx.fillStyle = p.nombre?.trim() ? '#0f172a' : '#94a3b8'
        ctx.font = `800 ${tarjetas.nameFont}px Inter, Montserrat, Arial, sans-serif`
        const nameAreaTop = y + roleH
        const nameY0 =
            nameAreaTop + nameBodyH / 2 - ((nameLines.length - 1) * nameLineH) / 2
        drawCenteredLines(ctx, nameLines, p.card.x, nameY0, nameLineH)
    }

    const discDefault = data.layout.etiquetaBloque.size
    const discFontDefault = data.layout.etiquetaBloque.font

    for (const b of data.bloques) {
        const discR = labelDiscSize(b, discDefault) / 2
        const discFs = labelDiscFont(b, discFontDefault)
        ctx.save()
        ctx.fillStyle = b.color
        ctx.strokeStyle = 'rgba(255,255,255,.92)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(b.labelPos.x, b.labelPos.y + headerH, discR, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `950 ${discFs}px Inter, Montserrat, Arial, sans-serif`
        const labelLines = String(b.labelText || '').split(/\r?\n/)
        const labelLh = Math.round(discFs * 1.05)
        const labelY0 = b.labelPos.y + headerH - ((labelLines.length - 1) * labelLh) / 2
        drawCenteredLines(ctx, labelLines, b.labelPos.x, labelY0, labelLh)
        ctx.restore()
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('No se pudo generar la captura'))
                return
            }
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = filename
            document.body.appendChild(a)
            a.click()
            setTimeout(() => {
                URL.revokeObjectURL(a.href)
                a.remove()
            }, 1200)
            resolve()
        }, 'image/png')
    })
}

/** Limpia caché de muñecos (tests). */
export function clearPlanoFigureImageCache(): void {
    figureImageCache.clear()
}
