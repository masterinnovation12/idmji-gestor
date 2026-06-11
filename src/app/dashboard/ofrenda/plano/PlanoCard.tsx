/**
 * PlanoCard.tsx — Tarjeta de nombre (franja draggable + nombre editable).
 */
'use client'

import { memo } from 'react'
import { usePlanoDrag } from './usePlanoDrag'
import type { PlanoLienzo, PlanoPunto, PlanoTarjetasLayout } from './planoTypes'

interface Props {
    pos: PlanoPunto
    lienzo: PlanoLienzo
    color: string
    bloque: number
    rolLabel: string
    nombre: string
    nombrePlaceholder: string
    tarjetas: PlanoTarjetasLayout
    lienzoRef: React.RefObject<HTMLElement | null>
    canEdit?: boolean
    onDragStart?: () => void
    onDragEnd?: () => void
    onMove?: (p: PlanoPunto) => void
    onEditNombre?: () => void
}

function nameBodyMinHeight(lineCount: number, nameFont: number): number {
    const lines = Math.max(1, Math.min(lineCount, 2))
    return Math.max(26, lines * (nameFont + 3) + 10)
}

export const PlanoCard = memo(function PlanoCard({
    pos,
    lienzo,
    color,
    bloque,
    rolLabel,
    nombre,
    nombrePlaceholder,
    tarjetas,
    lienzoRef,
    canEdit = false,
    onDragStart,
    onDragEnd,
    onMove,
    onEditNombre,
}: Props) {
    const width = Math.round((tarjetas.minW + tarjetas.maxW) / 2)
    const displayNombre = nombre?.trim() || nombrePlaceholder
    const lineCount = nombre?.includes('\n') ? nombre.split('\n').length : 1

    const { dragging, dragHandlers } = usePlanoDrag(
        lienzoRef,
        lienzo,
        pos,
        p => onMove?.(p),
        { enabled: canEdit, onDragStart, onDragEnd },
    )

    return (
        <div
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col overflow-hidden rounded-[10px] ${
                dragging ? 'z-50' : ''
            }`}
            style={{
                left: `${(pos.x / lienzo.w) * 100}%`,
                top: `${(pos.y / lienzo.h) * 100}%`,
                width,
                minWidth: tarjetas.minW,
                maxWidth: tarjetas.maxW,
                border: `2px solid ${color}`,
                background: 'rgba(255,255,255,.97)',
                boxShadow: dragging ? '0 12px 28px rgba(0,0,0,.32)' : '0 5px 14px rgba(0,0,0,.24)',
                zIndex: dragging ? 50 : 8,
                pointerEvents: canEdit ? 'auto' : 'none',
            }}
        >
            <div
                className={`text-center font-black text-white whitespace-nowrap select-none touch-none ${
                    canEdit ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
                style={{
                    background: color,
                    fontSize: tarjetas.roleFont,
                    lineHeight: `${tarjetas.roleFont + 5}px`,
                    padding: `3px ${tarjetas.pad}px`,
                }}
                {...(canEdit ? dragHandlers : {})}
            >
                {bloque}- {rolLabel}
            </div>
            {canEdit ? (
                <button
                    type="button"
                    onClick={onEditNombre}
                    className="text-center font-extrabold break-words whitespace-pre-line touch-manipulation w-full hover:bg-muted/30 transition-colors"
                    style={{
                        fontSize: tarjetas.nameFont,
                        lineHeight: `${tarjetas.nameFont + 3}px`,
                        padding: '5px 7px 6px',
                        minHeight: nameBodyMinHeight(lineCount, tarjetas.nameFont),
                        color: nombre?.trim() ? '#0f172a' : '#94a3b8',
                    }}
                >
                    {displayNombre}
                </button>
            ) : (
                <div
                    className="text-center font-extrabold break-words whitespace-pre-line select-none"
                    style={{
                        fontSize: tarjetas.nameFont,
                        lineHeight: `${tarjetas.nameFont + 3}px`,
                        padding: '5px 7px 6px',
                        minHeight: nameBodyMinHeight(lineCount, tarjetas.nameFont),
                        color: nombre?.trim() ? '#0f172a' : '#94a3b8',
                    }}
                >
                    {displayNombre}
                </div>
            )}
        </div>
    )
})
