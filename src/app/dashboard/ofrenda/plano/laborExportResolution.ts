/**
 * Resolución de export PNG (Labor Ofrenda) compatible con envío HD en WhatsApp.
 *
 * WhatsApp comprime el envío estándar a ~1600px; la opción HD solo aparece si el
 * archivo original supera el umbral de fotos de cámara (~3024px en el lado largo).
 * Ver: faq.whatsapp.com/759301289012856 e informes de calibración iOS 12MP.
 */

/** Lado largo mínimo del PNG final para habilitar HD en WhatsApp (2026). */
export const LABOR_EXPORT_WHATSAPP_HD_MIN_LONGEST_PX = 3024

/**
 * Escala entera de canvas para un diseño cuyo lado largo es `designLongestPx`.
 * Garantiza `designLongestPx * scale >= LABOR_EXPORT_WHATSAPP_HD_MIN_LONGEST_PX`.
 */
export function laborExportScaleForDesign(designLongestPx: number): number {
    const side = Math.max(1, Math.ceil(designLongestPx))
    return Math.max(2, Math.ceil(LABOR_EXPORT_WHATSAPP_HD_MIN_LONGEST_PX / side))
}

/** Dimensiones finales del PNG (lado largo) con la escala calculada o explícita. */
export function laborExportOutputLongestPx(
    designLongestPx: number,
    scale?: number,
): number {
    const s = scale ?? laborExportScaleForDesign(designLongestPx)
    return designLongestPx * s
}

/** Escala compartida para lienzos de diseño 1080px (lista y directorio personas). */
export const LABOR_EXPORT_MOBILE_DESIGN_PX = 1080

export const LABOR_EXPORT_MOBILE_SCALE = laborExportScaleForDesign(
    LABOR_EXPORT_MOBILE_DESIGN_PX,
)
