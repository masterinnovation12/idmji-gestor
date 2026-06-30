/**
 * Geometría del export PNG «directorio de personas» (Labor ofrenda).
 * Ancho fijo 1080; alto VARIABLE según nº de filas (el directorio puede tener ~60),
 * con una altura de fila cómoda y legible (a diferencia del export de lista del plano,
 * que es cuadrado con 4–8 filas).
 */
import { SQUARE_HEADER_HEIGHT } from './laborOfrendaHeaderSquareLayout'

export const PERSONAS_EXPORT_WIDTH = 1080
export const PERSONAS_EXPORT_SCALE = 2
/** +24px respecto al cuadrado base: cabecera con subtítulo + recuentos por día. */
export const PERSONAS_EXPORT_HEADER_H = SQUARE_HEADER_HEIGHT + 24
export const PERSONAS_EXPORT_INSET_X = 16
export const PERSONAS_EXPORT_TABLE_HEADER_H = 48
export const PERSONAS_EXPORT_ROW_H = 46
export const PERSONAS_EXPORT_FOOTER_H = 40
export const PERSONAS_EXPORT_GAP_AFTER_HEADER = 8
export const PERSONAS_EXPORT_CARD_BOTTOM = 16
export const PERSONAS_EXPORT_CARD_RADIUS = 12
export const PERSONAS_EXPORT_TABLE_HEADER_BG = '#1f2937'

export interface PersonasExportColumns {
    colName: number
    colDays: number
    colCap: number
}

export interface PersonasExportLayout extends PersonasExportColumns {
    width: number
    height: number
    headerH: number
    insetX: number
    tableWidth: number
    cardY: number
    cardH: number
    tableHeaderH: number
    rowH: number
    tableBodyY: number
    footerBarH: number
    footerBarY: number
    bodyH: number
}

export function computePersonasExportColumns(tableWidth: number): PersonasExportColumns {
    const colDays = Math.round(tableWidth * 0.16)
    const colCap = Math.round(tableWidth * 0.26)
    const colName = tableWidth - colDays - colCap
    return { colName, colDays, colCap }
}

export function computePersonasExportLayout(rowCount: number): PersonasExportLayout {
    const width = PERSONAS_EXPORT_WIDTH
    const headerH = PERSONAS_EXPORT_HEADER_H
    const insetX = PERSONAS_EXPORT_INSET_X
    const tableWidth = width - insetX * 2
    const tableHeaderH = PERSONAS_EXPORT_TABLE_HEADER_H
    const rowH = PERSONAS_EXPORT_ROW_H
    const footerBarH = PERSONAS_EXPORT_FOOTER_H

    const cardY = headerH + PERSONAS_EXPORT_GAP_AFTER_HEADER
    const bodyH = Math.max(rowCount, 1) * rowH
    const cardH = tableHeaderH + bodyH + footerBarH
    const tableBodyY = cardY + tableHeaderH
    const footerBarY = tableBodyY + bodyH
    const height = cardY + cardH + PERSONAS_EXPORT_CARD_BOTTOM

    return {
        width,
        height,
        headerH,
        insetX,
        tableWidth,
        cardY,
        cardH,
        tableHeaderH,
        rowH,
        tableBodyY,
        footerBarH,
        footerBarY,
        bodyH,
        ...computePersonasExportColumns(tableWidth),
    }
}

/** Posiciones X de los dos divisores verticales (entre Nombre|Días|Capacidad). */
export function personasColumnDividerXs(
    tableX: number,
    cols: PersonasExportColumns,
): [number, number] {
    return [tableX + cols.colName, tableX + cols.colName + cols.colDays]
}
