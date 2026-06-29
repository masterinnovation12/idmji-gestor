/**
 * Export PNG del plano (2×) — porte de capturePng de calibracion.html.
 */

import { computePlanoSvgGeometry, serializePlanoSvg } from './planoLayout'
import type { PlanoBloque, PlanoLayout2d, PlanoVistaResuelta } from './planoTypes'
import {
    drawLaborOfrendaExportHeader,
    LABOR_OFRENDA_HEADER_H,
    type LaborOfrendaHeaderLabels,
} from './drawLaborOfrendaExportHeader'

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('No se pudo cargar el fondo'))
        img.src = src
    })
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

function textLinesForCanvas(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const raw = String(text ?? '')
    const paragraphs = raw.split(/\r?\n/)
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
            if (maxWidth && ctx.measureText(next).width > maxWidth) {
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
    const scale = 2
    const t = data.layout.tarjetas
    const cw = Math.round((t.minW + t.maxW) / 2)
    const roleFs = t.roleFont + 2
    const nameFs = t.nameFont + 2
    const roleH = Math.round(roleFs + 9)
    const nameLineH = Math.round(nameFs + 5)
    const figS = data.layout.figuraScale
    const W = data.lienzo.w
    const H = data.lienzo.h
    const headerH = header ? LABOR_OFRENDA_HEADER_H : 0
    const totalH = H + headerH

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

    const colorOf = (bloque: number) =>
        data.bloques.find(b => b.n === bloque)?.color ?? '#64748b'

    for (const p of data.posiciones) {
        const c = colorOf(p.bloque)
        ctx.save()
        ctx.translate(p.figura.x, p.figura.y + headerH)
        ctx.scale(figS, figS)
        ctx.fillStyle = c
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(0, -16, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        roundRect(ctx, -14, -6, 28, 34, 8)
        ctx.fill()
        ctx.stroke()
        ctx.restore()

        const nombreTxt = p.nombre?.trim() || labels.nombrePlaceholder
        ctx.font = `bold ${nameFs}px Inter, Arial, sans-serif`
        const nameLines = textLinesForCanvas(ctx, nombreTxt, cw - 14)
        const namePad = 8
        const nameAreaH = Math.max(26, nameLines.length * nameLineH + namePad)
        const ch = roleH + nameAreaH + 4
        const x = p.card.x - cw / 2
        const y = p.card.y + headerH - ch / 2
        ctx.fillStyle = 'rgba(255,255,255,.97)'
        ctx.strokeStyle = c
        ctx.lineWidth = 4
        roundRect(ctx, x, y, cw, ch, 10)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = c
        roundRect(ctx, x + 2, y + 2, cw - 4, roleH, 8)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `900 ${roleFs}px Inter, Arial, sans-serif`
        const rolTxt = p.rol === 'ofrendario' ? labels.ofrendario : labels.apoyo
        ctx.fillText(`${p.bloque}- ${rolTxt}`, p.card.x, y + roleH / 2 + 2)
        ctx.fillStyle = p.nombre?.trim() ? '#111827' : '#94a3b8'
        ctx.font = `bold ${nameFs}px Inter, Arial, sans-serif`
        const nameY0 = y + roleH + nameLineH / 2 + 2
        drawCenteredLines(ctx, nameLines, p.card.x, nameY0, nameLineH)
    }

    const discDefault = data.layout.etiquetaBloque.size
    const discFontDefault = data.layout.etiquetaBloque.font

    for (const b of data.bloques) {
        const discR = labelDiscSize(b, discDefault) / 2
        const discFs = labelDiscFont(b, discFontDefault)
        ctx.save()
        ctx.fillStyle = b.color
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(b.labelPos.x, b.labelPos.y + headerH, discR, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = `950 ${discFs}px Inter, Arial, sans-serif`
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
