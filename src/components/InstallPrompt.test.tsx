/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { InstallPrompt } from './InstallPrompt'
import { PromptsProvider } from '@/lib/PromptsContext'
import { I18nProvider } from '@/lib/i18n/I18nProvider'
import { ThemeProvider } from '@/lib/theme/ThemeProvider'
import {
    ANDROID_MANUAL_FALLBACK_DELAY_MS,
    IOS_PROMPT_DELAY_MS,
    INSTALL_PROMPT_DELAY_MS,
    PWA_STORAGE_KEYS,
    PWA_SW_READY_EVENT,
} from '@/lib/pwa-install-prompt'

vi.mock('next/image', () => ({
    default: (props: { alt?: string }) => <img alt={props.alt ?? ''} />,
}))

function renderInstallPrompt() {
    return render(
        <ThemeProvider>
            <I18nProvider>
                <PromptsProvider>
                    <InstallPrompt />
                </PromptsProvider>
            </I18nProvider>
        </ThemeProvider>
    )
}

async function flushInstallSync() {
    await act(async () => {
        signalServiceWorkerReady()
        await Promise.resolve()
        await Promise.resolve()
    })
}

function stubBraveAndroid() {
    Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value:
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 Brave/1.73.89',
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
        configurable: true,
        value: 0,
    })
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
        configurable: true,
        value: vi.fn().mockResolvedValue([]),
    })
}

function stubAndroidChrome() {
    Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value:
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
        configurable: true,
        value: 0,
    })
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
        configurable: true,
        value: vi.fn().mockResolvedValue([]),
    })
}

function stubServiceWorkerReady() {
    Object.defineProperty(window.navigator, 'serviceWorker', {
        configurable: true,
        value: {
            ready: Promise.resolve({} as ServiceWorkerRegistration),
        },
    })
}

function signalServiceWorkerReady() {
    window.dispatchEvent(new CustomEvent(PWA_SW_READY_EVENT))
}

interface FakeBip extends Event {
    prompt: ReturnType<typeof vi.fn>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function createBipEvent(outcome: 'accepted' | 'dismissed' = 'accepted'): FakeBip {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as FakeBip
    event.prompt = vi.fn().mockResolvedValue(undefined)
    event.userChoice = Promise.resolve({ outcome })
    return event
}

describe('InstallPrompt', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true })
        localStorage.clear()
        sessionStorage.clear()
        stubAndroidChrome()
        stubServiceWorkerReady()
        vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }))
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
        localStorage.clear()
        sessionStorage.clear()
    })

    it('muestra el banner tras beforeinstallprompt en Android', async () => {
        renderInstallPrompt()
        await flushInstallSync()

        await act(async () => {
            window.dispatchEvent(new Event('beforeinstallprompt'))
            await vi.advanceTimersByTimeAsync(INSTALL_PROMPT_DELAY_MS)
        })

        expect(screen.getByTestId('pwa-install-prompt')).toBeInTheDocument()
        expect(sessionStorage.getItem(PWA_STORAGE_KEYS.SESSION_SHOWN)).toBe('true')
    })

    it('instalación nativa completa: pulsar Instalar lanza el diálogo y cierra el banner', async () => {
        renderInstallPrompt()
        await flushInstallSync()

        const bip = createBipEvent('accepted')
        await act(async () => {
            window.dispatchEvent(bip)
            await vi.advanceTimersByTimeAsync(INSTALL_PROMPT_DELAY_MS)
        })

        await act(async () => {
            fireEvent.click(screen.getByTestId('pwa-install-confirm'))
            await Promise.resolve()
            await Promise.resolve()
        })

        expect(bip.prompt).toHaveBeenCalledTimes(1)
        expect(localStorage.getItem(PWA_STORAGE_KEYS.INSTALLED)).toBe('true')
        expect(screen.queryByTestId('pwa-install-prompt')).not.toBeInTheDocument()
    })

    it('appinstalled cierra el banner y marca la app como instalada', async () => {
        renderInstallPrompt()
        await flushInstallSync()

        await act(async () => {
            window.dispatchEvent(createBipEvent())
            await vi.advanceTimersByTimeAsync(INSTALL_PROMPT_DELAY_MS)
        })
        expect(screen.getByTestId('pwa-install-prompt')).toBeInTheDocument()

        act(() => {
            window.dispatchEvent(new Event('appinstalled'))
        })

        expect(screen.queryByTestId('pwa-install-prompt')).not.toBeInTheDocument()
        expect(localStorage.getItem(PWA_STORAGE_KEYS.INSTALLED)).toBe('true')
    })

    describe('Android sin beforeinstallprompt (p. ej. WebAPK recién desinstalada)', () => {
        it('Chrome Android muestra guía de recuperación WebAPK', async () => {
            renderInstallPrompt()
            await flushInstallSync()

            await act(async () => {
                await vi.advanceTimersByTimeAsync(ANDROID_MANUAL_FALLBACK_DELAY_MS - 1000)
            })
            expect(screen.queryByTestId('pwa-install-prompt')).not.toBeInTheDocument()

            await act(async () => {
                await vi.advanceTimersByTimeAsync(1000)
            })

            expect(screen.getByTestId('pwa-install-prompt')).toBeInTheDocument()
            expect(screen.getByTestId('pwa-android-chrome-recovery')).toBeInTheDocument()
            expect(screen.getByText(/Recuperar instalación de la app/i)).toBeInTheDocument()
            expect(screen.getByTestId('pwa-recovery-shortcut-warning')).toBeInTheDocument()
            expect(screen.getByTestId('pwa-recovery-step-5')).toBeInTheDocument()
            expect(screen.queryByTestId('pwa-install-confirm')).not.toBeInTheDocument()
        })

        it('se mejora a flujo nativo si beforeinstallprompt llega con la recuperación visible', async () => {
            renderInstallPrompt()
            await flushInstallSync()

            await act(async () => {
                await vi.advanceTimersByTimeAsync(ANDROID_MANUAL_FALLBACK_DELAY_MS)
            })
            expect(screen.getByTestId('pwa-android-chrome-recovery')).toBeInTheDocument()

            await act(async () => {
                window.dispatchEvent(createBipEvent())
                await Promise.resolve()
            })

            expect(screen.queryByTestId('pwa-android-chrome-recovery')).not.toBeInTheDocument()
            expect(screen.getByTestId('pwa-install-confirm')).toBeInTheDocument()
        })

        it('en navegador in-app (WhatsApp) avisa de abrir en Chrome', async () => {
            Object.defineProperty(window.navigator, 'userAgent', {
                configurable: true,
                value:
                    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.1',
            })

            renderInstallPrompt()
            await flushInstallSync()

            await act(async () => {
                await vi.advanceTimersByTimeAsync(ANDROID_MANUAL_FALLBACK_DELAY_MS)
            })

            expect(screen.getByTestId('pwa-android-chrome-recovery')).toBeInTheDocument()
            expect(screen.getByText(/abre esta web en Chrome/i)).toBeInTheDocument()
        })

        it('Brave con beforeinstallprompt muestra manual, no banner Instalar', async () => {
            stubBraveAndroid()

            renderInstallPrompt()
            await flushInstallSync()

            await act(async () => {
                window.dispatchEvent(createBipEvent())
                await vi.advanceTimersByTimeAsync(INSTALL_PROMPT_DELAY_MS)
            })

            expect(screen.getByTestId('pwa-android-manual')).toBeInTheDocument()
            expect(screen.getByText(/solo añade un acceso directo/i)).toBeInTheDocument()
            expect(screen.queryByTestId('pwa-install-confirm')).not.toBeInTheDocument()
        })

        it('Brave Android avisa que solo crea acceso directo (usar Chrome para WebAPK)', async () => {
            stubBraveAndroid()

            renderInstallPrompt()
            await flushInstallSync()

            await act(async () => {
                await vi.advanceTimersByTimeAsync(ANDROID_MANUAL_FALLBACK_DELAY_MS)
            })

            expect(screen.getByTestId('pwa-android-manual')).toBeInTheDocument()
            expect(screen.queryByTestId('pwa-android-chrome-recovery')).not.toBeInTheDocument()
            expect(screen.getByTestId('pwa-no-webapk-warning')).toBeInTheDocument()
            expect(screen.getByText(/solo añade un acceso directo/i)).toBeInTheDocument()
            expect(screen.getByText(/Google Chrome/i)).toBeInTheDocument()
        })

        it('Reintentar limpia sesión y navega al start_url PWA', async () => {
            let href = 'https://idmji-gestor.vercel.app/dashboard'
            Object.defineProperty(window, 'location', {
                configurable: true,
                value: {
                    ...window.location,
                    origin: 'https://idmji-gestor.vercel.app',
                    get href() {
                        return href
                    },
                    set href(value: string) {
                        href = value
                    },
                },
            })

            renderInstallPrompt()
            await flushInstallSync()

            await act(async () => {
                await vi.advanceTimersByTimeAsync(ANDROID_MANUAL_FALLBACK_DELAY_MS)
            })

            sessionStorage.setItem(PWA_STORAGE_KEYS.SESSION_SHOWN, 'true')
            localStorage.setItem(PWA_STORAGE_KEYS.DISMISS_AT, '123')

            fireEvent.click(screen.getByTestId('pwa-manual-retry'))

            expect(sessionStorage.getItem(PWA_STORAGE_KEYS.SESSION_SHOWN)).toBeNull()
            expect(localStorage.getItem(PWA_STORAGE_KEYS.DISMISS_AT)).toBeNull()
            expect(href).toContain('/dashboard?utm_source=pwa_install')
        })

        it('«Entendido» oculta el fallback solo durante la sesión (sin dismissedAt)', async () => {
            renderInstallPrompt()
            await flushInstallSync()

            await act(async () => {
                await vi.advanceTimersByTimeAsync(ANDROID_MANUAL_FALLBACK_DELAY_MS)
            })

            fireEvent.click(screen.getByTestId('pwa-manual-understood'))

            expect(screen.queryByTestId('pwa-install-prompt')).not.toBeInTheDocument()
            expect(sessionStorage.getItem(PWA_STORAGE_KEYS.SESSION_SHOWN)).toBe('true')
            expect(localStorage.getItem(PWA_STORAGE_KEYS.DISMISS_AT)).toBeNull()
        })

        it('no muestra el fallback en standalone (ya abierta como PWA)', async () => {
            vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
                matches: query === '(display-mode: standalone)',
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }))

            renderInstallPrompt()
            await flushInstallSync()

            await act(async () => {
                await vi.advanceTimersByTimeAsync(ANDROID_MANUAL_FALLBACK_DELAY_MS + INSTALL_PROMPT_DELAY_MS)
            })

            expect(screen.queryByTestId('pwa-install-prompt')).not.toBeInTheDocument()
        })
    })

    it('Más tarde oculta sin dismissedAt prolongado', async () => {
        renderInstallPrompt()
        await flushInstallSync()

        await act(async () => {
            window.dispatchEvent(new Event('beforeinstallprompt'))
            await vi.advanceTimersByTimeAsync(INSTALL_PROMPT_DELAY_MS)
        })

        fireEvent.click(screen.getByTestId('pwa-install-later'))

        expect(screen.queryByTestId('pwa-install-prompt')).not.toBeInTheDocument()
        expect(localStorage.getItem(PWA_STORAGE_KEYS.DISMISS_AT)).toBeNull()
        expect(sessionStorage.getItem(PWA_STORAGE_KEYS.SESSION_SHOWN)).toBe('true')
    })

    it('X guarda dismissedAt prolongado', async () => {
        renderInstallPrompt()
        await flushInstallSync()

        await act(async () => {
            window.dispatchEvent(new Event('beforeinstallprompt'))
            await vi.advanceTimersByTimeAsync(INSTALL_PROMPT_DELAY_MS)
        })

        fireEvent.click(screen.getByTestId('pwa-install-close'))

        expect(localStorage.getItem(PWA_STORAGE_KEYS.DISMISS_AT)).not.toBeNull()
    })

    it('limpia estado obsoleto tras desinstalar sin mostrar banner sin BIP', async () => {
        localStorage.setItem(PWA_STORAGE_KEYS.INSTALLED, 'true')
        localStorage.setItem(PWA_STORAGE_KEYS.DISMISS_AT, '123')

        renderInstallPrompt()
        await flushInstallSync()

        await act(async () => {
            await vi.advanceTimersByTimeAsync(10000)
        })

        expect(localStorage.getItem(PWA_STORAGE_KEYS.INSTALLED)).toBeNull()
        expect(localStorage.getItem(PWA_STORAGE_KEYS.DISMISS_AT)).toBeNull()
        expect(screen.queryByTestId('pwa-install-prompt')).not.toBeInTheDocument()
    })

    it('no muestra si getInstalledRelatedApps confirma instalación', async () => {
        Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
            configurable: true,
            value: vi.fn().mockResolvedValue([{ id: 'idmji-sabadell-pwa' }]),
        })

        renderInstallPrompt()
        await flushInstallSync()

        await act(async () => {
            window.dispatchEvent(new Event('beforeinstallprompt'))
            await vi.advanceTimersByTimeAsync(INSTALL_PROMPT_DELAY_MS)
        })

        expect(screen.queryByTestId('pwa-install-prompt')).not.toBeInTheDocument()
    })

    it('iOS: banner tras el delay y pasos de Safari al pulsar Instalar', async () => {
        Object.defineProperty(window.navigator, 'userAgent', {
            configurable: true,
            value:
                'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        })

        renderInstallPrompt()
        await flushInstallSync()

        await act(async () => {
            await vi.advanceTimersByTimeAsync(IOS_PROMPT_DELAY_MS)
        })

        expect(screen.getByTestId('pwa-install-prompt')).toBeInTheDocument()

        fireEvent.click(screen.getByTestId('pwa-install-confirm'))

        expect(screen.getByText(/Añadir a pantalla de inicio/i)).toBeInTheDocument()
        expect(screen.getByTestId('pwa-ios-understood')).toBeInTheDocument()
        // iOS nunca ofrece el fallback de Android
        expect(screen.queryByTestId('pwa-android-manual')).not.toBeInTheDocument()
    })

    it('iPadOS (UA Macintosh + pantalla táctil) usa el flujo iOS', async () => {
        Object.defineProperty(window.navigator, 'userAgent', {
            configurable: true,
            value:
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        })
        Object.defineProperty(window.navigator, 'maxTouchPoints', {
            configurable: true,
            value: 5,
        })

        renderInstallPrompt()
        await flushInstallSync()

        await act(async () => {
            await vi.advanceTimersByTimeAsync(IOS_PROMPT_DELAY_MS)
        })

        expect(screen.getByTestId('pwa-install-prompt')).toBeInTheDocument()

        fireEvent.click(screen.getByTestId('pwa-install-confirm'))
        expect(screen.getByTestId('pwa-ios-understood')).toBeInTheDocument()
    })
})
