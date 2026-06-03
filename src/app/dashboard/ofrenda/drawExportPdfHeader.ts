import type { jsPDF } from 'jspdf'
import { IDMJI_BRAND } from './exportBrand'
import type { ExportLegendItem } from './exportHeaderShared'
import {
    computePdfHeaderMeasurements,
    EXPORT_HEADER_LOGO_GAP_MM,
    EXPORT_HEADER_LOGO_MM,
    EXPORT_HEADER_TITLE_SEPARATOR_MM,
} from './exportHeaderLayout'

export interface DrawExportPdfHeaderOptions {
    pageW: number
    headerBlockH: number
    base64Logo: string | null
    churchName: string
    titleDoc: string
    periodLabel: string
    periodSubtitle?: string
    legend: ExportLegendItem[]
    isWeek: boolean
}

function hexToRgb(hex: string) {
    const h = hex.replace('#', '')
    return {
        r: Number.parseInt(h.slice(0, 2), 16),
        g: Number.parseInt(h.slice(2, 4), 16),
        b: Number.parseInt(h.slice(4, 6), 16),
    }
}

function measureLegendRowWidth(doc: jsPDF, items: ExportLegendItem[]): number {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    let w = 0
    for (const item of items) {
        w += doc.getTextWidth(item.label) + 9 + 3
    }
    return Math.max(0, w - 3)
}

function drawPdfLegendRow(
    doc: jsPDF,
    items: ExportLegendItem[],
    startX: number,
    y: number,
): void {
    let x = startX
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)

    for (const item of items) {
        const rgb = hexToRgb(item.color)
        const pillW = doc.getTextWidth(item.label) + 9

        doc.setFillColor(32, 40, 98)
        doc.roundedRect(x, y - 3.6, pillW, 5.2, 1.2, 1.2, 'F')

        doc.setFillColor(rgb.r, rgb.g, rgb.b)
        doc.roundedRect(x + 1.2, y - 2.6, 2.8, 2.8, 0.6, 0.6, 'F')
        doc.setDrawColor(255, 255, 255)
        doc.setLineWidth(0.2)
        doc.roundedRect(x + 1.2, y - 2.6, 2.8, 2.8, 0.6, 0.6, 'S')

        doc.setTextColor(235, 240, 248)
        doc.text(item.label, x + 5.2, y, { align: 'left' })
        x += pillW + 3
    }
}

/**
 * Cabecera PDF centrada (paridad con ExportHeaderBlock PNG).
 */
export function drawExportPdfHeader(
    doc: jsPDF,
    opts: DrawExportPdfHeaderOptions,
): number {
    const {
        pageW,
        headerBlockH,
        base64Logo,
        churchName,
        titleDoc,
        periodLabel,
        periodSubtitle,
        legend,
        isWeek,
    } = opts

    const goldRgb = hexToRgb(IDMJI_BRAND.gold)
    const navyRgb = hexToRgb(IDMJI_BRAND.navy)
    const goldLight = hexToRgb(IDMJI_BRAND.goldLight)

    doc.setFillColor(goldRgb.r, goldRgb.g, goldRgb.b)
    doc.rect(0, 0, pageW, 2.4, 'F')
    doc.setFillColor(navyRgb.r, navyRgb.g, navyRgb.b)
    doc.rect(0, 2.4, pageW, headerBlockH, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.2)
    const churchW = doc.getTextWidth(churchName.toUpperCase())

    doc.setFontSize(isWeek ? 15.5 : 17.5)
    const titleW = doc.getTextWidth(titleDoc)
    doc.setFontSize(isWeek ? 11 : 12)
    const periodW = doc.getTextWidth(periodLabel)
    const titleRowW = titleW + EXPORT_HEADER_TITLE_SEPARATOR_MM + periodW

    doc.setFontSize(8.5)
    const badgeW = periodSubtitle
        ? Math.min(doc.getTextWidth(periodSubtitle) + 10, pageW - 20)
        : 0
    const legendW = measureLegendRowWidth(doc, legend)

    const layout = computePdfHeaderMeasurements(
        pageW,
        churchW,
        titleRowW,
        badgeW,
        legendW,
    )

    const logoX = layout.clusterStartX
    const logoY = 7.5
    if (base64Logo) {
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(logoX, logoY, EXPORT_HEADER_LOGO_MM, EXPORT_HEADER_LOGO_MM, 2.5, 2.5, 'F')
        doc.setDrawColor(184, 143, 47)
        doc.setLineWidth(0.35)
        doc.roundedRect(logoX, logoY, EXPORT_HEADER_LOGO_MM, EXPORT_HEADER_LOGO_MM, 2.5, 2.5, 'S')
        doc.addImage(
            base64Logo,
            'JPEG',
            logoX + 1.2,
            logoY + 1.2,
            EXPORT_HEADER_LOGO_MM - 2.4,
            EXPORT_HEADER_LOGO_MM - 2.4,
        )
    }

    let y = 11.5
    const { textCenterX } = layout

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.2)
    doc.setTextColor(232, 217, 168)
    doc.text(churchName.toUpperCase(), textCenterX, y, { align: 'center' })

    y += 6.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(isWeek ? 15.5 : 17.5)
    doc.setTextColor(255, 255, 255)
    const titleStartX = textCenterX - titleRowW / 2
    doc.text(titleDoc, titleStartX, y, { align: 'left' })

    const periodX = titleStartX + titleW + EXPORT_HEADER_TITLE_SEPARATOR_MM
    doc.setDrawColor(212, 184, 106)
    doc.setLineWidth(0.35)
    doc.line(periodX - 2.5, y - 4.5, periodX - 2.5, y + 0.8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(isWeek ? 11 : 12)
    doc.setTextColor(goldLight.r, goldLight.g, goldLight.b)
    doc.text(periodLabel, periodX, y, { align: 'left' })

    if (periodSubtitle) {
        y += 7.5
        const badgeWDraw = doc.getTextWidth(periodSubtitle) + 10
        const badgeX = textCenterX - badgeWDraw / 2
        doc.setFillColor(48, 58, 128)
        doc.roundedRect(badgeX, y - 4.2, badgeWDraw, 6.2, 3, 3, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(248, 248, 252)
        doc.text(periodSubtitle, textCenterX, y, { align: 'center' })
        y += 5
    }

    y += periodSubtitle ? 5.5 : 6
    drawPdfLegendRow(doc, legend, layout.legendStartX, y)

    return 2.4 + headerBlockH + 4
}
