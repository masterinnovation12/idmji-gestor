import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    PWA_STORAGE_KEYS,
    REPROMPT_DAYS,
    detectPlatform,
    isPwaStandalone,
    shouldShowInstallPrompt,
    checkRelatedAppInstalled,
    syncPwaInstalledStorage,
    dismissInstallPromptForSession,
    dismissInstallPromptLongTerm,
    readInstallPromptStorage,
    markPromptShownThisSession,
    resetInstallPromptAfterUninstall,
    resetInstallPromptForRetry,
    resolveAndroidFallbackView,
    shouldShowManualFallback,
    shouldUseNativeInstallFlow,
    supportsAndroidWebApk,
    buildPwaInstallStartUrl,
    isChromeAndroid,
    PWA_INSTALL_START_URL,
} from './pwa-install-prompt'

function createStorage(): Storage {
    const map = new Map<string, string>()
    return {
        get length() {
            return map.size
        },
        clear: () => map.clear(),
        getItem: (key: string) => map.get(key) ?? null,
        key: (index: number) => [...map.keys()][index] ?? null,
        removeItem: (key: string) => {
            map.delete(key)
        },
        setItem: (key: string, value: string) => {
            map.set(key, value)
        },
    }
}

function createWindow(opts: {
    standalone?: boolean
    displayModeStandalone?: boolean
    relatedApps?: Array<{ id?: string }> | 'throws' | 'unsupported'
} = {}): Window {
    const localStorage = createStorage()
    const sessionStorage = createStorage()
    const nav = { standalone: opts.standalone ?? false } as Navigator & {
        standalone?: boolean
        getInstalledRelatedApps?: () => Promise<Array<{ id?: string }>>
    }

    if (opts.relatedApps === 'unsupported') {
        /* sin API */
    } else if (opts.relatedApps === 'throws') {
        nav.getInstalledRelatedApps = vi.fn().mockRejectedValue(new Error('fail'))
    } else {
        nav.getInstalledRelatedApps = vi.fn().mockResolvedValue(opts.relatedApps ?? [])
    }

    const matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)' && (opts.displayModeStandalone ?? false),
    }))

    return {
        localStorage,
        sessionStorage,
        navigator: nav,
        matchMedia,
    } as unknown as Window
}

describe('detectPlatform', () => {
    it('detecta iOS Safari', () => {
        const p = detectPlatform(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        )
        expect(p.name).toBe('ios')
        expect(p.isSafari).toBe(true)
    })

    it('detecta Android Chrome', () => {
        const p = detectPlatform(
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        )
        expect(p.name).toBe('android')
        expect(p.isInApp).toBe(false)
        expect(p.supportsWebApk).toBe(true)
    })

    it('detecta Brave Android sin soporte WebAPK', () => {
        const p = detectPlatform(
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Brave/1.73.89'
        )
        expect(p.name).toBe('android')
        expect(p.supportsWebApk).toBe(false)
    })

    it('detecta WhatsApp in-app', () => {
        const p = detectPlatform('Mozilla/5.0 (iPhone) WhatsApp/2.23.0')
        expect(p.isInApp).toBe(true)
    })

    it('detecta Brave como no-Safari en iOS', () => {
        const p = detectPlatform(
            'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 Brave/1.0'
        )
        expect(p.name).toBe('ios')
        expect(p.isSafari).toBe(false)
    })

    const IPAD_OS_UA =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

    it('detecta iPadOS 13+ (UA Macintosh) por soporte táctil', () => {
        const p = detectPlatform(IPAD_OS_UA, 5)
        expect(p.name).toBe('ios')
        expect(p.isSafari).toBe(true)
    })

    it('Mac de escritorio (sin táctil) NO es iOS', () => {
        const p = detectPlatform(IPAD_OS_UA, 0)
        expect(p.name).toBe('other')
    })
})

describe('supportsAndroidWebApk', () => {
    const CHROME_ANDROID =
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    const BRAVE_ANDROID =
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Brave/1.73.89'

    it('Chrome Android sí soporta WebAPK', () => {
        expect(supportsAndroidWebApk(CHROME_ANDROID)).toBe(true)
    })

    it('Brave Android no soporta WebAPK (solo acceso directo)', () => {
        expect(supportsAndroidWebApk(BRAVE_ANDROID)).toBe(false)
    })

    it('Firefox Android no soporta WebAPK', () => {
        expect(
            supportsAndroidWebApk(
                'Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0'
            )
        ).toBe(false)
    })

    it('Samsung Internet no soporta WebAPK', () => {
        expect(
            supportsAndroidWebApk(
                'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36'
            )
        ).toBe(false)
    })

    it('fuera de Android no aplica la restricción', () => {
        expect(
            supportsAndroidWebApk(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
        ).toBe(true)
    })
})

describe('resolveAndroidFallbackView', () => {
    const CHROME_ANDROID =
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    const BRAVE_ANDROID =
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Brave/1.73.89'

    const base = {
        platform: 'android' as const,
        hasDeferredPrompt: false,
        isStandalone: false,
        relatedAppInstalled: null as boolean | null,
    }

    it('Chrome Android sin BIP → guía de recuperación WebAPK', () => {
        expect(
            resolveAndroidFallbackView({ ...base, userAgent: CHROME_ANDROID })
        ).toBe('android-chrome-recovery')
    })

    it('Brave Android → manual genérico', () => {
        expect(
            resolveAndroidFallbackView({ ...base, userAgent: BRAVE_ANDROID })
        ).toBe('android-manual')
    })

    it('con BIP disponible → null', () => {
        expect(
            resolveAndroidFallbackView({ ...base, hasDeferredPrompt: true, userAgent: CHROME_ANDROID })
        ).toBeNull()
    })
})

describe('isChromeAndroid', () => {
    it('true solo en Chrome Android', () => {
        expect(
            isChromeAndroid(
                'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            )
        ).toBe(true)
        expect(
            isChromeAndroid(
                'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Brave/1.73.89'
            )
        ).toBe(false)
    })
})

describe('resetInstallPromptForRetry', () => {
    it('limpia sesión y dismissedAt para permitir reintentar', () => {
        const win = createWindow()
        win.sessionStorage.setItem(PWA_STORAGE_KEYS.SESSION_SHOWN, 'true')
        win.localStorage.setItem(PWA_STORAGE_KEYS.DISMISS_AT, '999')
        resetInstallPromptForRetry(win)
        expect(win.sessionStorage.getItem(PWA_STORAGE_KEYS.SESSION_SHOWN)).toBeNull()
        expect(win.localStorage.getItem(PWA_STORAGE_KEYS.DISMISS_AT)).toBeNull()
    })
})

describe('buildPwaInstallStartUrl', () => {
    it('usa start_url con utm para engagement Chrome', () => {
        expect(buildPwaInstallStartUrl('https://idmji-gestor.vercel.app')).toBe(
            `https://idmji-gestor.vercel.app${PWA_INSTALL_START_URL}`
        )
    })
})

describe('shouldShowManualFallback', () => {
    const base = {
        platform: 'android' as const,
        hasDeferredPrompt: false,
        isStandalone: false,
        relatedAppInstalled: null,
    }

    it('Android sin BIP → fallback manual (caso desinstalación reciente)', () => {
        expect(shouldShowManualFallback(base)).toBe(true)
    })

    it('con beforeinstallprompt disponible NO hay fallback (flujo nativo)', () => {
        expect(shouldShowManualFallback({ ...base, hasDeferredPrompt: true })).toBe(false)
    })

    it('en standalone NO hay fallback', () => {
        expect(shouldShowManualFallback({ ...base, isStandalone: true })).toBe(false)
    })

    it('con app instalada confirmada NO hay fallback', () => {
        expect(shouldShowManualFallback({ ...base, relatedAppInstalled: true })).toBe(false)
    })

    it('iOS y desktop NO usan el fallback de Android', () => {
        expect(shouldShowManualFallback({ ...base, platform: 'ios' })).toBe(false)
        expect(shouldShowManualFallback({ ...base, platform: 'other' })).toBe(false)
    })

    it('tras desinstalar (related=false) sí ofrece el fallback', () => {
        expect(shouldShowManualFallback({ ...base, relatedAppInstalled: false })).toBe(true)
    })
})

describe('isPwaStandalone', () => {
    it('true con navigator.standalone (iOS)', () => {
        expect(isPwaStandalone(createWindow({ standalone: true }))).toBe(true)
    })

    it('true con display-mode standalone', () => {
        expect(isPwaStandalone(createWindow({ displayModeStandalone: true }))).toBe(true)
    })

    it('false en navegador normal', () => {
        expect(isPwaStandalone(createWindow())).toBe(false)
    })
})

describe('shouldShowInstallPrompt', () => {
    const base = {
        isStandalone: false,
        relatedAppInstalled: null as boolean | null,
        sessionShown: false,
        dismissedAt: null as string | null,
    }

    it('no muestra en standalone', () => {
        expect(shouldShowInstallPrompt({ ...base, isStandalone: true })).toBe(false)
    })

    it('no muestra si getInstalledRelatedApps confirma instalada', () => {
        expect(shouldShowInstallPrompt({ ...base, relatedAppInstalled: true })).toBe(false)
    })

    it('muestra si desinstaló (related false) aunque localStorage tuviera marca obsoleta', () => {
        expect(shouldShowInstallPrompt({ ...base, relatedAppInstalled: false })).toBe(true)
    })

    it('no muestra si ya se mostró/cerró en esta sesión', () => {
        expect(shouldShowInstallPrompt({ ...base, sessionShown: true })).toBe(false)
    })

    it('no muestra si cerró con X hace menos de REPROMPT_DAYS', () => {
        const now = Date.now()
        const dismissedAt = String(now - 2 * 24 * 60 * 60 * 1000)
        expect(
            shouldShowInstallPrompt({ ...base, dismissedAt, now })
        ).toBe(false)
    })

    it('muestra tras recargar si solo usó Más tarde (sin dismissedAt)', () => {
        expect(shouldShowInstallPrompt({ ...base, sessionShown: false })).toBe(true)
    })

    it('muestra tras expirar el cierre prolongado', () => {
        const now = Date.now()
        const dismissedAt = String(now - (REPROMPT_DAYS + 1) * 24 * 60 * 60 * 1000)
        expect(
            shouldShowInstallPrompt({ ...base, dismissedAt, now })
        ).toBe(true)
    })
})

describe('syncPwaInstalledStorage', () => {
    let win: Window

    beforeEach(() => {
        win = createWindow()
    })

    it('marca instalada en standalone', async () => {
        win = createWindow({ displayModeStandalone: true })
        await expect(syncPwaInstalledStorage(win)).resolves.toBe(true)
        expect(win.localStorage.getItem(PWA_STORAGE_KEYS.INSTALLED)).toBe('true')
    })

    it('limpia pwa_installed obsoleto cuando related apps está vacío', async () => {
        win.localStorage.setItem(PWA_STORAGE_KEYS.INSTALLED, 'true')
        win.localStorage.setItem(PWA_STORAGE_KEYS.DISMISS_AT, '123')
        win.sessionStorage.setItem(PWA_STORAGE_KEYS.SESSION_SHOWN, 'true')
        await expect(syncPwaInstalledStorage(win)).resolves.toBe(false)
        expect(win.localStorage.getItem(PWA_STORAGE_KEYS.INSTALLED)).toBeNull()
        expect(win.localStorage.getItem(PWA_STORAGE_KEYS.DISMISS_AT)).toBeNull()
        expect(win.sessionStorage.getItem(PWA_STORAGE_KEYS.SESSION_SHOWN)).toBeNull()
    })

    it('conserva marca cuando related apps confirma instalación', async () => {
        win = createWindow({ relatedApps: [{ id: 'idmji-sabadell-pwa' }] })
        await expect(syncPwaInstalledStorage(win)).resolves.toBe(true)
        expect(win.localStorage.getItem(PWA_STORAGE_KEYS.INSTALLED)).toBe('true')
    })

    it('no borra marca si la API no está disponible', async () => {
        win = createWindow({ relatedApps: 'unsupported' })
        win.localStorage.setItem(PWA_STORAGE_KEYS.INSTALLED, 'true')
        await expect(syncPwaInstalledStorage(win)).resolves.toBeNull()
        expect(win.localStorage.getItem(PWA_STORAGE_KEYS.INSTALLED)).toBe('true')
    })
})

describe('checkRelatedAppInstalled', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('devuelve false si no hay apps instaladas', async () => {
        vi.stubGlobal('navigator', {
            getInstalledRelatedApps: vi.fn().mockResolvedValue([]),
        })
        await expect(checkRelatedAppInstalled()).resolves.toBe(false)
    })

    it('devuelve true si coincide el manifest id', async () => {
        vi.stubGlobal('navigator', {
            getInstalledRelatedApps: vi.fn().mockResolvedValue([{ id: 'idmji-sabadell-pwa' }]),
        })
        await expect(checkRelatedAppInstalled()).resolves.toBe(true)
    })

    it('devuelve null si la API no existe', async () => {
        vi.stubGlobal('navigator', {})
        await expect(checkRelatedAppInstalled()).resolves.toBeNull()
    })
})

describe('resetInstallPromptAfterUninstall', () => {
    it('borra todas las marcas de instalación y cierre', () => {
        const win = createWindow()
        win.localStorage.setItem(PWA_STORAGE_KEYS.INSTALLED, 'true')
        win.localStorage.setItem(PWA_STORAGE_KEYS.DISMISS_AT, '999')
        win.sessionStorage.setItem(PWA_STORAGE_KEYS.SESSION_SHOWN, 'true')
        resetInstallPromptAfterUninstall(win)
        expect(win.localStorage.getItem(PWA_STORAGE_KEYS.INSTALLED)).toBeNull()
        expect(win.localStorage.getItem(PWA_STORAGE_KEYS.DISMISS_AT)).toBeNull()
        expect(win.sessionStorage.getItem(PWA_STORAGE_KEYS.SESSION_SHOWN)).toBeNull()
    })
})

describe('shouldUseNativeInstallFlow', () => {
    it('android y desktop usan BIP nativo', () => {
        expect(shouldUseNativeInstallFlow('android')).toBe(true)
        expect(shouldUseNativeInstallFlow('other')).toBe(true)
        expect(shouldUseNativeInstallFlow('ios')).toBe(false)
    })
})

describe('persistencia sesión vs prolongada', () => {
    let win: Window

    beforeEach(() => {
        win = createWindow()
    })

    it('Más tarde solo marca sesión, no dismissedAt', () => {
        dismissInstallPromptForSession(win)
        expect(readInstallPromptStorage(win).sessionShown).toBe(true)
        expect(readInstallPromptStorage(win).dismissedAt).toBeNull()
    })

    it('X marca sesión y dismissedAt', () => {
        const now = 1_700_000_000_000
        dismissInstallPromptLongTerm(win, now)
        expect(readInstallPromptStorage(win).sessionShown).toBe(true)
        expect(readInstallPromptStorage(win).dismissedAt).toBe(String(now))
    })

    it('simula recarga: nueva sessionStorage permite mostrar de nuevo tras Más tarde', () => {
        markPromptShownThisSession(win)
        expect(shouldShowInstallPrompt({
            isStandalone: false,
            relatedAppInstalled: false,
            sessionShown: readInstallPromptStorage(win).sessionShown,
            dismissedAt: readInstallPromptStorage(win).dismissedAt,
        })).toBe(false)

        win.sessionStorage.clear()
        expect(shouldShowInstallPrompt({
            isStandalone: false,
            relatedAppInstalled: false,
            sessionShown: readInstallPromptStorage(win).sessionShown,
            dismissedAt: readInstallPromptStorage(win).dismissedAt,
        })).toBe(true)
    })
})
