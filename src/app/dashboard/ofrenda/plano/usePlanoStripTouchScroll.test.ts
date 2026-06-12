/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { OFRENDA_MOBILE_TABLET_MQ } from '../ofrendaViewport'
import { usePlanoStripTouchScroll } from './usePlanoStripTouchScroll'

describe('usePlanoStripTouchScroll', () => {
    let matchMobile = true

    beforeEach(() => {
        matchMobile = true
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: query === OFRENDA_MOBILE_TABLET_MQ ? matchMobile : false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('desplaza con touchstart/touchmove en móvil', () => {
        const scrollRef = createRef<HTMLDivElement>()
        const el = document.createElement('div')
        Object.defineProperty(el, 'scrollLeft', { value: 0, writable: true, configurable: true })
        scrollRef.current = el

        const onDragEnd = vi.fn()
        renderHook(() =>
            usePlanoStripTouchScroll(scrollRef, {
                enabled: true,
                onDragEnd,
            }),
        )

        el.dispatchEvent(
            new TouchEvent('touchstart', {
                bubbles: true,
                touches: [{ clientX: 120, clientY: 10 } as Touch],
            }),
        )
        el.dispatchEvent(
            new TouchEvent('touchmove', {
                bubbles: true,
                cancelable: true,
                touches: [{ clientX: 70, clientY: 10 } as Touch],
            }),
        )
        expect(el.scrollLeft).toBeGreaterThan(0)

        el.dispatchEvent(new TouchEvent('touchend', { bubbles: true }))
        expect(onDragEnd).toHaveBeenCalledWith(true)
    })

    it('no hace nada si enabled es false', () => {
        const scrollRef = createRef<HTMLDivElement>()
        const el = document.createElement('div')
        Object.defineProperty(el, 'scrollLeft', { value: 0, writable: true, configurable: true })
        scrollRef.current = el

        renderHook(() => usePlanoStripTouchScroll(scrollRef, { enabled: false }))

        el.dispatchEvent(
            new TouchEvent('touchstart', {
                bubbles: true,
                touches: [{ clientX: 120, clientY: 10 } as Touch],
            }),
        )
        el.dispatchEvent(
            new TouchEvent('touchmove', {
                bubbles: true,
                cancelable: true,
                touches: [{ clientX: 70, clientY: 10 } as Touch],
            }),
        )
        expect(el.scrollLeft).toBe(0)
    })
})
