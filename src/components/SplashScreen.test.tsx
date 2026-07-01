/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { SplashScreen } from './SplashScreen'

describe('SplashScreen', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        // rAF inmediato para disparar el arranque de ocultado de forma determinista.
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            cb(0)
            return 0
        })
    })

    afterEach(() => {
        act(() => {
            vi.runOnlyPendingTimers()
        })
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('renderiza el badge con el logo al inicio', () => {
        act(() => {
            render(<SplashScreen />)
        })
        const splash = screen.getByTestId('app-splash')
        expect(splash).toBeTruthy()
        expect(splash.className).toContain('app-splash')
        expect(splash.className).not.toContain('app-splash--hidden')
        expect(splash.querySelector('.app-splash__logo')).toBeTruthy()
    })

    it('se marca oculto tras el tiempo mínimo visible', () => {
        act(() => {
            render(<SplashScreen />)
        })
        act(() => {
            vi.advanceTimersByTime(600)
        })
        expect(screen.getByTestId('app-splash').className).toContain('app-splash--hidden')
    })

    it('se desmonta tras el fundido', () => {
        act(() => {
            render(<SplashScreen />)
        })
        act(() => {
            vi.advanceTimersByTime(600 + 500)
        })
        expect(screen.queryByTestId('app-splash')).toBeNull()
    })

    it('la salvaguarda oculta el splash aunque no llegue load', () => {
        // Sin evento load y readyState no completo: solo actúa el safety timeout.
        vi.stubGlobal('requestAnimationFrame', () => 0)
        Object.defineProperty(document, 'readyState', {
            configurable: true,
            get: () => 'loading',
        })
        act(() => {
            render(<SplashScreen />)
        })
        act(() => {
            vi.advanceTimersByTime(4000 + 500)
        })
        expect(screen.queryByTestId('app-splash')).toBeNull()
    })
})
