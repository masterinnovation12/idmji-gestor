import { IDMJI_BRAND, SERVICE_EXPORT_COLORS, type ServiceExportKey } from '../exportBrand'
import {
    drawLaborOfrendaExportHeaderSquare,
    type LaborOfrendaHeaderLabels,
} from './drawLaborOfrendaExportHeader'
import {
    computeListaSquareLayout,
    listaColumnDividerXs,
    listaColumnWidths,
    LISTA_EXPORT_SCALE,
    LISTA_EXPORT_SQUARE_PX,
    LISTA_TABLE_CARD_RADIUS,
    LISTA_TABLE_HEADER_BG,
} from './planoExportListaLayout'

export interface PlanoListaRow {
    bloque: number
    ofrendario: string
    apoyo: string
}

export interface PlanoListaExportLabels extends LaborOfrendaHeaderLabels {
    colPuesto: string
    colResponsable: string
    colApoyo: string
    footer: string
}

/** Cabeceras + anchos de columna (orden seguro; evita TDZ en export). */
export function buildListaExportColumnLayout(
    labels: Pick<PlanoListaExportLabels, 'colPuesto' | 'colResponsable' | 'colApoyo'>,
    tableWidth: number,
    headerPx: number,
): { cols: [string, string, string]; colW: [number, number, number] } {
    const cols: [string, string, string] = [
        labels.colPuesto,
        labels.colResponsable,
        labels.colApoyo,
    ]
    const colW = listaColumnWidths(tableWidth, cols, headerPx)
    return { cols, colW }
}

function rowBg(idx: number, diaTipo: ServiceExportKey): string {
    if (idx % 2 === 0) return '#ffffff'
    return SERVICE_EXPORT_COLORS[diaTipo].labelBgEven
}

function truncateToWidth(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
): string {
    if (ctx.measureText(text).width <= maxWidth) return text
    let t = text
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
        t = t.slice(0, -1)
    }
    return `${t}…`
}

function strokeColumnDividers(
    ctx: CanvasRenderingContext2D,
    dividers: [number, number],
    y0: number,
    y1: number,
    color: string,
) {
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    for (const x of dividers) {
        ctx.beginPath()
        ctx.moveTo(x, y0)
        ctx.lineTo(x, y1)
        ctx.stroke()
    }
}

/**
 * Export PNG lista — formato cuadrado móvil (1080×1080 @3x, HD WhatsApp).
 * Tarjeta blanca + cabecera tabla carbón + zebra + divisores + pie dorado (mockup WhatsApp).
 */
export async function exportPlanoListaPng(
    rows: PlanoListaRow[],
    labels: PlanoListaExportLabels,
    filename: string,
    options?: { diaTipo?: ServiceExportKey; layoutReferenceRows?: number },
): Promise<void> {
    const diaTipo = options?.diaTipo ?? 'domingo'
    const layout = computeListaSquareLayout(rows.length, options?.layoutReferenceRows)
    const {
        side,
        headerH,
        cardY,
        cardH,
        tableInsetX,
        tableWidth,
        tableHeaderH,
        footerBarH,
        rowH,
        tableBodyY,
        gridBodyH,
        footerBarY,
        typography,
    } = layout

    const scale = LISTA_EXPORT_SCALE
    const canvas = document.createElement('canvas')
    canvas.width = side * scale
    canvas.height = side * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas no disponible')

    ctx.scale(scale, scale)
    ctx.fillStyle = IDMJI_BRAND.pageBg
    ctx.fillRect(0, 0, side, side)

    await drawLaborOfrendaExportHeaderSquare(ctx, side, headerH, labels)

    const tableX = tableInsetX
    const cardR = LISTA_TABLE_CARD_RADIUS
    const { cols, colW } = buildListaExportColumnLayout(
        labels,
        tableWidth,
        typography.colHeaderPx,
    )
    const dividers = listaColumnDividerXs(tableX, colW)

    // Tarjeta blanca (sombra sutil + borde)
    ctx.save()
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 3
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, tableX, cardY, tableWidth, cardH, cardR)
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = IDMJI_BRAND.border
    ctx.lineWidth = 1
    roundRect(ctx, tableX, cardY, tableWidth, cardH, cardR)
    ctx.stroke()

    // Cabecera tabla (carbón)
    ctx.fillStyle = LISTA_TABLE_HEADER_BG
    roundRect(ctx, tableX, cardY, tableWidth, tableHeaderH, cardR, true, true, false, false)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = `800 ${typography.colHeaderPx}px Montserrat, Inter, Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let hx = tableX
    for (let i = 0; i < cols.length; i++) {
        const label = cols[i].toUpperCase()
        const cellX = hx
        const cellW = colW[i]
        ctx.save()
        ctx.beginPath()
        ctx.rect(cellX, cardY, cellW, tableHeaderH)
        ctx.clip()
        ctx.fillText(label, cellX + cellW / 2, cardY + tableHeaderH / 2)
        ctx.restore()
        hx += colW[i]
    }
    strokeColumnDividers(ctx, dividers, cardY, cardY + tableHeaderH, 'rgba(255,255,255,0.22)')

    // Filas
    rows.forEach((row, idx) => {
        const y = tableBodyY + idx * rowH
        const isLast = idx === rows.length - 1

        ctx.fillStyle = rowBg(idx, diaTipo)
        ctx.fillRect(tableX, y, tableWidth, rowH)

        if (!isLast) {
            ctx.strokeStyle = IDMJI_BRAND.borderLight
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(tableX, y + rowH)
            ctx.lineTo(tableX + tableWidth, y + rowH)
            ctx.stroke()
        }

        const cells = [String(row.bloque), row.ofrendario, row.apoyo]
        let cx = tableX
        for (let i = 0; i < cells.length; i++) {
            const isPuesto = i === 0
            const padX = isPuesto ? typography.puestoPadX : typography.namePadX
            const maxW = colW[i] - padX * 2
            ctx.fillStyle = isPuesto ? IDMJI_BRAND.navy : IDMJI_BRAND.text
            ctx.font = isPuesto
                ? `800 ${typography.puestoPx}px Montserrat, Inter, Arial, sans-serif`
                : `800 ${typography.namePx}px Montserrat, Inter, Arial, sans-serif`
            ctx.textAlign = isPuesto ? 'center' : 'left'
            ctx.textBaseline = 'middle'
            const label = truncateToWidth(ctx, cells[i], maxW)
            const textX = isPuesto ? cx + colW[i] / 2 : cx + padX
            ctx.fillText(label, textX, y + rowH / 2)
            cx += colW[i]
        }
    })

    strokeColumnDividers(ctx, dividers, tableBodyY, tableBodyY + gridBodyH, IDMJI_BRAND.borderLight)

    // Pie dorado integrado en la tarjeta
    ctx.fillStyle = IDMJI_BRAND.gold
    roundRect(
        ctx,
        tableX,
        footerBarY,
        tableWidth,
        footerBarH,
        cardR,
        false,
        false,
        true,
        true,
    )
    ctx.fill()

    ctx.fillStyle = IDMJI_BRAND.text
    ctx.font = '700 12px Montserrat, Inter, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(labels.footer, tableX + tableWidth / 2, footerBarY + footerBarH / 2)

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

/** @deprecated Ancho landscape; lista usa siempre cuadrado móvil. */
export const LISTA_EXPORT_LEGACY_WIDTH = LISTA_EXPORT_SQUARE_PX

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    tl = true,
    tr = true,
    br = true,
    bl = true,
) {
    const rad = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + (tl ? rad : 0), y)
    ctx.lineTo(x + w - (tr ? rad : 0), y)
    if (tr) ctx.arcTo(x + w, y, x + w, y + rad, rad)
    else ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + h - (br ? rad : 0))
    if (br) ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad)
    else ctx.lineTo(x + w, y + h)
    ctx.lineTo(x + (bl ? rad : 0), y + h)
    if (bl) ctx.arcTo(x, y + h, x, y + h - rad, rad)
    else ctx.lineTo(x, y + h)
    ctx.lineTo(x, y + (tl ? rad : 0))
    if (tl) ctx.arcTo(x, y, x + rad, y, rad)
    else ctx.lineTo(x, y)
    ctx.closePath()
}
