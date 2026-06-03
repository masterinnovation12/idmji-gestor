/**

 * Dimensiones compartidas PNG (px) y PDF (mm) para exportaciones.

 * Ancho de lienzo y columnas: reparto completo como en el diseño original (1600px mínimo).

 */



export const EXPORT_LAYOUT_MIN_PX = 1600

export const EXPORT_ROLE_COL_MM = 54



/** Mismo criterio que el layout HTML histórico: max(1600, 145 + N×100). */

export function exportLayoutWidthPx(serviceCount: number): number {

    const count = Math.max(1, serviceCount)

    return Math.max(EXPORT_LAYOUT_MIN_PX, 145 + count * 100)

}



/** PDF: columnas reparten todo el ancho imprimible (sin columnas fijas estrechas). */

export function exportPdfColumnLayout(

    pageW: number,

    marginX: number,

    numCols: number,

): { firstColW: number; colW: number; tableW: number; tableX: number } {

    const firstColW = EXPORT_ROLE_COL_MM

    const printableW = pageW - marginX * 2

    const colW = (printableW - firstColW) / Math.max(1, numCols)

    return { firstColW, colW, tableW: printableW, tableX: marginX }

}



/** Altura bloque navy superior del PDF (evita solapar subtítulo y leyenda). */

export function exportPdfHeaderHeightMm(hasSubtitle: boolean): number {
    return hasSubtitle ? 54 : 46
}


