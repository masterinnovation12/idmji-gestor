/**
 * PlanoFigure.tsx — Muñequito SVG del plano, draggable en modo edición.
 */
'use client'

import { memo } from 'react'
import { usePlanoDrag } from './usePlanoDrag'
import type { PlanoLienzo, PlanoPunto } from './planoTypes'

interface Props {
    pos: PlanoPunto
    lienzo: PlanoLienzo
    color: string
    scale: number
    lienzoRef: React.RefObject<HTMLElement | null>
    canEdit?: boolean
    onDragStart?: () => void
    onDragEnd?: () => void
    onMove?: (p: PlanoPunto) => void
}

export const PlanoFigure = memo(function PlanoFigure({
    pos,
    lienzo,
    color,
    scale,
    lienzoRef,
    canEdit = false,
    onDragStart,
    onDragEnd,
    onMove,
}: Props) {
    const { dragging, dragHandlers } = usePlanoDrag(
        lienzoRef,
        lienzo,
        pos,
        p => onMove?.(p),
        { enabled: canEdit, onDragStart, onDragEnd },
    )

    return (
        <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 touch-none ${
                canEdit ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
            }`}
            style={{
                left: `${(pos.x / lienzo.w) * 100}%`,
                top: `${(pos.y / lienzo.h) * 100}%`,
                zIndex: dragging ? 50 : 7,
            }}
            {...dragHandlers}
        >
            <svg
                width={Math.round(46 * scale)}
                height={Math.round(62 * scale)}
                viewBox="0 0 46 62"
                aria-hidden="true"
                style={{
                    filter: dragging
                        ? 'drop-shadow(0 9px 16px rgba(0,0,0,.45))'
                        : 'drop-shadow(0 4px 7px rgba(0,0,0,.35))',
                }}
            >
                <circle cx="23" cy="13" r="10" fill={color} stroke="#fff" strokeWidth="3" />
                <path
                    d="M9 58 v-16 a14 14 0 0 1 28 0 v16 a3 3 0 0 1 -3 3 h-22 a3 3 0 0 1 -3 -3 z"
                    transform="translate(0,-4)"
                    fill={color}
                    stroke="#fff"
                    strokeWidth="3"
                />
            </svg>
        </div>
    )
})
