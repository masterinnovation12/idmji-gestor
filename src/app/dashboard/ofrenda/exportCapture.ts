import { IDMJI_BRAND } from './exportBrand'

/** Ancho fijo del layout de exportación (debe coincidir con ExportLayout). */
export const EXPORT_LAYOUT_WIDTH = 1600

export interface CapturePngOptions {
    pixelRatio?: number
}

/**
 * Captura un nodo de exportación a PNG respetando el ancho completo de la tabla.
 * En móvil, html-to-image puede recortar si no se pasan width/height explícitos.
 */
export async function captureExportLayoutToPng(
    node: HTMLElement,
    options: CapturePngOptions = {}
): Promise<string> {
    const pixelRatio = options.pixelRatio ?? 2
    const width = Math.max(EXPORT_LAYOUT_WIDTH, node.scrollWidth, node.offsetWidth)
    const height = Math.max(node.scrollHeight, node.offsetHeight, 400)

    const prevWidth = node.style.width
    const prevMinWidth = node.style.minWidth
    const prevOverflow = node.style.overflow

    node.style.width = `${width}px`
    node.style.minWidth = `${width}px`
    node.style.overflow = 'visible'

    try {
        await new Promise<void>(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })

        const { toPng } = await import('html-to-image')
        return await toPng(node, {
            cacheBust: true,
            pixelRatio,
            backgroundColor: IDMJI_BRAND.pageBg,
            // skipFonts: true evita el error "Cannot access cssRules" en hojas de
            // estilos cross-origin (Google Fonts). Los estilos inline del layout
            // ya incluyen la font-family correcta con fallbacks del sistema.
            skipFonts: true,
            width,
            height,
            canvasWidth: width * pixelRatio,
            canvasHeight: height * pixelRatio,
            style: {
                transform: 'none',
                margin: '0',
                width: `${width}px`,
            },
        })
    } finally {
        node.style.width = prevWidth
        node.style.minWidth = prevMinWidth
        node.style.overflow = prevOverflow
    }
}
