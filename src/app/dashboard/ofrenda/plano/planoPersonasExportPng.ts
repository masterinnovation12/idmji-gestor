/**
 * Export PNG «directorio de personas» (Labor ofrenda).
 * Cabecera navy + tarjeta blanca con tabla Persona | Días | Capacidad,
 * marcadores ★ (prioridad) y ♥ (pareja), zebra y pie dorado con leyenda de días.
 */
import { IDMJI_BRAND } from '../exportBrand'
import { drawLaborOfrendaExportHeaderSquare } from './drawLaborOfrendaExportHeader'
import {
    computePersonasExportLayout,
    personasColumnDividerXs,
    PERSONAS_EXPORT_SCALE,
    PERSONAS_EXPORT_CARD_RADIUS,
    PERSONAS_EXPORT_TABLE_HEADER_BG,
} from './planoPersonasExportLayout'
import { formatDiasCell, formatRoleCountsCell, type PlanoPersonaExportRow } from './planoPersonasExportFormat'
import type { PlanoFilterCapacidad } from './planoPersonasFilter'

export interface PlanoPersonasExportLabels {
    churchName: string
    title: string
    subtitle: string
    /** Recuentos por turno (segunda línea de cabecera). */
    dayCountsLine: string
    colName: string
    colDays: string
    colVeces: string
    colCapacity: string
    capOfrendario: string
    capApoyo: string
    capAmbos: string
    dayJ: string
    dayM: string
    dayT: string
    /** Plantilla de recuentos por rol, p. ej. «{o}O · {a}A». */
    roleCountsTemplate: string
    /** Leyenda del pie: significado de O y A. */
    roleLegend: string
}

const STAR = '★'
const HEART = '♥'

function capLabel(c: PlanoFilterCapacidad, labels: PlanoPersonasExportLabels): string {
    if (c === 'ofrendario') return labels.capOfrendario
    if (c === 'apoyo') return labels.capApoyo
    return labels.capAmbos
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (maxWidth <= 0) return ''
    if (ctx.measureText(text).width <= maxWidth) return text
    let t = text
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
        t = t.slice(0, -1)
    }
    return `${t}…`
}

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

function drawTableHeader(
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof computePersonasExportLayout>,
    tableX: number,
    labels: PlanoPersonasExportLabels,
) {
    ctx.fillStyle = PERSONAS_EXPORT_TABLE_HEADER_BG
    roundRect(ctx, tableX, layout.cardY, layout.tableWidth, layout.tableHeaderH, PERSONAS_EXPORT_CARD_RADIUS, true, true, false, false)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = '800 18px Montserrat, Inter, Arial, sans-serif'
    ctx.textBaseline = 'middle'
    const midY = layout.cardY + layout.tableHeaderH / 2

    ctx.textAlign = 'left'
    ctx.fillText(labels.colName.toUpperCase(), tableX + 16, midY)

    ctx.textAlign = 'center'
    ctx.fillText(labels.colDays.toUpperCase(), tableX + layout.colName + layout.colDays / 2, midY)
    ctx.fillText(
        labels.colVeces.toUpperCase(),
        tableX + layout.colName + layout.colDays + layout.colVeces / 2,
        midY,
    )
    ctx.fillText(
        labels.colCapacity.toUpperCase(),
        tableX + layout.colName + layout.colDays + layout.colVeces + layout.colCap / 2,
        midY,
    )
}

/** Exporta el directorio de personas filtrado a PNG y dispara la descarga. */
export async function exportPlanoPersonasPng(
    rows: readonly PlanoPersonaExportRow[],
    labels: PlanoPersonasExportLabels,
    filename: string,
): Promise<void> {
    const layout = computePersonasExportLayout(rows.length)
    const scale = PERSONAS_EXPORT_SCALE

    const canvas = document.createElement('canvas')
    canvas.width = layout.width * scale
    canvas.height = layout.height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas no disponible')

    ctx.scale(scale, scale)
    ctx.fillStyle = IDMJI_BRAND.pageBg
    ctx.fillRect(0, 0, layout.width, layout.height)

    await drawLaborOfrendaExportHeaderSquare(ctx, layout.width, layout.headerH, {
        churchName: labels.churchName,
        title: labels.title,
        subtitle: labels.subtitle,
        detail: labels.dayCountsLine,
    })

    const tableX = layout.insetX
    const dividers = personasColumnDividerXs(tableX, layout)

    // Tarjeta blanca
    ctx.save()
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 3
    ctx.fillStyle = '#ffffff'
    roundRect(ctx, tableX, layout.cardY, layout.tableWidth, layout.cardH, PERSONAS_EXPORT_CARD_RADIUS)
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = IDMJI_BRAND.border
    ctx.lineWidth = 1
    roundRect(ctx, tableX, layout.cardY, layout.tableWidth, layout.cardH, PERSONAS_EXPORT_CARD_RADIUS)
    ctx.stroke()

    drawTableHeader(ctx, layout, tableX, labels)

    const dayLetters = { j: labels.dayJ, m: labels.dayM, t: labels.dayT }

    rows.forEach((row, idx) => {
        const y = layout.tableBodyY + idx * layout.rowH
        const isLast = idx === rows.length - 1

        ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f4f6fa'
        ctx.fillRect(tableX, y, layout.tableWidth, layout.rowH)

        if (!isLast) {
            ctx.strokeStyle = IDMJI_BRAND.borderLight
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(tableX, y + layout.rowH)
            ctx.lineTo(tableX + layout.tableWidth, y + layout.rowH)
            ctx.stroke()
        }

        const midY = y + layout.rowH / 2
        const nameColor = row.activo ? IDMJI_BRAND.text : IDMJI_BRAND.textMuted

        // Columna Persona: ★ + nombre + ♥
        let nx = tableX + 16
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'left'

        if (row.estrella) {
            ctx.fillStyle = IDMJI_BRAND.gold
            ctx.font = '800 18px Montserrat, Inter, Arial, sans-serif'
            ctx.fillText(STAR, nx, midY)
            nx += ctx.measureText(STAR).width + 6
        }

        let heartW = 0
        ctx.font = '800 16px Montserrat, Inter, Arial, sans-serif'
        if (row.conPareja) heartW = ctx.measureText(`  ${HEART}`).width

        ctx.fillStyle = nameColor
        ctx.font = '700 22px Montserrat, Inter, Arial, sans-serif'
        const nameMaxW = tableX + layout.colName - 12 - nx - heartW
        const name = truncateToWidth(ctx, row.nombre, nameMaxW)
        ctx.fillText(name, nx, midY)

        if (row.conPareja) {
            const nameW = ctx.measureText(name).width
            ctx.fillStyle = '#e0556b'
            ctx.font = '800 16px Montserrat, Inter, Arial, sans-serif'
            ctx.fillText(HEART, nx + nameW + 6, midY)
        }

        // Columna Días (centrada, palabras completas: «Jueves · Domingo M · Domingo T»)
        ctx.fillStyle = IDMJI_BRAND.navy
        ctx.font = '700 15px Montserrat, Inter, Arial, sans-serif'
        ctx.textAlign = 'center'
        const diasMaxW = layout.colDays - 12
        ctx.fillText(
            truncateToWidth(ctx, formatDiasCell(row.dias, dayLetters, '—', ' · '), diasMaxW),
            tableX + layout.colName + layout.colDays / 2,
            midY,
        )

        // Columna Veces (centrada: «1O · 2A»)
        ctx.fillStyle = IDMJI_BRAND.navy
        ctx.font = '800 17px Montserrat, Inter, Arial, sans-serif'
        const vecesX = tableX + layout.colName + layout.colDays + layout.colVeces / 2
        ctx.fillText(
            formatRoleCountsCell(row.ofrendarioCount, row.apoyoCount, labels.roleCountsTemplate),
            vecesX,
            midY,
        )

        // Columna Capacidad (centrada)
        ctx.fillStyle = IDMJI_BRAND.textSecondary
        ctx.font = '700 18px Montserrat, Inter, Arial, sans-serif'
        const capX = tableX + layout.colName + layout.colDays + layout.colVeces + layout.colCap / 2
        const capMaxW = layout.colCap - 16
        ctx.fillText(truncateToWidth(ctx, capLabel(row.capacidad, labels), capMaxW), capX, midY)
    })

    // Divisores verticales
    ctx.strokeStyle = IDMJI_BRAND.borderLight
    ctx.lineWidth = 1
    for (const x of dividers) {
        ctx.beginPath()
        ctx.moveTo(x, layout.tableBodyY)
        ctx.lineTo(x, layout.footerBarY)
        ctx.stroke()
    }

    // Pie dorado (leyenda de días)
    ctx.fillStyle = IDMJI_BRAND.gold
    roundRect(
        ctx,
        tableX,
        layout.footerBarY,
        layout.tableWidth,
        layout.footerBarH,
        PERSONAS_EXPORT_CARD_RADIUS,
        false,
        false,
        true,
        true,
    )
    ctx.fill()

    ctx.fillStyle = IDMJI_BRAND.text
    ctx.font = '700 13px Montserrat, Inter, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(labels.roleLegend, tableX + layout.tableWidth / 2, layout.footerBarY + layout.footerBarH / 2)

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
