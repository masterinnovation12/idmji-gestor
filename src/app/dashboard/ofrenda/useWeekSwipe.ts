'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    applyWeekSwipeRubberBand,
    resolveWeekSwipePage,
    weekSwipeEdgeGlow,
    type WeekSwipeEdgeGlow,
} from './weekSwipeUtils'

const INTERACTIVE_SELECTOR =
    'button, a, input, textarea, select, label, [role="dialog"], [data-no-week-swipe]'

export interface UseWeekSwipeOptions {
    currentPage: number
    weeksCount: number
    onPageChange: (page: number) => void
    enabled?: boolean
}

export function useWeekSwipe({
    currentPage,
    weeksCount,
    onPageChange,
    enabled = true,
}: UseWeekSwipeOptions) {
    const containerRef = useRef<HTMLDivElement>(null)
    const startRef = useRef({ x: 0, y: 0, time: 0 })
    const trackingRef = useRef(false)
    const horizontalRef = useRef(false)

    const [dragX, setDragX] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [edgeGlow, setEdgeGlow] = useState<WeekSwipeEdgeGlow>(null)

    const finishGesture = useCallback(
        (dx: number, velocityX: number) => {
            trackingRef.current = false
            horizontalRef.current = false
            setIsDragging(false)

            const next = resolveWeekSwipePage(dx, velocityX, currentPage, weeksCount)
            setDragX(0)
            setEdgeGlow(null)

            if (next !== currentPage) {
                onPageChange(next)
            }
        },
        [currentPage, weeksCount, onPageChange],
    )

    const onTouchStart = useCallback(
        (e: React.TouchEvent) => {
            if (!enabled || weeksCount <= 1) return
            const target = e.target as Element
            if (target.closest(INTERACTIVE_SELECTOR)) return

            const touch = e.touches[0]
            startRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
            trackingRef.current = true
            horizontalRef.current = false
        },
        [enabled, weeksCount],
    )

    const onTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (!trackingRef.current) return

            const touch = e.touches[0]
            const dx = touch.clientX - startRef.current.x
            const dy = touch.clientY - startRef.current.y

            if (!horizontalRef.current) {
                if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
                if (Math.abs(dx) <= Math.abs(dy) * 1.15) {
                    trackingRef.current = false
                    return
                }
                horizontalRef.current = true
                setIsDragging(true)
            }

            const atStart = currentPage === 0
            const atEnd = currentPage >= weeksCount - 1
            const banded = applyWeekSwipeRubberBand(dx, atStart, atEnd)
            setDragX(banded)
            setEdgeGlow(weekSwipeEdgeGlow(dx, currentPage, weeksCount))
        },
        [currentPage, weeksCount],
    )

    const onTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            if (!horizontalRef.current) {
                trackingRef.current = false
                return
            }
            const touch = e.changedTouches[0]
            const dx = touch.clientX - startRef.current.x
            const dt = Math.max(Date.now() - startRef.current.time, 1)
            const velocityX = (dx / dt) * 1000
            finishGesture(dx, velocityX)
        },
        [finishGesture],
    )

    const onTouchCancel = useCallback(() => {
        trackingRef.current = false
        horizontalRef.current = false
        setIsDragging(false)
        setDragX(0)
        setEdgeGlow(null)
    }, [])

    useEffect(() => {
        const el = containerRef.current
        if (!el || !enabled) return

        const blockVerticalScrollWhileSwiping = (e: TouchEvent) => {
            if (horizontalRef.current) e.preventDefault()
        }

        el.addEventListener('touchmove', blockVerticalScrollWhileSwiping, { passive: false })
        return () => el.removeEventListener('touchmove', blockVerticalScrollWhileSwiping)
    }, [enabled])

    return {
        containerRef,
        dragX,
        isDragging,
        edgeGlow,
        handlers: {
            onTouchStart,
            onTouchMove,
            onTouchEnd,
            onTouchCancel,
        },
    }
}
