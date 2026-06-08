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
/** Si Android no dispara beforeinstallprompt, mostrar instrucciones manuales */
export const ANDROID_FALLBACK_DELAY_MS = 8000

export type PwaPlatform = 'ios' | 'android' | 'other'

export interface PlatformInfo {
    name: PwaPlatform
    isInApp: boolean
    isSafari: boolean
}

export function detectPlatform(userAgent: string): PlatformInfo {
    const ua = userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(ua)
    const isAndroid = /android/.test(ua)
    const isInApp = /fbav|instagram|fb_iab|fban|messenger|whatsapp|fbss|line\/|micromessenger/i.test(ua)

    return {
        name: isIOS ? 'ios' : isAndroid ? 'android' : 'other',
        isInApp,
        isSafari: isIOS && /safari/.test(ua) && !/crios|fxios|opr|mercury|brave/i.test(ua),
    }
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
        win.localStorage.removeItem(PWA_STORAGE_KEYS.INSTALLED)
    }

    return related
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
