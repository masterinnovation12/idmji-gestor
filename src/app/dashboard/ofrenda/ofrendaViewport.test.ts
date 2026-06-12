/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
    useOfrendaMobileOrTablet,
    useOfrendaClientMounted,
    OFRENDA_MOBILE_TABLET_MQ,
    resetOfrendaMqCacheForTests,
} from './ofrendaViewport'

describe('useOfrendaMobileOrTablet', () => {
    let listeners: Array<() => void> = []
    const matchesRef = { current: false }

    beforeEach(() => {
        resetOfrendaMqCacheForTests()
        listeners = []
        matchesRef.current = false
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: vi.fn().mockImplementation(() => ({
                get matches() {
                    return matchesRef.current
                },
                media: OFRENDA_MOBILE_TABLET_MQ,
                addEventListener: (_: string, cb: () => void) => {
                    listeners.push(cb)
                },
                removeEventListener: (_: string, cb: () => void) => {
                    listeners = listeners.filter(l => l !== cb)
                },
                dispatchEvent: vi.fn(),
            })),
        })
    })

    afterEach(() => {
        resetOfrendaMqCacheForTests()
        vi.restoreAllMocks()
    })

    it('reutiliza una sola instancia matchMedia', async () => {
        const { unmount: u1 } = renderHook(() => useOfrendaMobileOrTablet())
        const { unmount: u2 } = renderHook(() => useOfrendaMobileOrTablet())
        await act(async () => {
            await Promise.resolve()
        })
        expect(window.matchMedia).toHaveBeenCalledTimes(1)
        u1()
        u2()
    })

    it('primer paint devuelve false aunque matchMedia sea true (hidratación)', async () => {
        matchesRef.current = true
        const { result } = renderHook(() => useOfrendaMobileOrTablet())
        expect(result.current).toBe(false)

        await act(async () => {
            await Promise.resolve()
        })
        expect(result.current).toBe(true)
    })

    it('getSnapshot estable: no re-notifica si matches no cambió', async () => {
        const { result } = renderHook(() => useOfrendaMobileOrTablet())
        const renders: boolean[] = [result.current]

        await act(async () => {
            matchesRef.current = true
            await Promise.resolve()
        })
        renders.push(result.current)
        expect(renders).toEqual([false, true])

        const notifySpy = vi.fn()
        const { unmount } = renderHook(() => {
            notifySpy(useOfrendaMobileOrTablet())
        })
        await act(async () => {
            await Promise.resolve()
        })
        const callsBefore = notifySpy.mock.calls.length

        await act(async () => {
            listeners.forEach(l => l())
            await Promise.resolve()
        })
        expect(notifySpy.mock.calls.length).toBe(callsBefore)
        unmount()
    })

    it('actualiza cuando cambia el media query', async () => {
        const { result } = renderHook(() => useOfrendaMobileOrTablet())
        await act(async () => {
            await Promise.resolve()
        })
        expect(result.current).toBe(false)

        await act(async () => {
            matchesRef.current = true
            listeners.forEach(l => l())
            await Promise.resolve()
        })
        expect(result.current).toBe(true)
    })
})

describe('useOfrendaClientMounted', () => {
    beforeEach(() => {
        resetOfrendaMqCacheForTests()
    })

    afterEach(() => {
        resetOfrendaMqCacheForTests()
    })

    it('es false en el primer paint y true tras hidratar', async () => {
        const { result, unmount } = renderHook(() => useOfrendaClientMounted())
        expect(result.current).toBe(false)

        await act(async () => {
            await Promise.resolve()
        })
        expect(result.current).toBe(true)
        unmount()
    })
})
