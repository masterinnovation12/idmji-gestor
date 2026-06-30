/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import { LABOR_OFRENDA_HEADER_SQUARE_LOGO } from './drawLaborOfrendaExportHeader'
import { buildListaExportColumnLayout } from './planoExportListaPng'
import {
    LISTA_EXPORT_SQUARE_PX,
    LISTA_EXPORT_SCALE,
    LISTA_COL_HEADER_PX,
    LISTA_FOOTER_BAR_H,
    LISTA_HEADER_SQUARE_H,
    LISTA_TABLE_GAP_AFTER_HEADER,
    LISTA_TABLE_HEADER_BG,
    listaHeadersFitColumns,
} from './planoExportListaLayout'

describe('exportPlanoListaPng — contrato mockup WhatsApp', () => {
    it('PNG 1080×1080 @2x', () => {
        expect(LISTA_EXPORT_SQUARE_PX * LISTA_EXPORT_SCALE).toBe(2160)
    })

    it('cabecera apilada intacta; tarjeta lista justo debajo', () => {
        expect(LISTA_HEADER_SQUARE_H + LISTA_TABLE_GAP_AFTER_HEADER).toBe(228)
        expect(LABOR_OFRENDA_HEADER_SQUARE_LOGO).toBe(84)
    })

    it('pie dorado integrado en tarjeta (no franja suelta)', () => {
        expect(LISTA_FOOTER_BAR_H).toBe(38)
    })

    it('cabecera columnas carbón institucional', () => {
        expect(LISTA_TABLE_HEADER_BG).toBe('#1f2937')
    })

    it('buildListaExportColumnLayout: no TDZ y cabeceras caben (regresión export)', () => {
        const tableWidth = LISTA_EXPORT_SQUARE_PX - 32
        const labels = {
            colPuesto: 'Puesto',
            colResponsable: 'Responsable',
            colApoyo: 'Apoyo',
        }
        expect(() =>
            buildListaExportColumnLayout(labels, tableWidth, LISTA_COL_HEADER_PX),
        ).not.toThrow()

        const { cols, colW } = buildListaExportColumnLayout(
            labels,
            tableWidth,
            LISTA_COL_HEADER_PX,
        )
        expect(cols).toEqual(['Puesto', 'Responsable', 'Apoyo'])
        expect(listaHeadersFitColumns(cols, colW, LISTA_COL_HEADER_PX)).toBe(true)
    })
})
