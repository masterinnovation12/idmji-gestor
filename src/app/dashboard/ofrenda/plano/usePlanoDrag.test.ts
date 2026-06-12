/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createRef } from 'react'
import { usePlanoDrag, PLANO_DRAG_THRESHOLD_PX } from './usePlanoDrag'

function mockPointerEvent(
    type: string,
    clientX: number,
    clientY: number,
    target: HTMLElement,
): React.PointerEvent {
    return {
        type,
        clientX,
        clientY,
        currentTarget: target,
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
        pointerId: 1,
    } as unknown as React.PointerEvent
}

describe('usePlanoDrag', () => {
    it('no inicia drag si el movimiento es menor al umbral', () => {
        const lienzoRef = createRef<HTMLDivElement>()
        const el = document.createElement('div')
        el.setPointerCapture = vi.fn()
        el.releasePointerCapture = vi.fn()
        Object.defineProperty(el, 'getBoundingClientRect', {
            value: () => ({ width: 1000, height: 800, left: 0, top: 0 }),
        })
        lienzoRef.current = el

        const onChange = vi.fn()
        const onDragStart = vi.fn()
        const onDragEnd = vi.fn()
        const { result } = renderHook(() =>
            usePlanoDrag(lienzoRef, { w: 1448, h: 1316 }, { x: 100, y: 200 }, onChange, {
                enabled: true,
                onDragStart,
                onDragEnd,
            }),
        )

        act(() => {
            result.current.dragHandlers.onPointerDown?.(mockPointerEvent('pointerdown', 50, 50, el))
        })
        act(() => {
            const under = PLANO_DRAG_THRESHOLD_PX - 2
            result.current.dragHandlers.onPointerMove?.(
                mockPointerEvent('pointermove', 50 + under, 50, el),
            )
            result.current.dragHandlers.onPointerUp?.(
                mockPointerEvent('pointerup', 50 + under, 50, el),
            )
        })

        expect(onDragStart).toHaveBeenCalled()
        expect(onChange).not.toHaveBeenCalled()
        expect(onDragEnd).toHaveBeenCalledWith(false)
        expect(result.current.dragging).toBe(false)
    })

    it('inicia drag cuando supera el umbral', () => {
        const lienzoRef = createRef<HTMLDivElement>()
        const el = document.createElement('div')
        el.setPointerCapture = vi.fn()
        el.releasePointerCapture = vi.fn()
        Object.defineProperty(el, 'getBoundingClientRect', {
            value: () => ({ width: 1000, height: 800, left: 0, top: 0 }),
        })
        lienzoRef.current = el

        const onChange = vi.fn()
        const onDragStart = vi.fn()
        const { result } = renderHook(() =>
            usePlanoDrag(lienzoRef, { w: 1448, h: 1316 }, { x: 100, y: 200 }, onChange, {
                enabled: true,
                onDragStart,
            }),
        )

        act(() => {
            result.current.dragHandlers.onPointerDown?.(mockPointerEvent('pointerdown', 50, 50, el))
        })
        act(() => {
            result.current.dragHandlers.onPointerMove?.(
                mockPointerEvent('pointermove', 50 + PLANO_DRAG_THRESHOLD_PX + 5, 50, el),
            )
        })

        expect(onDragStart).toHaveBeenCalled()
        expect(onChange).toHaveBeenCalled()
        expect(result.current.dragging).toBe(true)
    })

    it('modo immediate mueve desde el primer px', () => {
        const lienzoRef = createRef<HTMLDivElement>()
        const el = document.createElement('div')
        el.setPointerCapture = vi.fn()
        el.releasePointerCapture = vi.fn()
        Object.defineProperty(el, 'getBoundingClientRect', {
            value: () => ({ width: 1000, height: 800, left: 0, top: 0 }),
        })
        lienzoRef.current = el

        const onChange = vi.fn()
        const onDragEnd = vi.fn()
        const { result } = renderHook(() =>
            usePlanoDrag(lienzoRef, { w: 1448, h: 1316 }, { x: 100, y: 200 }, onChange, {
                enabled: true,
                immediate: true,
                onDragEnd,
            }),
        )

        act(() => {
            result.current.dragHandlers.onPointerDown?.(mockPointerEvent('pointerdown', 50, 50, el))
        })
        act(() => {
            result.current.dragHandlers.onPointerMove?.(
                mockPointerEvent('pointermove', 52, 51, el),
            )
        })

        expect(onChange).toHaveBeenCalled()
        expect(result.current.dragging).toBe(true)
    })

    it('enabled false no expone handlers', () => {
        const lienzoRef = createRef<HTMLDivElement>()
        const { result } = renderHook(() =>
            usePlanoDrag(lienzoRef, { w: 100, h: 100 }, { x: 0, y: 0 }, vi.fn(), { enabled: false }),
        )
        expect(result.current.dragHandlers).toEqual({})
    })
})
