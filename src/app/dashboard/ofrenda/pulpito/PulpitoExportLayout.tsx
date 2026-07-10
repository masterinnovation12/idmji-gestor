'use client'

import { forwardRef } from 'react'
import { IDMJI_BRAND } from '../exportBrand'
import type { PulpitoRol } from '@/lib/utils/pulpitoAvailability'
import { PULPITO_ROLES } from '@/lib/utils/pulpitoAvailability'

export type PulpitoExportOrientation = 'vertical' | 'horizontal'

export interface PulpitoExportCulto {
    id: string
    fecha: string
    diaLabel: string   // «Lunes 6 jul»
    tipoNombre: string
    tipoColor: string
    roles: PulpitoRol[]
    asignaciones: Partial<Record<PulpitoRol, string>>
}

export interface PulpitoExportLabels {
    churchName: string
    titleDoc: string
    roles: Record<PulpitoRol, string>
    sinAsignar: string
    rolFecha: string
    footer: string
}

interface Props {
    orientation: PulpitoExportOrientation
    periodLabel: string
    cultos: PulpitoExportCulto[]
    labels: PulpitoExportLabels
}

/** Acento sutil por rol (coherente con la paleta del proyecto). */
const ROLE_ACCENT: Record<PulpitoRol, { bg: string; text: string; chip: string }> = {
    introduccion: { bg: '#edf8f3', text: '#0d5c44', chip: '#1a6b52' },
    ensenanza: { bg: '#eef2fa', text: '#1f2e85', chip: IDMJI_BRAND.navy },
    testimonios: { bg: '#f5f0fc', text: '#4a3278', chip: '#4a3278' },
    finalizacion: { bg: '#fbf4e6', text: '#8a6d1f', chip: IDMJI_BRAND.gold },
}

function ExportHeader({ labels, periodLabel }: { labels: PulpitoExportLabels; periodLabel: string }) {
    return (
        <div
            style={{
                position: 'relative',
                background: IDMJI_BRAND.headerGradient,
                padding: '26px 30px 24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                }}
            >
                <div
                    style={{
                        width: 76,
                        height: 76,
                        flexShrink: 0,
                        borderRadius: 13,
                        padding: 3,
                        background: IDMJI_BRAND.goldGradient,
                        boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 10,
                            backgroundColor: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.jpg" alt="IDMJI" style={{ width: 66, height: 66, objectFit: 'contain' }} />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div
                        style={{
                            fontSize: 8.5,
                            fontWeight: 600,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: '#E8D9A8',
                            marginBottom: 8,
                            maxWidth: 420,
                            lineHeight: 1.35,
                        }}
                    >
                        {labels.churchName}
                    </div>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: 27,
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            color: IDMJI_BRAND.textOnNavy,
                            lineHeight: 1.1,
                        }}
                    >
                        {labels.titleDoc}
                    </h1>
                    <span
                        style={{
                            marginTop: 6,
                            fontSize: 15,
                            fontWeight: 600,
                            color: IDMJI_BRAND.goldLight,
                        }}
                    >
                        {periodLabel}
                    </span>
                </div>
            </div>
        </div>
    )
}

function RoleChip({ rol, label }: { rol: PulpitoRol; label: string }) {
    const acc = ROLE_ACCENT[rol]
    return (
        <span
            style={{
                display: 'inline-block',
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                color: '#fff',
                backgroundColor: acc.chip,
                borderRadius: 6,
                padding: '3px 9px',
            }}
        >
            {label}
        </span>
    )
}

function Footer({ labels }: { labels: PulpitoExportLabels }) {
    const creationDate = new Date().toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
    })
    return (
        <div
            style={{
                borderTop: `2px solid ${IDMJI_BRAND.goldPale}`,
                backgroundColor: '#f7f8fa',
                padding: '10px 24px 12px',
                textAlign: 'center',
                fontSize: 9,
                color: IDMJI_BRAND.textMuted,
                fontWeight: 600,
            }}
        >
            {labels.footer}{' · '}{creationDate}
        </div>
    )
}

// ─── Layout vertical (semana / móvil) ─────────────────────────────────────────

function VerticalBody({ cultos, labels }: { cultos: PulpitoExportCulto[]; labels: PulpitoExportLabels }) {
    return (
        <div style={{ padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cultos.map(culto => (
                <div
                    key={culto.id}
                    style={{
                        border: `1px solid ${IDMJI_BRAND.borderLight}`,
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(31,46,133,0.06)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            padding: '9px 14px',
                            backgroundColor: IDMJI_BRAND.navy,
                            borderLeft: `5px solid ${culto.tipoColor}`,
                        }}
                    >
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                            {culto.diaLabel}
                        </span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#c9d3ee' }}>
                            {culto.tipoNombre}
                        </span>
                    </div>
                    <div>
                        {culto.roles.map((rol, idx) => {
                            const nombre = culto.asignaciones[rol]
                            return (
                                <div
                                    key={rol}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        padding: '10px 14px',
                                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f6f8fb',
                                        borderTop: idx === 0 ? 'none' : `1px solid ${IDMJI_BRAND.borderLight}`,
                                    }}
                                >
                                    <RoleChip rol={rol} label={labels.roles[rol]} />
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: nombre ? 700 : 600,
                                            color: nombre ? IDMJI_BRAND.text : '#b02a2a',
                                            textAlign: 'right',
                                        }}
                                    >
                                        {nombre || labels.sinAsignar}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Layout horizontal (mes / tabla) ──────────────────────────────────────────

function HorizontalBody({ cultos, labels }: { cultos: PulpitoExportCulto[]; labels: PulpitoExportLabels }) {
    const cellBorder = '#eaecf2'
    return (
        <div style={{ padding: '18px 22px 22px' }}>
            <div
                style={{
                    border: `1px solid ${IDMJI_BRAND.borderLight}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(31,46,133,0.06)',
                }}
            >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                    <tr>
                        <th
                            style={{
                                border: `1px solid ${cellBorder}`,
                                width: 130,
                                backgroundColor: IDMJI_BRAND.tableMeta,
                                color: '#fff',
                                textAlign: 'left',
                                padding: '9px 14px',
                                fontWeight: 800,
                                fontSize: 10,
                            }}
                        >
                            {labels.rolFecha}
                        </th>
                        {cultos.map(culto => (
                            <th
                                key={culto.id}
                                style={{
                                    border: `1px solid ${cellBorder}`,
                                    backgroundColor: IDMJI_BRAND.navy,
                                    borderTop: `3px solid ${culto.tipoColor}`,
                                    color: '#fff',
                                    padding: '7px 6px',
                                    textAlign: 'center',
                                }}
                            >
                                <div style={{ fontWeight: 800, fontSize: 10.5 }}>{culto.diaLabel}</div>
                                <div style={{ fontWeight: 600, fontSize: 8.5, color: '#c9d3ee', marginTop: 2 }}>
                                    {culto.tipoNombre}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {PULPITO_ROLES.map((rol, rIdx) => {
                        const acc = ROLE_ACCENT[rol]
                        // Solo mostrar la fila si algún culto tiene ese rol
                        const algunCulto = cultos.some(c => c.roles.includes(rol))
                        if (!algunCulto) return null
                        return (
                            <tr key={rol}>
                                <td
                                    style={{
                                        border: `1px solid ${cellBorder}`,
                                        backgroundColor: acc.bg,
                                        fontWeight: 800,
                                        color: acc.text,
                                        padding: '8px 14px',
                                        fontSize: 10,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.02em',
                                    }}
                                >
                                    {labels.roles[rol]}
                                </td>
                                {cultos.map(culto => {
                                    const aplica = culto.roles.includes(rol)
                                    const nombre = culto.asignaciones[rol]
                                    return (
                                        <td
                                            key={culto.id}
                                            style={{
                                                border: `1px solid ${cellBorder}`,
                                                backgroundColor: rIdx % 2 === 0 ? '#fafbfc' : '#f3f5f8',
                                                textAlign: 'center',
                                                padding: '8px 6px',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: !aplica ? '#c7ccd6' : nombre ? IDMJI_BRAND.text : '#b02a2a',
                                            }}
                                        >
                                            {!aplica ? '—' : nombre || labels.sinAsignar}
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            </div>
        </div>
    )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export const PulpitoExportLayout = forwardRef<HTMLDivElement, Props>(
    function PulpitoExportLayout({ orientation, periodLabel, cultos, labels }, ref) {
        const isVertical = orientation === 'vertical'
        const width = isVertical
            ? 620
            : Math.max(900, 194 + cultos.length * 120)

        return (
            <div
                ref={ref}
                style={{
                    width,
                    minWidth: width,
                    backgroundColor: IDMJI_BRAND.pageBg,
                    fontFamily: IDMJI_BRAND.fontFamily,
                    padding: '26px 28px 30px',
                    boxSizing: 'border-box',
                    color: IDMJI_BRAND.text,
                }}
            >
                <div
                    style={{
                        backgroundColor: IDMJI_BRAND.surface,
                        borderRadius: 14,
                        overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(31,46,133,0.10), 0 2px 8px rgba(0,0,0,0.05)',
                        border: `1px solid ${IDMJI_BRAND.borderLight}`,
                    }}
                >
                    <div style={{ height: 5, background: IDMJI_BRAND.goldGradient }} />
                    <ExportHeader labels={labels} periodLabel={periodLabel} />
                    {isVertical ? (
                        <VerticalBody cultos={cultos} labels={labels} />
                    ) : (
                        <HorizontalBody cultos={cultos} labels={labels} />
                    )}
                    <Footer labels={labels} />
                </div>
            </div>
        )
    },
)
