'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { deltaToNatural, type PlanoDragStart } from './planoDrag'
import type { PlanoLienzo, PlanoPunto } from './planoTypes'

/** Mínimo desplazamiento en px antes de iniciar drag (evita taps accidentales). */
export const PLANO_DRAG_THRESHOLD_PX = 10

interface Options {
    enabled?: boolean
    /** Sin umbral: el elemento sigue el dedo desde el primer px (modo ajustar posiciones). */
    immediate?: boolean
    onDragStart?: () => void
    /** `moved` indica si hubo desplazamiento real (para no guardar en tap sin mover). */
    onDragEnd?: (moved: boolean) => void
}

export function usePlanoDrag(
    lienzoRef: React.RefObject<HTMLElement | null>,
    lienzo: PlanoLienzo,
    position: PlanoPunto,
    onChange: (p: PlanoPunto) => void,
    options?: Options,
) {
    const enabled = options?.enabled ?? true
    const immediate = options?.immediate ?? false
    const [dragging, setDragging] = useState(false)
    const startRef = useRef<PlanoDragStart | null>(null)
    const activeRef = useRef(false)
    const panLockedRef = useRef(false)
    // Mantener el último `position` accesible desde los handlers de puntero
    // (se leen tras el render, p. ej. en onPointerDown), sin escribir el ref
    // durante el render (anti-patrón react-hooks/refs).
    const posRef = useRef(position)
    useEffect(() => {
        posRef.current = position
    }, [position])

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (!enabled) return
            e.stopPropagation()
            e.preventDefault()
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
            activeRef.current = false
            panLockedRef.current = true
            options?.onDragStart?.()
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        },
        [enabled, lienzoRef, options],
    )

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            const start = startRef.current
            if (!start) return
            e.stopPropagation()

            const dx = e.clientX - start.cx
            const dy = e.clientY - start.cy
            const dist = Math.hypot(dx, dy)
            const threshold = immediate ? 0 : PLANO_DRAG_THRESHOLD_PX

            if (!activeRef.current) {
                if (dist < threshold) return
                activeRef.current = true
                setDragging(true)
            }

            onChange(deltaToNatural(start, e.clientX, e.clientY, lienzo))
        },
        [immediate, lienzo, onChange],
    )

    const finish = useCallback(
        (e: React.PointerEvent) => {
            const wasDragging = activeRef.current
            const hadPanLock = panLockedRef.current
            startRef.current = null
            activeRef.current = false
            panLockedRef.current = false
            setDragging(false)
            try {
                ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
            } catch {
                /* pointer ya liberado */
            }
            if (hadPanLock) options?.onDragEnd?.(wasDragging)
        },
        [options],
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
