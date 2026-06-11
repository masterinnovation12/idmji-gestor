'use client'

import { useCallback, useRef, useState } from 'react'
import { deltaToNatural, type PlanoDragStart } from './planoDrag'
import type { PlanoLienzo, PlanoPunto } from './planoTypes'

interface Options {
    enabled?: boolean
    onDragStart?: () => void
    onDragEnd?: () => void
}

export function usePlanoDrag(
    lienzoRef: React.RefObject<HTMLElement | null>,
    lienzo: PlanoLienzo,
    position: PlanoPunto,
    onChange: (p: PlanoPunto) => void,
    options?: Options,
) {
    const enabled = options?.enabled ?? true
    const [dragging, setDragging] = useState(false)
    const startRef = useRef<PlanoDragStart | null>(null)
    const posRef = useRef(position)
    posRef.current = position

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!enabled) return
            e.stopPropagation()
            const box = lienzoRef.current
            if (!box) return
            const r = box.getBoundingClientRect()
            startRef.current = {
                px: posRef.current.x,
                py: posRef.current.y,
                cx: e.clientX,
                cy: e.clientY,
                rw: r.width,
                rh: r.height,
            }
            setDragging(true)
            options?.onDragStart?.()
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        },
        [enabled, lienzoRef, options],
    )

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            const start = startRef.current
            if (!start || !dragging) return
            onChange(deltaToNatural(start, e.clientX, e.clientY, lienzo))
        },
        [dragging, lienzo, onChange],
    )

    const finish = useCallback(
        (e: React.PointerEvent) => {
            if (!dragging) return
            startRef.current = null
            setDragging(false)
            try {
                ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
            } catch {
                /* pointer ya liberado */
            }
            options?.onDragEnd?.()
        },
        [dragging, options],
    )

    const dragHandlers = enabled
        ? {
              onPointerDown,
              onPointerMove,
              onPointerUp: finish,
              onPointerCancel: finish,
          }
        : {}

    return { dragging, dragHandlers }
}
