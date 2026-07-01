/**
 * Layout cuadrado móvil para export PNG lista (Labor Ofrenda).
 * Calibrado contra mockup WhatsApp (jun 2026).
 */

import { SQUARE_HEADER_HEIGHT as LISTA_HEADER_SQUARE_H } from './laborOfrendaHeaderSquareLayout'
import {
    LABOR_EXPORT_MOBILE_DESIGN_PX,
    LABOR_EXPORT_MOBILE_SCALE,
} from './laborExportResolution'

export { LISTA_HEADER_SQUARE_H }

export const LISTA_EXPORT_SQUARE_PX = LABOR_EXPORT_MOBILE_DESIGN_PX
export const LISTA_EXPORT_SCALE = LABOR_EXPORT_MOBILE_SCALE

export const LISTA_TABLE_HEADER_H = 44
/** Barra dorada con texto dentro (mockup). */
export const LISTA_FOOTER_BAR_H = 38
export const LISTA_CARD_BOTTOM_MARGIN = 10
export const LISTA_TABLE_INSET_X = 16
export const LISTA_TABLE_GAP_AFTER_HEADER = 8
export const LISTA_TABLE_CARD_RADIUS = 10

/** Color cabecera tabla (carbón, más oscuro que navy institucional). */
export const LISTA_TABLE_HEADER_BG = '#1f2937'

export interface ListaSquareLayout {
    side: number
    headerH: number
    cardY: number
    cardH: number
    tableInsetX: number
    tableWidth: number
    tableHeaderH: number
    footerBarH: number
    rowH: number
    tableBodyY: number
    tableBodyH: number
    /** Altura del cuerpo según plantilla de referencia (p. ej. 8 filas con solo 4 visibles). */
    gridBodyH: number
    footerBarY: number
    typography: ListaCellTypography
}

export interface ListaCellTypography {
    colHeaderPx: number
    puestoPx: number
    namePx: number
    namePadX: number
    puestoPadX: number
}

/** Encabezados PUESTO / RESPONSABLE / APOYO (+50 % sobre 13px base). */
export const LISTA_COL_HEADER_PX = 20

/**
 * Tipografía densa: nombres ~42 % de la altura de fila (un poco más que mockup base).
 */
export function listaCellTypography(rowH: number): ListaCellTypography {
    const namePx = Math.min(32, Math.max(22, Math.round(rowH * 0.42)))
    return {
        colHeaderPx: LISTA_COL_HEADER_PX,
        puestoPx: Math.min(34, namePx + 2),
        namePx,
        namePadX: 8,
        puestoPadX: 4,
    }
}

export function computeListaSquareLayout(
    visibleRowCount: number,
    layoutReferenceRows?: number,
): ListaSquareLayout {
    const side = LISTA_EXPORT_SQUARE_PX
    const headerH = LISTA_HEADER_SQUARE_H
    const tableInsetX = LISTA_TABLE_INSET_X
    const tableWidth = side - tableInsetX * 2
    const tableHeaderH = LISTA_TABLE_HEADER_H
    const footerBarH = LISTA_FOOTER_BAR_H

    const cardY = headerH + LISTA_TABLE_GAP_AFTER_HEADER
    const cardH = side - LISTA_CARD_BOTTOM_MARGIN - cardY
    const rowsArea = cardH - footerBarH - tableHeaderH
    const refRows = layoutReferenceRows ?? visibleRowCount
    const rowH = Math.floor(rowsArea / Math.max(refRows, 1))
    const tableBodyY = cardY + tableHeaderH
    const tableBodyH = visibleRowCount * rowH
    const gridBodyH = refRows * rowH
    const footerBarY = tableBodyY + gridBodyH

    return {
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
        tableBodyH,
        gridBodyH,
        footerBarY,
        typography: listaCellTypography(rowH),
    }
}

/** 4 sacos (jueves, dom. tarde): filas compactas como plantilla de 8 en export lista. */
export function listaLayoutReferenceRowCount(sacos: number): number | undefined {
    return sacos === 4 ? 8 : undefined
}

/** Padding horizontal mínimo en celdas de cabecera. */
export const LISTA_COL_HEADER_PAD_X = 12

/**
 * Estimación conservadora del ancho de texto cabecera (Montserrat 800, mayúsculas).
 * Calibrada para que «PUESTO» @ 20px quepa sin desbordar.
 */
export function estimateListaHeaderTextWidth(text: string, fontPx: number): number {
    const upper = text.toUpperCase()
    let w = 0
    for (const ch of upper) {
        if ('MWQ@%'.includes(ch)) w += fontPx * 0.82
        else if ('IL.:|!1'.includes(ch)) w += fontPx * 0.3
        else if (ch === ' ') w += fontPx * 0.28
        else w += fontPx * 0.64
    }
    return w
}

/** Anchos mínimos por etiqueta de cabecera (ES + CA). */
export function listaMinColumnWidths(
    headers: [string, string, string],
    headerPx: number = LISTA_COL_HEADER_PX,
): [number, number, number] {
    return headers.map(h =>
        Math.ceil(estimateListaHeaderTextWidth(h, headerPx)) + LISTA_COL_HEADER_PAD_X * 2,
    ) as [number, number, number]
}

/**
 * Columnas: puesto según cabecera (p. ej. «PUESTO» @ 20px) + dos columnas de nombres.
 */
export function listaColumnWidths(
    tableWidth: number,
    headers: [string, string, string] = ['Puesto', 'Responsable', 'Apoyo'],
    headerPx: number = LISTA_COL_HEADER_PX,
): [number, number, number] {
    const [minPuesto, minResp, minApoyo] = listaMinColumnWidths(headers, headerPx)
    const puestoW = Math.max(minPuesto, 72)

    const remaining = tableWidth - puestoW
    let col2 = Math.max(minResp, Math.floor(remaining / 2))
    let col3 = remaining - col2

    if (col3 < minApoyo) {
        col3 = minApoyo
        col2 = remaining - col3
    }
    if (col2 < minResp) {
        col2 = minResp
        col3 = remaining - col2
    }

    return [puestoW, col2, tableWidth - puestoW - col2]
}

/** Comprueba que cada cabecera cabe centrada en su columna (regresión «PUESTO» recortado). */
export function listaHeadersFitColumns(
    headers: [string, string, string],
    colW: [number, number, number],
    headerPx: number = LISTA_COL_HEADER_PX,
): boolean {
    const innerPad = LISTA_COL_HEADER_PAD_X
    return headers.every((h, i) => {
        const textW = estimateListaHeaderTextWidth(h, headerPx)
        return colW[i] - innerPad * 2 >= textW
    })
}

/** Posiciones X de los dos divisores verticales entre columnas. */
export function listaColumnDividerXs(
    tableX: number,
    colW: [number, number, number],
): [number, number] {
    return [tableX + colW[0], tableX + colW[0] + colW[1]]
}

/** @deprecated usar cardY */
export const LISTA_FOOTER_H = LISTA_FOOTER_BAR_H + LISTA_CARD_BOTTOM_MARGIN
