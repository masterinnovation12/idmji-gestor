import { IDMJI_BRAND } from './exportBrand'
import { EXPORT_LAYOUT_MIN_PX } from './exportLayoutMetrics'

/** Alias histórico para vista previa (zoom). */
export const EXPORT_LAYOUT_WIDTH = EXPORT_LAYOUT_MIN_PX

export interface CapturePngOptions {
    pixelRatio?: number
    /** Ancho mínimo del lienzo; nunca reduce por debajo del contenido real. */
    layoutWidth?: number
}

export interface ExportNodeDimensions {
    width: number
    height: number
}

/**
 * Mide ancho/alto reales del layout para captura PNG (evita recortes por overflow:hidden o altura subestimada).
 */
export function measureExportNodeDimensions(
    node: HTMLElement,
    minWidth = EXPORT_LAYOUT_MIN_PX,
): ExportNodeDimensions {
    const width = Math.max(minWidth, node.scrollWidth, node.offsetWidth, node.clientWidth)

    let height = Math.max(node.scrollHeight, node.offsetHeight, node.clientHeight)

    const stack: HTMLElement[] = [node]
    while (stack.length > 0) {
        const el = stack.pop()!
        for (const child of el.children) {
            if (!(child instanceof HTMLElement)) continue
            stack.push(child)
            const childBottom = child.offsetTop + child.offsetHeight
            const parsedH = Number.parseInt(child.style.height, 10)
            const styleHeight = Number.isFinite(parsedH) ? parsedH : 0
            height = Math.max(
                height,
                childBottom,
                styleHeight,
                child.scrollHeight,
                child.offsetHeight,
            )
        }
    }

    return { width, height: Math.max(Math.ceil(height), 400) }
}

/** Fuerza overflow visible en ancestros que recortan el portal de captura. */
export function releaseCaptureOverflow(node: HTMLElement): () => void {
    const restored: { el: HTMLElement; overflow: string }[] = []
    let parent = node.parentElement
    while (parent) {
        const cs = getComputedStyle(parent)
        if (cs.overflow === 'hidden' || cs.overflowY === 'hidden' || cs.overflowX === 'hidden') {
            restored.push({ el: parent, overflow: parent.style.overflow })
            parent.style.overflow = 'visible'
        }
        parent = parent.parentElement
    }
    return () => {
        for (const { el, overflow } of restored) {
            el.style.overflow = overflow
        }
    }
}

/**
 * Captura un nodo de exportación a PNG respetando el ancho y alto completos.
 */
export async function captureExportLayoutToPng(
    node: HTMLElement,
    options: CapturePngOptions = {},
): Promise<string> {
    const pixelRatio = options.pixelRatio ?? 2
    const minWidth = options.layoutWidth ?? EXPORT_LAYOUT_MIN_PX

    const restoreOverflow = releaseCaptureOverflow(node)

    const prevWidth = node.style.width
    const prevMinWidth = node.style.minWidth
    const prevOverflow = node.style.overflow
    const prevHeight = node.style.height

    node.style.overflow = 'visible'

    try {
        const { width } = measureExportNodeDimensions(node, minWidth)
        node.style.width = `${width}px`
        node.style.minWidth = `${width}px`
        node.style.height = 'auto'

        await new Promise<void>(resolve => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })

        const { width: finalW, height: finalH } = measureExportNodeDimensions(node, minWidth)
        node.style.width = `${finalW}px`
        node.style.minWidth = `${finalW}px`

        const { toPng } = await import('html-to-image')
        return await toPng(node, {
            cacheBust: true,
            pixelRatio,
            backgroundColor: IDMJI_BRAND.pageBg,
            skipFonts: true,
            width: finalW,
            height: finalH,
            canvasWidth: finalW * pixelRatio,
            canvasHeight: finalH * pixelRatio,
            style: {
                transform: 'none',
                margin: '0',
                width: `${finalW}px`,
                height: `${finalH}px`,
                overflow: 'visible',
            },
        })
    } finally {
        restoreOverflow()
        node.style.width = prevWidth
        node.style.minWidth = prevMinWidth
        node.style.overflow = prevOverflow
        node.style.height = prevHeight
    }
}
