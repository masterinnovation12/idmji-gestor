import { IDMJI_BRAND } from '../exportBrand'
import {
    drawLaborOfrendaExportHeader,
    LABOR_OFRENDA_HEADER_H,
    type LaborOfrendaHeaderLabels,
} from './drawLaborOfrendaExportHeader'

export interface PlanoListaRow {
    bloque: number
    ofrendario: string
    apoyo: string
}

export interface PlanoListaExportLabels extends LaborOfrendaHeaderLabels {
    colPuesto: string
    colResponsable: string
    colApoyo: string
}

export async function exportPlanoListaPng(
    rows: PlanoListaRow[],
    labels: PlanoListaExportLabels,
    filename: string,
    width = 900,
): Promise<void> {
    const scale = 2
    const rowH = 44
    const headerTableH = 40
    const footerH = 8
    const tableH = headerTableH + rows.length * rowH + footerH
    const totalH = LABOR_OFRENDA_HEADER_H + tableH

    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = totalH * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas no disponible')

    ctx.scale(scale, scale)
    ctx.fillStyle = IDMJI_BRAND.pageBg
    ctx.fillRect(0, 0, width, totalH)

    await drawLaborOfrendaExportHeader(ctx, width, labels)

    const tableY = LABOR_OFRENDA_HEADER_H
    const colW = [80, (width - 80) / 2, (width - 80) / 2]
    const cols = [labels.colPuesto, labels.colResponsable, labels.colApoyo]

    ctx.fillStyle = IDMJI_BRAND.navyDark
    ctx.fillRect(0, tableY, width, headerTableH)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px Inter, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    let x = 0
    for (let i = 0; i < cols.length; i++) {
        ctx.fillText(cols[i], x + colW[i] / 2, tableY + headerTableH / 2)
        x += colW[i]
    }

    rows.forEach((row, idx) => {
        const y = tableY + headerTableH + idx * rowH
        ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : IDMJI_BRAND.tableMeta
        ctx.fillRect(0, y, width, rowH)
        ctx.strokeStyle = IDMJI_BRAND.borderLight
        ctx.lineWidth = 1
        ctx.strokeRect(0, y, width, rowH)

        const cells = [String(row.bloque), row.ofrendario, row.apoyo]
        let cx = 0
        ctx.fillStyle = IDMJI_BRAND.text
        ctx.font = 'bold 13px Inter, Arial, sans-serif'
        for (let i = 0; i < cells.length; i++) {
            ctx.fillText(cells[i], cx + colW[i] / 2, y + rowH / 2, colW[i] - 12)
            cx += colW[i]
        }
    })

    ctx.fillStyle = IDMJI_BRAND.gold
    ctx.fillRect(0, tableY + headerTableH + rows.length * rowH, width, footerH)

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
