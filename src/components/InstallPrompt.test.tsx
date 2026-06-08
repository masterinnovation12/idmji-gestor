/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { InstallPrompt } from './InstallPrompt'
import { PromptsProvider } from '@/lib/PromptsContext'
import { I18nProvider } from '@/lib/i18n/I18nProvider'
import { ThemeProvider } from '@/lib/theme/ThemeProvider'
import {
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

function stubAndroidChrome() {
    Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value:
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
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

    it('no muestra fallback manual en Android sin beforeinstallprompt', async () => {
        renderInstallPrompt()
        await flushInstallSync()

        await act(async () => {
            await vi.advanceTimersByTimeAsync(15000)
        })

        expect(screen.queryByTestId('pwa-install-prompt')).not.toBeInTheDocument()
        expect(screen.queryByText(/Instalar desde el navegador/i)).not.toBeInTheDocument()
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

    it('iOS muestra instrucciones tras el delay', async () => {
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
    })
})
