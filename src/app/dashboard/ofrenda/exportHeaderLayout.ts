/** IDs para pruebas de layout premium centrado. */
export const EXPORT_HEADER_ROOT_TEST_ID = 'ofrenda-export-header'
export const EXPORT_HEADER_CLUSTER_TEST_ID = 'ofrenda-export-header-cluster'
export const EXPORT_HEADER_TEXT_TEST_ID = 'ofrenda-export-header-text'

export const EXPORT_HEADER_LOGO_MM = 24
export const EXPORT_HEADER_LOGO_GAP_MM = 8
export const EXPORT_HEADER_TITLE_SEPARATOR_MM = 5

export interface PdfHeaderMeasurements {
    churchW: number
    titleRowW: number
    badgeW: number
    legendW: number
    textBlockW: number
    clusterW: number
    clusterStartX: number
    textCenterX: number
    legendStartX: number
}

/** Centra el bloque logo + texto en el ancho de página (mm). */
export function computePdfHeaderMeasurements(
    pageW: number,
    churchW: number,
    titleRowW: number,
    badgeW: number,
    legendW: number,
): PdfHeaderMeasurements {
    const textBlockW = Math.max(churchW, titleRowW, badgeW, legendW, 1)
    const clusterW = EXPORT_HEADER_LOGO_MM + EXPORT_HEADER_LOGO_GAP_MM + textBlockW
    const clusterStartX = Math.max(0, (pageW - clusterW) / 2)
    const textColumnLeft = clusterStartX + EXPORT_HEADER_LOGO_MM + EXPORT_HEADER_LOGO_GAP_MM
    const textCenterX = textColumnLeft + textBlockW / 2
    const legendStartX = textCenterX - legendW / 2

    return {
        churchW,
        titleRowW,
        badgeW,
        legendW,
        textBlockW,
        clusterW,
        clusterStartX,
        textCenterX,
        legendStartX,
    }
}
