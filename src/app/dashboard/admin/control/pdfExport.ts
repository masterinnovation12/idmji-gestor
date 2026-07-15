import { jsPDF } from 'jspdf'
import type { ControlData } from './actions'

export interface PdfAlertRow {
    title: string
    count: number
}

/**
 * Informe ejecutivo en PDF del panel de control (cliente, jsPDF sin plugins).
 * Cabecera de marca (navy + dorado), KPIs, resumen por sede, participaciones
 * por hermano y salud de datos. Todas las etiquetas llegan traducidas.
 */

export interface PdfLabels {
    titulo: string
    subtituloSede: string
    mes: string
    generado: string
    kpis: string
    resumenSedes: string
    participaciones: string
    salud: string
    saludOk: string
    colSede: string
    colActiva: string
    colCultos: string
    colParticipaciones: string
    colLecturas: string
    colUsuarios: string
    colHermano: string
    colIntro: string
    colEnsenanza: string
    colTestimonios: string
    colFinal: string
    colTotal: string
    si: string
    no: string
    kpiCultos: string
    kpiParticipaciones: string
    kpiHermanos: string
    kpiLecturas: string
    kpiLabores: string
    pagina: string
}

const NAVY: [number, number, number] = [31, 46, 133]
const NAVY_LIGHT: [number, number, number] = [40, 53, 147]
const GOLD: [number, number, number] = [184, 150, 74]
const CREAM: [number, number, number] = [248, 243, 232]
const INK: [number, number, number] = [30, 41, 59]
const ZEBRA: [number, number, number] = [246, 247, 251]

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 14
const CONTENT_W = PAGE_W - MARGIN * 2

interface Column {
    label: string
    width: number // proporción relativa
    align?: 'left' | 'center' | 'right'
}

export function buildControlPdf(
    data: ControlData,
    alertRows: PdfAlertRow[],
    opts: { sedeLabel: string; mesNombre: string; anio: number; labels: PdfLabels },
): jsPDF {
    const { labels, sedeLabel, mesNombre, anio } = opts
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    let y = 0

    const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])
    const ink = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])

    const drawBrandHeader = () => {
        fill(NAVY)
        doc.rect(0, 0, PAGE_W, 26, 'F')
        ink([255, 255, 255])
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(18)
        doc.text(labels.titulo, MARGIN, 13)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const sub = `${labels.subtituloSede}: ${sedeLabel}  ·  ${mesNombre} ${anio}  ·  ${labels.generado} ${new Date().toLocaleString('sv-SE').slice(0, 16)}`
        doc.text(sub, MARGIN, 20)
        fill(GOLD)
        doc.rect(0, 26, PAGE_W, 1.4, 'F')
        y = 36
    }

    const ensureSpace = (needed: number) => {
        if (y + needed > PAGE_H - 16) {
            doc.addPage()
            drawBrandHeader()
        }
    }

    const sectionTitle = (text: string) => {
        ensureSpace(12)
        ink(NAVY)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text(text, MARGIN, y)
        y += 6
    }

    const drawTable = (columns: Column[], rows: string[][], highlightLastCol = false) => {
        const totalUnits = columns.reduce((n, c) => n + c.width, 0)
        const colX: number[] = []
        let acc = MARGIN
        for (const c of columns) {
            colX.push(acc)
            acc += (c.width / totalUnits) * CONTENT_W
        }
        const rowH = 7

        const drawHeader = () => {
            fill(NAVY_LIGHT)
            doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
            ink([255, 255, 255])
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8)
            columns.forEach((c, i) => {
                const w = (c.width / totalUnits) * CONTENT_W
                const tx = c.align === 'right' ? colX[i] + w - 2 : c.align === 'center' ? colX[i] + w / 2 : colX[i] + 2
                doc.text(c.label, tx, y + 4.7, { align: c.align ?? 'left', maxWidth: w - 4 })
            })
            y += rowH
        }

        ensureSpace(rowH * 2)
        drawHeader()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        rows.forEach((row, ri) => {
            if (y + rowH > PAGE_H - 16) {
                doc.addPage()
                drawBrandHeader()
                drawHeader()
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(8)
            }
            if (ri % 2 === 1) {
                fill(ZEBRA)
                doc.rect(MARGIN, y, CONTENT_W, rowH, 'F')
            }
            columns.forEach((c, i) => {
                const w = (c.width / totalUnits) * CONTENT_W
                const isLast = highlightLastCol && i === columns.length - 1
                ink(isLast ? NAVY : INK)
                if (isLast) doc.setFont('helvetica', 'bold')
                const tx = c.align === 'right' ? colX[i] + w - 2 : c.align === 'center' ? colX[i] + w / 2 : colX[i] + 2
                doc.text(String(row[i] ?? ''), tx, y + 4.7, { align: c.align ?? 'left', maxWidth: w - 4 })
                if (isLast) doc.setFont('helvetica', 'normal')
            })
            y += rowH
        })
        y += 4
    }

    // ── Cabecera ────────────────────────────────────────────────────────────
    drawBrandHeader()

    // ── KPIs (5 cajas) ──────────────────────────────────────────────────────
    sectionTitle(labels.kpis)
    const kpis: Array<[string, number]> = [
        [labels.kpiCultos, data.kpis.cultos],
        [labels.kpiParticipaciones, data.kpis.participaciones],
        [labels.kpiHermanos, data.kpis.hermanosActivos],
        [labels.kpiLecturas, data.kpis.lecturas],
        [labels.kpiLabores, data.kpis.serviciosLabores],
    ]
    const boxW = (CONTENT_W - 4 * 3) / 5
    const boxH = 18
    ensureSpace(boxH + 2)
    kpis.forEach(([label, value], i) => {
        const bx = MARGIN + i * (boxW + 3)
        fill(CREAM)
        doc.rect(bx, y, boxW, boxH, 'F')
        ink(NAVY)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(16)
        doc.text(String(value), bx + boxW / 2, y + 8, { align: 'center' })
        ink([100, 116, 139])
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.text(label, bx + boxW / 2, y + 14, { align: 'center', maxWidth: boxW - 2 })
    })
    y += boxH + 8

    // ── Resumen por sede ────────────────────────────────────────────────────
    sectionTitle(labels.resumenSedes)
    drawTable(
        [
            { label: labels.colSede, width: 4, align: 'left' },
            { label: labels.colActiva, width: 2, align: 'center' },
            { label: labels.colCultos, width: 2, align: 'center' },
            { label: labels.colParticipaciones, width: 3, align: 'center' },
            { label: labels.colLecturas, width: 2, align: 'center' },
            { label: labels.colUsuarios, width: 2, align: 'center' },
        ],
        data.sedesResumen.map(s => [
            s.nombre,
            s.activo ? labels.si : labels.no,
            String(s.cultos),
            String(s.participaciones),
            String(s.lecturas),
            String(s.usuarios),
        ]),
    )

    // ── Participaciones por hermano ─────────────────────────────────────────
    sectionTitle(labels.participaciones)
    drawTable(
        [
            { label: labels.colHermano, width: 5, align: 'left' },
            { label: labels.colSede, width: 3, align: 'left' },
            { label: labels.colIntro, width: 2, align: 'center' },
            { label: labels.colEnsenanza, width: 2, align: 'center' },
            { label: labels.colTestimonios, width: 2, align: 'center' },
            { label: labels.colFinal, width: 2, align: 'center' },
            { label: labels.colTotal, width: 2, align: 'center' },
        ],
        data.hermanos.map(h => [
            h.nombre,
            h.sede,
            String(h.intro),
            String(h.ensenanza),
            String(h.testimonios),
            String(h.finalizacion),
            String(h.total),
        ]),
        true,
    )

    // ── Salud de datos ──────────────────────────────────────────────────────
    sectionTitle(labels.salud)
    if (alertRows.length === 0) {
        ink(INK)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        ensureSpace(8)
        doc.text(labels.saludOk, MARGIN, y)
        y += 8
    } else {
        drawTable(
            [
                { label: labels.salud, width: 8, align: 'left' },
                { label: labels.colTotal, width: 2, align: 'center' },
            ],
            alertRows.map(a => [a.title, String(a.count)]),
            true,
        )
    }

    // ── Pie de página con numeración ────────────────────────────────────────
    const pages = doc.getNumberOfPages()
    for (let p = 1; p <= pages; p++) {
        doc.setPage(p)
        ink([148, 163, 184])
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(`${labels.pagina} ${p}/${pages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' })
        doc.text(`${labels.titulo} · ${mesNombre} ${anio}`, MARGIN, PAGE_H - 8)
    }

    return doc
}
