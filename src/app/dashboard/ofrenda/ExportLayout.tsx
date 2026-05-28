'use client'

import { forwardRef } from 'react'
import type { PlanCompleto, OfrMiembro, OfrServicio } from './actions'

const MESES_ES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const ROLES_G1 = [
    { key: 'realiza',    label: 'Realiza labor'           },
    { key: 'apoyo',      label: 'Apoyo'                   },
    { key: 'vigilancia', label: 'Vigilancia Orientación'  },
] as const

const ROLES_G2 = [
    { key: 'colaborador_1', label: 'Colaborador' },
    { key: 'colaborador_2', label: 'Colaborador' },
    { key: 'colaborador_3', label: 'Colaborador' },
] as const

// ─── Colores por tipo de servicio (estilo inline para export) ────────────────

const COL_EXPORT = {
    jueves: {
        headerBg: '#064e3b',
        seqBg:    '#ecfdf5',
        seqText:  '#065f46',
        badgeTxt: null as string | null,
        badgeBg:  null as string | null,
    },
    domingo: {
        headerBg: '#1e3a5f',
        seqBg:    '#eff6ff',
        seqText:  '#1e40af',
        badgeTxt: 'Mañana',
        badgeBg:  '#dbeafe',
    },
    domingo_tarde: {
        headerBg: '#3b0764',
        seqBg:    '#f5f3ff',
        seqText:  '#5b21b6',
        badgeTxt: 'Tarde',
        badgeBg:  '#ede9fe',
    },
} as const

interface ExportLayoutProps {
    plan: PlanCompleto
    miembros: OfrMiembro[]
    anio: number
    mes: number
}

function getDayShort(tipo: OfrServicio['dia_tipo']): string {
    return tipo === 'jueves' ? 'Jueves' : 'Domingo'
}

function getFechaLabel(fecha: string): string {
    const d = new Date(fecha + 'T00:00:00')
    const dia = String(d.getDate()).padStart(2, '0')
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${dia}-${meses[d.getMonth()]}`
}

function getMiembroNombre(
    miembros: OfrMiembro[],
    asignaciones: PlanCompleto['asignaciones'],
    servicioId: string,
    rol: string
): string {
    const asig = asignaciones.find(a => a.servicio_id === servicioId && a.rol === rol)
    if (!asig?.miembro_id) return '—'
    const m = miembros.find(m => m.id === asig.miembro_id)
    return m ? m.nombre : '—'
}

/**
 * Layout de exportación — diseño premium con 3 columnas de servicio por semana.
 * Se renderiza fuera de pantalla y se captura con html-to-image.
 * Width fija de 1600px para calidad suficiente en WhatsApp.
 */
export const ExportLayout = forwardRef<HTMLDivElement, ExportLayoutProps>(
    function ExportLayout({ plan, miembros, anio, mes }, ref) {
        const { servicios, asignaciones } = plan
        const mesTitulo = MESES_ES[mes]

        // Sacos totales por semana para el pie
        const { sacos_jueves: sJ, sacos_domingo: sD, sacos_domingo_tarde: sDT } = plan.plan
        const sacosPorSemana = (sJ ?? 4) + (sD ?? 8) + (sDT ?? 4)

        return (
            <div
                ref={ref}
                style={{
                    width: 1600,
                    backgroundColor: '#ffffff',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    padding: '32px 36px 28px',
                    boxSizing: 'border-box',
                    color: '#111827',
                }}
            >
                {/* ── Header ──────────────────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    {/* Logo */}
                    <div style={{ width: 80, height: 80, position: 'relative', flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo.jpg"
                            alt="IDMJI Logo"
                            style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8 }}
                        />
                    </div>

                    {/* Título central */}
                    <div style={{ textAlign: 'center', flex: 1, padding: '0 20px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', marginBottom: 4 }}>
                            IGLESIA DE DIOS MINISTERIAL DE JESUCRISTO INTERNACIONAL
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', color: '#111827' }}>
                            Labor Ofrenda — {mesTitulo} {anio}
                        </div>
                        {/* Leyenda de colores */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8 }}>
                            {[
                                { color: '#064e3b', label: 'Jueves' },
                                { color: '#1e3a5f', label: 'Dom. Mañana' },
                                { color: '#3b0764', label: 'Dom. Tarde' },
                            ].map(({ color, label }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
                                    <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Espacio derecho */}
                    <div style={{ width: 80 }} />
                </div>

                {/* ── Tabla ────────────────────────────────────────────── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                        {/* Fila 1: Día y fecha */}
                        <tr>
                            <th style={{ ...thBase, width: 145, backgroundColor: '#1f2937', color: '#fff', textAlign: 'left', padding: '8px 12px' }}>
                                Rol / Fecha
                            </th>
                            {servicios.map((srv, idx) => {
                                const col = COL_EXPORT[srv.dia_tipo]
                                const isWeekStart = idx % 3 === 0 && idx > 0
                                return (
                                    <th
                                        key={srv.id}
                                        style={{
                                            ...thBase,
                                            backgroundColor: col.headerBg,
                                            color: '#fff',
                                            padding: '6px 6px',
                                            textAlign: 'center',
                                            borderLeft: isWeekStart ? '2px solid #6b7280' : undefined,
                                        }}
                                    >
                                        <div style={{ fontWeight: 900, fontSize: 10 }}>
                                            {getDayShort(srv.dia_tipo)}
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 11 }}>
                                            {getFechaLabel(srv.fecha)}
                                        </div>
                                        {col.badgeTxt && (
                                            <div style={{
                                                fontSize: 9,
                                                fontWeight: 700,
                                                backgroundColor: col.badgeBg ?? '#e5e7eb',
                                                color: col.seqText,
                                                borderRadius: 10,
                                                padding: '1px 6px',
                                                marginTop: 2,
                                                display: 'inline-block',
                                            }}>
                                                {col.badgeTxt}
                                            </div>
                                        )}
                                    </th>
                                )
                            })}
                        </tr>

                        {/* Fila 2: Secuencia de sacos */}
                        <tr>
                            <td style={{ ...tdBase, backgroundColor: '#f9fafb', fontWeight: 800, fontSize: 10, padding: '5px 12px', color: '#374151' }}>
                                Secuencia (sacos)
                            </td>
                            {servicios.map((srv, idx) => {
                                const col = COL_EXPORT[srv.dia_tipo]
                                const isWeekStart = idx % 3 === 0 && idx > 0
                                return (
                                    <td
                                        key={srv.id}
                                        style={{
                                            ...tdBase,
                                            backgroundColor: col.seqBg,
                                            textAlign: 'center',
                                            fontWeight: 900,
                                            fontFamily: 'monospace',
                                            fontSize: 12,
                                            color: col.seqText,
                                            padding: '5px 4px',
                                            borderLeft: isWeekStart ? '2px solid #6b7280' : undefined,
                                        }}
                                    >
                                        {srv.secuencia_texto}
                                    </td>
                                )
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {/* Grupo 1: Roles */}
                        {ROLES_G1.map(({ key, label }, rIdx) => (
                            <tr key={key}>
                                <td style={{
                                    ...tdBase,
                                    backgroundColor: rIdx % 2 === 0 ? '#f0fdf4' : '#dcfce7',
                                    fontWeight: 700,
                                    color: '#065f46',
                                    padding: '7px 12px',
                                    fontSize: 10,
                                }}>
                                    {label}
                                </td>
                                {servicios.map((srv, idx) => {
                                    const isWeekStart = idx % 3 === 0 && idx > 0
                                    return (
                                        <td
                                            key={srv.id}
                                            style={{
                                                ...tdBase,
                                                backgroundColor: rIdx % 2 === 0 ? '#f9fafb' : '#f3f4f6',
                                                textAlign: 'center',
                                                padding: '7px 4px',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                borderLeft: isWeekStart ? '2px solid #6b7280' : undefined,
                                            }}
                                        >
                                            {getMiembroNombre(miembros, asignaciones, srv.id, key)}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}

                        {/* Separador grupos */}
                        <tr>
                            <td colSpan={servicios.length + 1} style={{ height: 3, backgroundColor: '#374151' }} />
                        </tr>

                        {/* Grupo 2: Colaboradores */}
                        {ROLES_G2.map(({ key }, rIdx) => (
                            <tr key={key}>
                                <td style={{
                                    ...tdBase,
                                    backgroundColor: rIdx % 2 === 0 ? '#eff6ff' : '#dbeafe',
                                    fontWeight: 700,
                                    color: '#1e40af',
                                    padding: '7px 12px',
                                    fontSize: 10,
                                }}>
                                    Colaboradores
                                </td>
                                {servicios.map((srv, idx) => {
                                    const isWeekStart = idx % 3 === 0 && idx > 0
                                    return (
                                        <td
                                            key={srv.id}
                                            style={{
                                                ...tdBase,
                                                backgroundColor: rIdx % 2 === 0 ? '#f9fafb' : '#f3f4f6',
                                                textAlign: 'center',
                                                padding: '7px 4px',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                borderLeft: isWeekStart ? '2px solid #6b7280' : undefined,
                                            }}
                                        >
                                            {getMiembroNombre(miembros, asignaciones, srv.id, key)}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>

                    {/* Pie: Semana ISO */}
                    <tfoot>
                        <tr>
                            <td style={{ ...tdBase, backgroundColor: '#1f2937', color: '#9ca3af', fontWeight: 700, fontSize: 9, padding: '5px 12px' }}>
                                Semana ISO
                            </td>
                            {servicios.map((srv, idx) => {
                                const isWeekStart = idx % 3 === 0 && idx > 0
                                return (
                                    <td
                                        key={srv.id}
                                        style={{
                                            ...tdBase,
                                            backgroundColor: '#1f2937',
                                            color: '#d1d5db',
                                            textAlign: 'center',
                                            fontWeight: 700,
                                            fontSize: 10,
                                            padding: '5px 4px',
                                            borderLeft: isWeekStart ? '2px solid #6b7280' : undefined,
                                        }}
                                    >
                                        S{srv.semana_iso}
                                    </td>
                                )
                            })}
                        </tr>
                    </tfoot>
                </table>

                {/* ── Footer ───────────────────────────────────────────── */}
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: '0.03em' }}>
                        Generado por IDMJI Gestor de Púlpito · {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 9, color: '#9ca3af' }}>
                        {sacosPorSemana} sacos/semana (J:{sJ ?? 4} · DM:{sD ?? 8} · DT:{sDT ?? 4}) · Ciclo 20 sacos
                    </div>
                </div>
            </div>
        )
    }
)

// ─── Estilos base (inline para exportación) ────────────────────────────────────

const thBase: React.CSSProperties = {
    border: '1px solid #d1d5db',
    fontSize: 11,
}

const tdBase: React.CSSProperties = {
    border: '1px solid #e5e7eb',
}
