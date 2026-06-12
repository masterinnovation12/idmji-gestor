'use client'

import { useEffect, type RefObject } from 'react'
import { OFRENDA_MOBILE_TABLET_MQ } from '../ofrendaViewport'

const DRAG_THRESHOLD_PX = 6

type DragState = {
    active: boolean
    dragging: boolean
    startX: number
    startScrollLeft: number
}

const IDLE_DRAG: DragState = {
    active: false,
    dragging: false,
    startX: 0,
    startScrollLeft: 0,
}

interface Options {
    enabled: boolean
    onDragChange?: (dragging: boolean) => void
    onDragEnd?: (wasDragging: boolean) => void
}

/**
 * Scroll horizontal manual en móvil/tablet.
 * Touch en fase capture (antes que los <button>) + pointer como respaldo (DevTools).
 */
export function usePlanoStripTouchScroll(
    scrollRef: RefObject<HTMLDivElement | null>,
    { enabled, onDragChange, onDragEnd }: Options,
) {
    useEffect(() => {
        const el = scrollRef.current
        if (!el || !enabled) return

        const dragRef: { current: DragState } = { current: { ...IDLE_DRAG } }
        const pointerIdRef = { current: -1 }

        const resetDrag = (wasDragging: boolean) => {
            dragRef.current = { ...IDLE_DRAG }
            pointerIdRef.current = -1
            onDragChange?.(false)
            if (wasDragging) onDragEnd?.(true)
        }

        const applyMove = (clientX: number, prevent: () => void) => {
            const state = dragRef.current
            if (!state.active) return
            const dx = clientX - state.startX
            if (!state.dragging) {
                if (Math.abs(dx) < DRAG_THRESHOLD_PX) return
                state.dragging = true
                onDragChange?.(true)
            }
            prevent()
            el.scrollLeft = state.startScrollLeft - dx
        }

        const onTouchStart = (e: TouchEvent) => {
            if (!window.matchMedia(OFRENDA_MOBILE_TABLET_MQ).matches) return
            if (e.touches.length !== 1) return
            const t = e.touches[0]!
            dragRef.current = {
                active: true,
                dragging: false,
                startX: t.clientX,
                startScrollLeft: el.scrollLeft,
            }
        }

        const onTouchMove = (e: TouchEvent) => {
            if (!dragRef.current.active || e.touches.length !== 1) return
            applyMove(e.touches[0]!.clientX, () => e.preventDefault())
        }

        const onTouchFinish = () => {
            const wasDragging = dragRef.current.dragging
            resetDrag(wasDragging)
        }

        const onPointerDown = (e: PointerEvent) => {
            if (!window.matchMedia(OFRENDA_MOBILE_TABLET_MQ).matches) return
            if (e.button !== 0 || e.pointerType === 'touch') return
            dragRef.current = {
                active: true,
                dragging: false,
                startX: e.clientX,
                startScrollLeft: el.scrollLeft,
            }
            pointerIdRef.current = e.pointerId
            el.setPointerCapture(e.pointerId)
        }

        const onPointerMove = (e: PointerEvent) => {
            if (pointerIdRef.current !== e.pointerId) return
            applyMove(e.clientX, () => e.preventDefault())
        }

        const onPointerFinish = (e: PointerEvent) => {
            if (pointerIdRef.current !== e.pointerId) return
            const wasDragging = dragRef.current.dragging
            try {
                el.releasePointerCapture(e.pointerId)
            } catch {
                /* ya liberado */
            }
            resetDrag(wasDragging)
        }

        const touchOpts = { capture: true } as const
        el.addEventListener('touchstart', onTouchStart, { ...touchOpts, passive: true })
        el.addEventListener('touchmove', onTouchMove, { ...touchOpts, passive: false })
        el.addEventListener('touchend', onTouchFinish, touchOpts)
        el.addEventListener('touchcancel', onTouchFinish, touchOpts)
        el.addEventListener('pointerdown', onPointerDown, touchOpts)
        el.addEventListener('pointermove', onPointerMove, touchOpts)
        el.addEventListener('pointerup', onPointerFinish, touchOpts)
        el.addEventListener('pointercancel', onPointerFinish, touchOpts)

        return () => {
            el.removeEventListener('touchstart', onTouchStart, touchOpts)
            el.removeEventListener('touchmove', onTouchMove, touchOpts)
            el.removeEventListener('touchend', onTouchFinish, touchOpts)
            el.removeEventListener('touchcancel', onTouchFinish, touchOpts)
            el.removeEventListener('pointerdown', onPointerDown, touchOpts)
            el.removeEventListener('pointermove', onPointerMove, touchOpts)
            el.removeEventListener('pointerup', onPointerFinish, touchOpts)
            el.removeEventListener('pointercancel', onPointerFinish, touchOpts)
        }
    }, [enabled, onDragChange, onDragEnd, scrollRef])
}
