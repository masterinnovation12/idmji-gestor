/**
 * Geometría y marca del splash PWA (pantalla de arranque: fondo blanco + logo
 * dentro de un marco dorado, igual que el badge del logo en los PNG exportados).
 *
 * Fuente única de verdad para:
 * - `scripts/generate-splash.js` (genera el PNG de iOS con la misma fórmula).
 * - El splash in-app (`SplashScreen`) y su CSS.
 * - Los tests (`pwa-config.test.ts`) que muestrean el PNG generado.
 *
 * IMPORTANTE: si cambias la fórmula, mantén `scripts/generate-splash.js`
 * sincronizado (el test de píxeles fallará si divergen).
 */

/** Dorado del marco (mismo degradado que la franja/badge de exportación). */
export const SPLASH_GOLD = {
    deep: '#b68f2f',
    base: '#b8964a',
    light: '#d4b86a',
    shine: '#e3cc92',
} as const

export const SPLASH_BG = '#ffffff'

/** Tamaño del PNG de iOS (iPhone Pro Max, cubre la mayoría por escalado). */
export const SPLASH_IPHONE_WIDTH = 1290
export const SPLASH_IPHONE_HEIGHT = 2796

export interface SplashBadgeLayout {
    /** Lado del badge (cuadrado) en px. */
    size: number
    /** Esquina superior-izquierda del badge. */
    left: number
    top: number
    /** Grosor del marco dorado en px. */
    rim: number
    /** Radio de esquina exterior del badge en px. */
    radius: number
    /** Radio de esquina interior (zona blanca) en px. */
    innerRadius: number
    /** Padding interior (rim + aire) hasta el logo, en px. */
    innerPad: number
    /** Caja del logo dentro del badge. */
    logo: { left: number; top: number; size: number }
}

/**
 * Calcula el badge dorado centrado para un lienzo width×height.
 * El badge ocupa ~46% del lado corto (máx. razonable) y el logo ~78% del badge.
 */
export function computeSplashBadgeLayout(width: number, height: number): SplashBadgeLayout {
    const shortSide = Math.min(width, height)
    const size = Math.round(Math.min(shortSide * 0.46, height * 0.28))
    const rim = Math.max(6, Math.round(size * 0.035))
    const radius = Math.round(size * 0.16)
    const innerRadius = Math.max(0, radius - rim)
    const innerPad = rim + Math.round(size * 0.06)
    const logoSize = size - innerPad * 2
    const left = Math.round((width - size) / 2)
    const top = Math.round((height - size) / 2)
    return {
        size,
        left,
        top,
        rim,
        radius,
        innerRadius,
        innerPad,
        logo: {
            left: left + innerPad,
            top: top + innerPad,
            size: logoSize,
        },
    }
}
