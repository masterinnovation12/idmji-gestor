/**
 * PlanoSvgTemplo.tsx — Plano SVG 2D premium del Templo de Sabadell
 *
 * Pinta el esquema vectorial generado desde la configuración real de asientos
 * (motor puro en planoLayout.ts): suelo, paredes, alfolí/diezmo, 662 asientos
 * coloreados por bloque (modo 4/8 sacos) y púlpito. Es el fondo de la vista 2D;
 * los elementos interactivos (tarjetas, muñequitos, números) van en capas aparte.
 *
 * @author Equipo de Desarrollo IDMJI
 * @date 2026-06-11
 */
'use client'

import { memo, useMemo } from 'react'
import { computePlanoSvgGeometry } from './planoLayout'
import type { PlanoBloque, PlanoLayout2d, PlanoModo } from './planoTypes'

interface Props {
    layout: PlanoLayout2d
    modo: PlanoModo
    bloques: PlanoBloque[]
}

export const PlanoSvgTemplo = memo(function PlanoSvgTemplo({ layout, modo, bloques }: Props) {
    const geo = useMemo(() => computePlanoSvgGeometry(layout, modo, bloques), [layout, modo, bloques])
    const a = geo.alfoli
    const p = geo.pulpito

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${geo.lienzo.w} ${geo.lienzo.h}`}
            width="100%"
            height="100%"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="plano-floor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#efe7d8" />
                    <stop offset="1" stopColor="#e3d7c0" />
                </linearGradient>
                <linearGradient id="plano-wood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#c98e4b" />
                    <stop offset="1" stopColor="#9c6428" />
                </linearGradient>
                <linearGradient id="plano-tarima" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#cbd5e1" />
                    <stop offset="1" stopColor="#94a3b8" />
                </linearGradient>
            </defs>

            {/* Suelo y pared perimetral */}
            <rect x="0" y="0" width={geo.lienzo.w} height={geo.lienzo.h} fill="url(#plano-floor)" />
            <rect
                x={geo.pared.x}
                y={geo.pared.y}
                width={geo.pared.w}
                height={geo.pared.h}
                fill="none"
                stroke="#b9b1a0"
                strokeWidth={geo.pared.stroke}
                rx={8}
            />

            {/* Alfolí / diezmo */}
            <g>
                <rect x={a.bodyX} y={a.bodyY} width={a.bodyW} height={a.bodyH} fill="#ddd5c4" stroke="#b9b1a0" strokeWidth={4} rx={6} />
                <rect x={a.doorX} y={a.doorY} width={a.doorW} height={a.doorH} fill="#c4b8a8" stroke="#8a8270" strokeWidth={3} rx={4} />
                <line x1={a.doorX} y1={a.doorY} x2={a.doorX} y2={a.doorY + a.doorH} stroke="#6b5d4a" strokeWidth={2} />
                <text x={a.labelCx} y={a.labelCy} textAnchor="middle" fontFamily="Inter,Arial" fontWeight={800} fill="#7a7262">
                    {/* etiqueta del plano del templo: terminología bíblica pendiente de validación del responsable */}
                    <tspan x={a.labelCx} dy={0} fontSize={a.labelFs}>alfolí/</tspan>{/* i18n-ignore */}
                    <tspan x={a.labelCx} dy={Math.round(a.labelFs * 1.15)} fontSize={Math.max(10, a.labelFs - 1)}>diezmo</tspan>{/* i18n-ignore */}
                </text>
            </g>

            {/* Asientos (662) coloreados por bloque */}
            <g>
                {geo.seats.map((s, i) => (
                    <g key={`s-${i}`}>
                        <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={5} fill={s.fill} />
                        <rect x={s.x} y={s.y} width={s.w} height={6} rx={3} fill="rgba(255,255,255,.28)" />
                    </g>
                ))}
            </g>

            {/* Etiquetas de columna */}
            {geo.columnaLabels.map(l => (
                <text
                    key={l.text}
                    x={l.x}
                    y={l.y}
                    textAnchor="middle"
                    fontFamily="Inter,Arial"
                    fontSize={17}
                    fontWeight={800}
                    fill="#64748b"
                >
                    {l.text}
                </text>
            ))}

            {/* Púlpito (tarima + podio + atril) */}
            <g>
                <rect x={p.tarimaX} y={p.tarimaY} width={p.tarimaW} height={p.tarimaH} rx={14} fill="url(#plano-tarima)" stroke="#64748b" strokeWidth={2} />
                <rect x={p.podiumX} y={p.podiumY} width={p.podiumW} height={p.podiumH} rx={10} fill="url(#plano-wood)" stroke="#7c4a17" strokeWidth={3} />
                <rect x={p.topX} y={p.topY} width={p.topW} height={p.topH} rx={6} fill="url(#plano-wood)" stroke="#7c4a17" strokeWidth={3} />
                <text x={p.labelX} y={p.labelY} textAnchor="middle" fontFamily="Inter,Arial" fontSize={p.labelFs} fontWeight={800} fill="#334155">
                    PÚLPITO
                </text>
            </g>
        </svg>
    )
})
