/**
 * PlanoBlockLabel.tsx — Número de bloque (disco de color), draggable en modo edición.
 */
'use client'

import { memo } from 'react'
import { usePlanoDrag } from './usePlanoDrag'
import type { PlanoBloque, PlanoEtiquetaBloqueLayout, PlanoLienzo, PlanoPunto } from './planoTypes'

interface Props {
    bloque: PlanoBloque
    lienzo: PlanoLienzo
    etiqueta: PlanoEtiquetaBloqueLayout
    lienzoRef: React.RefObject<HTMLElement | null>
    canEdit?: boolean
    canDrag?: boolean
    onDragStart?: () => void
    onDragEnd?: (moved: boolean) => void
    onMove?: (pos: PlanoPunto) => void
    onEditText?: (bloque: PlanoBloque) => void
}

export const PlanoBlockLabel = memo(function PlanoBlockLabel({
    bloque,
    lienzo,
    etiqueta,
    lienzoRef,
    canEdit = false,
    canDrag = false,
    onDragStart,
    onDragEnd,
    onMove,
    onEditText,
}: Props) {
    const size = bloque.labelSize ?? etiqueta.size
    const font = bloque.labelFont ?? etiqueta.font
    const pos = bloque.labelPos

    const { dragging, dragHandlers } = usePlanoDrag(
        lienzoRef,
        lienzo,
        pos,
        p => onMove?.(p),
        { enabled: canDrag, immediate: canDrag, onDragStart, onDragEnd },
    )

    return (
        <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full text-white font-black select-none touch-none ${
                canDrag
                    ? 'cursor-grab active:cursor-grabbing'
                    : canEdit
                      ? 'pointer-events-auto'
                      : 'pointer-events-none'
            } ${dragging ? 'z-50 scale-105' : ''}`}
            style={{
                left: `${(pos.x / lienzo.w) * 100}%`,
                top: `${(pos.y / lienzo.h) * 100}%`,
                width: size,
                height: size,
                fontSize: font,
                background: bloque.color,
                border: '3px solid rgba(255,255,255,.92)',
                boxShadow: dragging ? '0 14px 30px rgba(0,0,0,.4)' : '0 8px 20px rgba(0,0,0,.32)',
                textShadow: '0 2px 4px rgba(0,0,0,.35)',
                zIndex: dragging ? 50 : 9,
            }}
            onDoubleClick={() => canEdit && onEditText?.(bloque)}
            {...(canDrag ? dragHandlers : {})}
        >
            {bloque.labelText}
        </div>
    )
})
