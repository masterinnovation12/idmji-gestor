/**
 * Lógica de instalación PWA (testeable sin React).
 * Fuente de verdad: standalone + getInstalledRelatedApps — no localStorage obsoleto.
 */

export const PWA_STORAGE_KEYS = {
    DISMISS_AT: 'pwa_prompt_dismissed_at',
    INSTALLED: 'pwa_installed',
    SESSION_SHOWN: 'pwa_prompt_shown_this_session',
} as const

export const PWA_MANIFEST_ID = 'idmji-sabadell-pwa'

/** Días sin mostrar tras cerrar con X (cierre explícito prolongado) */
export const REPROMPT_DAYS = 14

export const INSTALL_PROMPT_DELAY_MS = 5000
export const IOS_PROMPT_DELAY_MS = 4000

/**
 * Android sin beforeinstallprompt tras este tiempo → instrucciones manuales.
 * Caso típico: WebAPK recién desinstalada (Chrome tarda en refrescar su
 * registro interno y mientras tanto no dispara el evento).
 */
export const ANDROID_MANUAL_FALLBACK_DELAY_MS = 12000

/** Tras el fallback, seguir escuchando BIP este tiempo (Chrome tarda tras cooldown) */
export const CHROME_BIP_EXTENDED_WAIT_MS = 120_000

export const PWA_SW_READY_EVENT = 'idmji-sw-ready'

export const PWA_INSTALL_START_URL = '/dashboard?utm_source=pwa_install'

export type PwaPlatform = 'ios' | 'android' | 'other'

export type AndroidFallbackView = 'android-chrome-recovery' | 'android-manual'

export interface PlatformInfo {
    name: PwaPlatform
    isInApp: boolean
    isSafari: boolean
    /** Android: solo Chrome crea WebAPK real; Brave/Edge/Firefox solo acceso directo */
    supportsWebApk: boolean
}

export function detectPlatform(userAgent: string, maxTouchPoints = 0): PlatformInfo {
    const ua = userAgent.toLowerCase()
    // iPadOS 13+ se anuncia como Macintosh; se distingue por el soporte táctil.
    const isIPadOs = /macintosh/.test(ua) && maxTouchPoints > 1
    const isIOS = /iphone|ipad|ipod/.test(ua) || isIPadOs
    const isAndroid = /android/.test(ua)
    const isInApp = /fbav|instagram|fb_iab|fban|messenger|whatsapp|fbss|line\/|micromessenger/i.test(ua)

    return {
        name: isIOS ? 'ios' : isAndroid ? 'android' : 'other',
        isInApp,
        isSafari: isIOS && /safari/.test(ua) && !/crios|fxios|opr|mercury|brave/i.test(ua),
        supportsWebApk: supportsAndroidWebApk(userAgent),
    }
}

/**
 * WebAPK (app real en el cajón de Android) solo en Google Chrome.
 * Brave, Firefox, Edge, Opera y Samsung Internet solo crean acceso directo.
 */
/** Google Chrome en Android (único navegador con WebAPK real) */
export function isChromeAndroid(userAgent: string): boolean {
    const ua = userAgent.toLowerCase()
    return /android/.test(ua) && /chrome\//.test(ua) && supportsAndroidWebApk(userAgent)
}

export function supportsAndroidWebApk(userAgent: string): boolean {
    const ua = userAgent.toLowerCase()
    if (!/android/.test(ua)) return true

    if (/brave\//.test(ua)) return false
    if (/firefox\//.test(ua)) return false
    if (/edga\//.test(ua)) return false
    if (/opr\//.test(ua)) return false
    if (/samsungbrowser\//.test(ua)) return false

    return /chrome\//.test(ua)
}

export function isPwaStandalone(win: Window): boolean {
    const nav = win.navigator as Navigator & { standalone?: boolean }
    if (nav.standalone === true) return true
    try {
        return win.matchMedia('(display-mode: standalone)').matches
    } catch {
        return false
    }
}

export type RelatedAppInstallState = boolean | null

export async function checkRelatedAppInstalled(
    manifestId = PWA_MANIFEST_ID,
    nav: Navigator = typeof navigator !== 'undefined' ? navigator : ({} as Navigator)
): Promise<RelatedAppInstallState> {
    if (typeof nav === 'undefined') return null
    const navigatorWithRelated = nav as Navigator & {
        getInstalledRelatedApps?: () => Promise<Array<{ id?: string }>>
    }
    if (!navigatorWithRelated.getInstalledRelatedApps) return null

    try {
        const apps = await navigatorWithRelated.getInstalledRelatedApps()
        if (apps.length === 0) return false
        if (!manifestId) return apps.length > 0
        return apps.some((app) => app.id === manifestId)
    } catch {
        return null
    }
}

/**
 * Sincroniza pwa_installed con el estado real del navegador.
 * Limpia la marca obsoleta tras desinstalar (p. ej. Chrome vs Brave independientes).
 */
export async function syncPwaInstalledStorage(
    win: Window,
    manifestId = PWA_MANIFEST_ID
): Promise<RelatedAppInstallState> {
    if (isPwaStandalone(win)) {
        win.localStorage.setItem(PWA_STORAGE_KEYS.INSTALLED, 'true')
        return true
    }

    const related = await checkRelatedAppInstalled(manifestId, win.navigator)
    if (related === true) {
        win.localStorage.setItem(PWA_STORAGE_KEYS.INSTALLED, 'true')
    } else if (related === false) {
        resetInstallPromptAfterUninstall(win)
    }

    return related
}

/** Tras desinstalar: estado limpio como primera visita en este navegador */
export function resetInstallPromptAfterUninstall(win: Window): void {
    win.localStorage.removeItem(PWA_STORAGE_KEYS.INSTALLED)
    win.localStorage.removeItem(PWA_STORAGE_KEYS.DISMISS_AT)
    win.sessionStorage.removeItem(PWA_STORAGE_KEYS.SESSION_SHOWN)
}

export async function waitForInstallServiceWorker(
    nav: Navigator = typeof navigator !== 'undefined' ? navigator : ({} as Navigator)
): Promise<boolean> {
    if (!('serviceWorker' in nav)) return false
    try {
        await nav.serviceWorker.ready
        return true
    } catch {
        return false
    }
}

/** Android/Chrome: banner nativo solo si el navegador soporta WebAPK (no Brave/Edge) */
export function shouldOfferNativeInstallButton(
    platform: PlatformInfo | null,
    hasDeferredPrompt: boolean
): boolean {
    if (!hasDeferredPrompt) return false
    if (!platform) return false
    if (platform.name === 'ios') return true
    if (platform.name === 'android') return platform.supportsWebApk
    return true
}

export function shouldUseNativeInstallFlow(platform: PwaPlatform): boolean {
    return platform === 'android' || platform === 'other'
}

export interface ManualFallbackInput {
    platform: PwaPlatform
    hasDeferredPrompt: boolean
    isStandalone: boolean
    relatedAppInstalled: RelatedAppInstallState
}

/**
 * Android sin beforeinstallprompt → instrucciones manuales de instalación.
 * Cubre el hueco en que Chrome no ofrece instalación nativa (p. ej. justo
 * después de desinstalar la WebAPK, o navegadores Android sin soporte BIP).
 * Solo Android: en desktop Firefox/Safari no existe instalación PWA real y
 * en iOS el flujo ya son instrucciones.
 */
export function shouldShowManualFallback(input: ManualFallbackInput): boolean {
    if (input.platform !== 'android') return false
    if (input.hasDeferredPrompt) return false
    if (input.isStandalone) return false
    if (input.relatedAppInstalled === true) return false
    return true
}

export interface ResolveAndroidFallbackInput extends ManualFallbackInput {
    userAgent: string
}

/**
 * Chrome Android sin BIP → guía de recuperación WebAPK (cooldown).
 * Otros Android (Brave, etc.) → manual genérico + aviso de usar Chrome.
 */
export function resolveAndroidFallbackView(
    input: ResolveAndroidFallbackInput
): AndroidFallbackView | null {
    if (!shouldShowManualFallback(input)) return null
    if (isChromeAndroid(input.userAgent)) return 'android-chrome-recovery'
    return 'android-manual'
}

/** Resetea marcas de sesión/cierre para que Reintentar vuelva a mostrar el prompt */
export function resetInstallPromptForRetry(win: Window): void {
    win.sessionStorage.removeItem(PWA_STORAGE_KEYS.SESSION_SHOWN)
    win.localStorage.removeItem(PWA_STORAGE_KEYS.DISMISS_AT)
}

/** URL de arranque PWA con marcador de engagement para Chrome */
export function buildPwaInstallStartUrl(origin: string): string {
    return `${origin}${PWA_INSTALL_START_URL}`
}

export interface ShouldShowInstallPromptInput {
    isStandalone: boolean
    relatedAppInstalled: RelatedAppInstallState
    sessionShown: boolean
    dismissedAt: string | null
    now?: number
}

export function shouldShowInstallPrompt(input: ShouldShowInstallPromptInput): boolean {
    if (input.isStandalone) return false

    if (input.relatedAppInstalled === true) return false

    if (input.sessionShown) return false

    if (input.dismissedAt) {
        const dismissDate = new Date(Number.parseInt(input.dismissedAt, 10))
        if (!Number.isNaN(dismissDate.getTime())) {
            const now = input.now ?? Date.now()
            const daysSince = (now - dismissDate.getTime()) / (1000 * 60 * 60 * 24)
            if (daysSince < REPROMPT_DAYS) return false
        }
    }

    return true
}

export function readInstallPromptStorage(win: Window): {
    sessionShown: boolean
    dismissedAt: string | null
} {
    return {
        sessionShown: win.sessionStorage.getItem(PWA_STORAGE_KEYS.SESSION_SHOWN) === 'true',
        dismissedAt: win.localStorage.getItem(PWA_STORAGE_KEYS.DISMISS_AT),
    }
}

export function markPromptShownThisSession(win: Window): void {
    win.sessionStorage.setItem(PWA_STORAGE_KEYS.SESSION_SHOWN, 'true')
}

/** "Más tarde" / "Entendido" — ocultar hasta recargar (solo sesión) */
export function dismissInstallPromptForSession(win: Window): void {
    markPromptShownThisSession(win)
}

/** Cerrar con X — no volver a mostrar durante REPROMPT_DAYS */
export function dismissInstallPromptLongTerm(win: Window, now = Date.now()): void {
    markPromptShownThisSession(win)
    win.localStorage.setItem(PWA_STORAGE_KEYS.DISMISS_AT, String(now))
}

export function markPwaInstalled(win: Window): void {
    win.localStorage.setItem(PWA_STORAGE_KEYS.INSTALLED, 'true')
}
