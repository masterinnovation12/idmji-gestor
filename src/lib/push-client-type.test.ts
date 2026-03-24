import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getPushClientType } from './push-client-type'

function stubWindow(opts: {
    standalone?: boolean
    displayModeStandalone?: boolean
    matchMediaThrows?: boolean
}) {
    const nav = { standalone: opts.standalone } as Navigator & { standalone?: boolean }
    const matchMedia = opts.matchMediaThrows
        ? vi.fn().mockImplementation(() => {
            throw new Error('not supported')
        })
        : vi.fn().mockImplementation((q: string) => ({
            matches: q === '(display-mode: standalone)' && !!(opts.displayModeStandalone ?? false),
        }))
    vi.stubGlobal('window', { navigator: nav, matchMedia } as unknown as Window & typeof globalThis)
}

describe('getPushClientType', () => {
    beforeEach(() => {
        vi.unstubAllGlobals()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('devuelve pwa cuando navigator.standalone es true (iOS)', () => {
        stubWindow({ standalone: true })
        expect(getPushClientType()).toBe('pwa')
    })

    it('devuelve pwa cuando display-mode standalone coincide', () => {
        stubWindow({ displayModeStandalone: true })
        expect(getPushClientType()).toBe('pwa')
    })

    it('devuelve browser cuando no es standalone', () => {
        stubWindow({})
        expect(getPushClientType()).toBe('browser')
    })

    it('devuelve browser si matchMedia lanza', () => {
        stubWindow({ matchMediaThrows: true })
        expect(getPushClientType()).toBe('browser')
    })
})
