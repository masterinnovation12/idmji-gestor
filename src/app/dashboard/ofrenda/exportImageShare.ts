/**
 * exportImageShare.ts
 * Utilidades compartidas para exportar un nodo a imagen JPG en alta definición
 * (HD para WhatsApp) manteniendo un peso contenido, con descarga y compartir nativo.
 *
 *  - JPEG calidad ~0.92 + pixelRatio 2.5 → nítido en pantallas retina pero
 *    mucho más ligero que un PNG equivalente (evita que WhatsApp lo recomprima
 *    de forma agresiva y permite el envío "HD").
 *  - `shareOrDownloadJpeg` usa la Web Share API con ficheros cuando está
 *    disponible (móvil) y cae a descarga en escritorio.
 */
import { IDMJI_BRAND } from './exportBrand'
import { measureExportNodeDimensions, releaseCaptureOverflow } from './exportCapture'
import { EXPORT_LAYOUT_MIN_PX } from './exportLayoutMetrics'

export interface JpegCaptureOptions {
    /** Densidad de píxeles. 2.5 ≈ HD nítido con peso contenido. */
    pixelRatio?: number
    /** Calidad JPEG 0-1. 0.92 es un buen equilibrio nitidez/peso. */
    quality?: number
    /** Ancho mínimo del lienzo (no reduce por debajo del contenido real). */
    layoutWidth?: number
}

const DEFAULT_PIXEL_RATIO = 2.5
const DEFAULT_QUALITY = 0.92

/**
 * Captura un nodo a JPEG (dataURL) respetando ancho/alto completos.
 * Mismo saneado de overflow y medición que la captura PNG del proyecto.
 */
export async function captureNodeToJpegDataUrl(
    node: HTMLElement,
    options: JpegCaptureOptions = {},
): Promise<string> {
    const pixelRatio = options.pixelRatio ?? DEFAULT_PIXEL_RATIO
    const quality = options.quality ?? DEFAULT_QUALITY
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

        const { toJpeg } = await import('html-to-image')
        return await toJpeg(node, {
            cacheBust: true,
            pixelRatio,
            quality,
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

/** Convierte un dataURL a Blob (para compartir/descargar). */
export function dataUrlToBlob(dataUrl: string): Blob {
    const [head, body] = dataUrl.split(',')
    const mime = /:(.*?);/.exec(head)?.[1] ?? 'image/jpeg'
    const binary = atob(body)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
}

/** Descarga un dataURL con el nombre indicado. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => a.remove(), 1200)
}

/** ¿Puede el navegador compartir ficheros de imagen? (móvil moderno) */
export function canShareImageFiles(): boolean {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false
    try {
        const probe = new File([new Blob()], 'probe.jpg', { type: 'image/jpeg' })
        return navigator.canShare({ files: [probe] })
    } catch {
        return false
    }
}

export interface ShareResult {
    /** 'shared' = compartido nativo; 'downloaded' = fallback descarga. */
    outcome: 'shared' | 'downloaded'
}

/**
 * Comparte la imagen JPEG en HD (Web Share API con fichero) o, si no está
 * disponible o el usuario cancela, la descarga.
 */
export async function shareOrDownloadJpeg(
    dataUrl: string,
    filename: string,
    shareTitle: string,
): Promise<ShareResult> {
    const blob = dataUrlToBlob(dataUrl)
    const file = new File([blob], filename, { type: 'image/jpeg' })

    if (canShareImageFiles()) {
        try {
            await navigator.share({ files: [file], title: shareTitle })
            return { outcome: 'shared' }
        } catch (err) {
            // AbortError = el usuario canceló el diálogo: no forzamos descarga.
            if (err instanceof DOMException && err.name === 'AbortError') {
                return { outcome: 'shared' }
            }
            // Cualquier otro fallo → descarga como respaldo.
        }
    }

    downloadDataUrl(dataUrl, filename)
    return { outcome: 'downloaded' }
}

export type ImageDeliverMode = 'download' | 'share'

/**
 * Entrega el contenido de un <canvas> como JPEG: descarga o comparte en HD.
 * Reutilizable por los exportadores basados en canvas (plano/lista).
 */
export async function deliverCanvasAsJpeg(
    canvas: HTMLCanvasElement,
    filename: string,
    mode: ImageDeliverMode,
    shareTitle: string,
    quality = DEFAULT_QUALITY,
): Promise<ShareResult> {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (mode === 'share') {
        return shareOrDownloadJpeg(dataUrl, filename, shareTitle)
    }
    downloadDataUrl(dataUrl, filename)
    return { outcome: 'downloaded' }
}
