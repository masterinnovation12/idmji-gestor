/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { SERVICE_EXPORT_COLORS } from '../exportBrand'
import {
    computeListaSquareLayout,
    estimateListaHeaderTextWidth,
    listaCellTypography,
    listaColumnDividerXs,
    listaColumnWidths,
    listaHeadersFitColumns,
    LISTA_COL_HEADER_PX,
    LISTA_COL_HEADER_PAD_X,
    LISTA_EXPORT_SQUARE_PX,
    LISTA_FOOTER_BAR_H,
    LISTA_HEADER_SQUARE_H,
    LISTA_TABLE_GAP_AFTER_HEADER,
    LISTA_TABLE_HEADER_BG,
    LISTA_TABLE_HEADER_H,
} from './planoExportListaLayout'

describe('planoExportListaLayout — mockup WhatsApp lista', () => {
    it('canvas 1:1 y tarjeta ocupa el cuerpo bajo la cabecera', () => {
        const layout = computeListaSquareLayout(8)
        expect(layout.side).toBe(LISTA_EXPORT_SQUARE_PX)
        expect(layout.cardY).toBe(LISTA_HEADER_SQUARE_H + LISTA_TABLE_GAP_AFTER_HEADER)
        expect(layout.cardY + layout.cardH).toBe(LISTA_EXPORT_SQUARE_PX - 10)
    })

    it('geometría tabla: cabecera + filas + pie dorado encajan en la tarjeta', () => {
        const layout = computeListaSquareLayout(8)
        const used =
            layout.tableHeaderH + layout.gridBodyH + layout.footerBarH
        expect(used).toBeLessThanOrEqual(layout.cardH)
        expect(layout.footerBarY).toBe(layout.tableBodyY + layout.gridBodyH)
        expect(layout.footerBarH).toBe(LISTA_FOOTER_BAR_H)
    })

    it('8 filas domingo: nombres ≥22px y cabeceras columnas +50 %', () => {
        const { typography, rowH } = computeListaSquareLayout(8)
        expect(typography.namePx).toBeGreaterThanOrEqual(22)
        expect(typography.namePx).toBeLessThanOrEqual(32)
        expect(typography.namePx / rowH).toBeGreaterThanOrEqual(0.3)
        expect(typography.colHeaderPx).toBe(LISTA_COL_HEADER_PX)
        expect(typography.colHeaderPx).toBeGreaterThanOrEqual(19)
    })

    it('4 filas jueves con ref 8: misma altura de fila que domingo 8', () => {
        const eight = computeListaSquareLayout(8)
        const fourRef8 = computeListaSquareLayout(4, 8)
        expect(fourRef8.rowH).toBe(eight.rowH)
        expect(fourRef8.tableBodyH).toBe(4 * eight.rowH)
        expect(fourRef8.gridBodyH).toBe(8 * eight.rowH)
        expect(fourRef8.footerBarY).toBe(eight.footerBarY)
        expect(fourRef8.typography.namePx).toBe(eight.typography.namePx)
    })

    it('4 filas sin ref: tipografía escala sin quedar diminuta', () => {
        const { typography } = computeListaSquareLayout(4)
        expect(typography.namePx).toBeGreaterThanOrEqual(22)
        expect(typography.puestoPx).toBeGreaterThan(typography.namePx)
    })

    it('tipografía crece con altura de fila (ratio ~42 %)', () => {
        const low = listaCellTypography(70)
        const high = listaCellTypography(110)
        expect(high.namePx).toBeGreaterThanOrEqual(low.namePx)
        expect(low.namePx).toBeGreaterThanOrEqual(22)
        expect(low.colHeaderPx).toBe(20)
    })

    it('columna PUESTO cabe «PUESTO» @ 20px (regresión recorte)', () => {
        const tableWidth = LISTA_EXPORT_SQUARE_PX - 16 * 2
        const headers: [string, string, string] = ['Puesto', 'Responsable', 'Apoyo']
        const colW = listaColumnWidths(tableWidth, headers, LISTA_COL_HEADER_PX)
        const textW = estimateListaHeaderTextWidth('PUESTO', LISTA_COL_HEADER_PX)

        expect(colW[0]).toBeGreaterThan(68)
        expect(colW[0] - LISTA_COL_HEADER_PAD_X * 2).toBeGreaterThanOrEqual(textW)
        expect(listaHeadersFitColumns(headers, colW)).toBe(true)
    })

    it('cabeceras ES y CA caben en sus columnas', () => {
        const tableWidth = LISTA_EXPORT_SQUARE_PX - 16 * 2
        const es: [string, string, string] = ['Puesto', 'Responsable', 'Apoyo']
        const ca: [string, string, string] = ['Lloc', 'Ofrenador', 'Suport']

        expect(listaHeadersFitColumns(es, listaColumnWidths(tableWidth, es))).toBe(true)
        expect(listaHeadersFitColumns(ca, listaColumnWidths(tableWidth, ca))).toBe(true)
    })

    it('RESPONSABLE (la más ancha) cabe en columna central', () => {
        const tableWidth = 1048
        const colW = listaColumnWidths(tableWidth, ['Puesto', 'Responsable', 'Apoyo'], 20)
        const textW = estimateListaHeaderTextWidth('RESPONSABLE', 20)
        expect(colW[1] - LISTA_COL_HEADER_PAD_X * 2).toBeGreaterThanOrEqual(textW)
    })

    it('divisores verticales entre las tres columnas', () => {
        const colW = listaColumnWidths(1048)
        const [d1, d2] = listaColumnDividerXs(16, colW)
        expect(d1).toBe(16 + colW[0])
        expect(d2).toBe(16 + colW[0] + colW[1])
    })

    it('cabecera tabla carbón (#1f2937) como mockup', () => {
        expect(LISTA_TABLE_HEADER_BG).toBe('#1f2937')
        expect(LISTA_TABLE_HEADER_H).toBe(44)
    })
})

describe('lista zebra — mockup (#fff / #eef2fa domingo)', () => {
    function hexLuminance(hex: string): number {
        const n = parseInt(hex.slice(1), 16)
        const r = (n >> 16) & 0xff
        const g = (n >> 8) & 0xff
        const b = n & 0xff
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255
    }

    it('fila impar domingo usa labelBgEven (#eef2fa), no el tono más oscuro', () => {
        const even = SERVICE_EXPORT_COLORS.domingo.labelBgEven
        const odd = SERVICE_EXPORT_COLORS.domingo.labelBgOdd
        expect(even).toBe('#eef2fa')
        expect(hexLuminance(even)).toBeGreaterThan(hexLuminance(odd))
    })

    it('contraste nombres negros sobre zebra claro', () => {
        for (const key of ['jueves', 'domingo', 'domingo_tarde'] as const) {
            const p = SERVICE_EXPORT_COLORS[key]
            expect(hexLuminance(p.labelBgEven)).toBeGreaterThan(0.85)
        }
    })
})
