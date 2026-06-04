'use client'

import { forwardRef } from 'react'
import type { PlanCompleto, OfrMiembro, OfrServicio } from './actions'
import type { OfrendaExportLabels } from './ofrendaLocale'
import { IDMJI_BRAND, SERVICE_EXPORT_COLORS, EXPORT_CELL } from './exportBrand'
import { exportLayoutWidthPx } from './exportLayoutMetrics'
import { ExportHeaderBlock } from './ExportHeaderBlock'
import { formatExportPeriodLabel } from './exportHeaderShared'
import type { ExportPeopleScope } from './exportPeopleScope'
import {
    exportIncludesGroup1,
    exportIncludesSacosRows,
    isCollaboratorsOnlyExport,
} from './exportPeopleScope'

const ROLES_G1_KEYS = ['realiza', 'apoyo', 'vigilancia'] as const
const ROLES_G2_KEYS = ['colaborador_1', 'colaborador_2', 'colaborador_3'] as const

interface ExportLayoutProps {
    plan: PlanCompleto
    miembros: OfrMiembro[]
    mesTitulo: string
    anio: number
    labels: OfrendaExportLabels
    /** Si se indica, solo exporta estos servicios (p. ej. una semana). */
    servicios?: OfrServicio[]
    /** Subtítulo bajo el título (p. ej. «Semana 2 de 4 · 14–17 may»). */
    periodSubtitle?: string
    exportScope?: 'month' | 'week'
    /** Completo (G1+G2+sacos) o solo colaboradores sin sacos. */
    peopleScope?: ExportPeopleScope
}

function getDayShort(tipo: OfrServicio['dia_tipo'], labels: OfrendaExportLabels): string {
    return tipo === 'jueves' ? labels.jueves : labels.domingo
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
 * Layout de exportación — branding idmji.org (navy + dorado).
 * Diseño minimalista: bordes de celda casi invisibles, separadores de semana
 * con acento navy sutil (no dorado), dorado solo en franja superior y pie.
 * Capturado con html-to-image (skipFonts:true evita error CORS de Google Fonts).
 */
export const ExportLayout = forwardRef<HTMLDivElement, ExportLayoutProps>(
    function ExportLayout({
        plan,
        miembros,
        mesTitulo,
        anio,
        labels,
        servicios: serviciosProp,
        periodSubtitle,
        exportScope: exportScopeProp,
        peopleScope = 'all',
    }, ref) {
        const servicios = serviciosProp ?? plan.servicios
        void exportScopeProp
        const collaboratorsOnly = isCollaboratorsOnlyExport(peopleScope)
        const showSacos = exportIncludesSacosRows(peopleScope)
        const showG1 = exportIncludesGroup1(peopleScope)
        const { asignaciones } = plan
        const roleLabels = {
            realiza: labels.realiza,
            apoyo: labels.apoyo,
            vigilancia: labels.vigilancia,
        }

        const layoutWidth = exportLayoutWidthPx(servicios.length)
        const periodLabel = formatExportPeriodLabel(mesTitulo, anio)

        const creationDate = new Date().toLocaleDateString('es-ES', {
            day: '2-digit', month: 'long', year: 'numeric',
        })

        const weekLeftBorder = (idx: number): React.CSSProperties =>
            idx % 3 === 0 && idx > 0
                ? { borderLeft: `2px solid ${EXPORT_CELL.weekBorder}` }
                : {}

        return (
            <div
                ref={ref}
                style={{
                    width: layoutWidth,
                    minWidth: layoutWidth,
                    backgroundColor: IDMJI_BRAND.pageBg,
                    fontFamily: IDMJI_BRAND.fontFamily,
                    padding: '28px 32px 32px',
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
                    {/* Franja dorada — única aparición del dorado en la tabla */}
                    <div style={{ height: 5, background: IDMJI_BRAND.goldGradient }} />

                    <ExportHeaderBlock
                        labels={labels}
                        periodLabel={periodLabel}
                        periodSubtitle={periodSubtitle}
                    />

                    {/* ── Tabla ── */}
                    <div style={{ padding: '0 0 0 0' }}>
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: 11,
                            }}
                        >
                            <thead>
                                {/* Fila de encabezados de servicio */}
                                <tr>
                                    <th
                                        style={{
                                            ...thBase,
                                            width: 145,
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
                                    {servicios.map((srv, idx) => {
                                        const col = SERVICE_EXPORT_COLORS[srv.dia_tipo]
                                        return (
                                            <th
                                                key={srv.id}
                                                style={{
                                                    ...thBase,
                                                    backgroundColor: col.headerBg,
                                                    color: '#fff',
                                                    padding: '7px 6px',
                                                    textAlign: 'center',
                                                    ...weekLeftBorder(idx),
                                                }}
                                            >
                                                <div style={{ fontWeight: 800, fontSize: 10 }}>
                                                    {getDayShort(srv.dia_tipo, labels)}
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: 11 }}>
                                                    {getFechaLabel(srv.fecha)}
                                                </div>
                                                {col.badgeBg && (
                                                    <div
                                                        style={{
                                                            fontSize: 9,
                                                            fontWeight: 700,
                                                            backgroundColor: col.badgeBg,
                                                            color: col.seqText,
                                                            borderRadius: 10,
                                                            padding: '2px 7px',
                                                            marginTop: 3,
                                                            display: 'inline-block',
                                                        }}
                                                    >
                                                        {srv.dia_tipo === 'domingo' ? labels.manana : labels.tarde}
                                                    </div>
                                                )}
                                            </th>
                                        )
                                    })}
                                </tr>

                                {showSacos ? (
                                    <tr>
                                        <td
                                            style={{
                                                ...tdBase,
                                                backgroundColor: IDMJI_BRAND.goldPale,
                                                fontWeight: 800,
                                                fontSize: 10,
                                                padding: '6px 14px',
                                                color: IDMJI_BRAND.navy,
                                            }}
                                        >
                                            {labels.secuencia}
                                        </td>
                                        {servicios.map((srv, idx) => {
                                            const col = SERVICE_EXPORT_COLORS[srv.dia_tipo]
                                            return (
                                                <td
                                                    key={srv.id}
                                                    style={{
                                                        ...tdBase,
                                                        backgroundColor: col.seqBg,
                                                        textAlign: 'center',
                                                        fontWeight: 800,
                                                        fontFamily: 'ui-monospace, "Courier New", monospace',
                                                        fontSize: 12,
                                                        color: col.seqText,
                                                        padding: '6px 4px',
                                                        ...weekLeftBorder(idx),
                                                    }}
                                                >
                                                    {srv.secuencia_texto}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ) : null}
                            </thead>

                            <tbody>
                                {showG1 ? ROLES_G1_KEYS.map((key, rIdx) => {
                                    const sCol = SERVICE_EXPORT_COLORS.jueves
                                    return (
                                        <tr key={key}>
                                            <td
                                                style={{
                                                    ...tdBase,
                                                    backgroundColor: rIdx % 2 === 0 ? sCol.labelBgEven : sCol.labelBgOdd,
                                                    fontWeight: 700,
                                                    color: sCol.labelText,
                                                    padding: '8px 14px',
                                                    fontSize: 10,
                                                }}
                                            >
                                                {roleLabels[key]}
                                            </td>
                                            {servicios.map((srv, idx) => (
                                                <td
                                                    key={srv.id}
                                                    style={{
                                                        ...tdBase,
                                                        backgroundColor: rIdx % 2 === 0 ? EXPORT_CELL.bodyEven : EXPORT_CELL.bodyOdd,
                                                        textAlign: 'center',
                                                        padding: '8px 4px',
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        color: IDMJI_BRAND.text,
                                                        ...weekLeftBorder(idx),
                                                    }}
                                                >
                                                    {getMiembroNombre(miembros, asignaciones, srv.id, key)}
                                                </td>
                                            ))}
                                        </tr>
                                    )
                                }) : null}

                                {showG1 ? (
                                    <tr>
                                        <td
                                            colSpan={servicios.length + 1}
                                            style={{ height: 3, backgroundColor: EXPORT_CELL.divider, padding: 0 }}
                                        />
                                    </tr>
                                ) : null}

                                {ROLES_G2_KEYS.map((key, rIdx) => {
                                    const colLabel = [labels.colaborador1, labels.colaborador2, labels.colaborador3][rIdx]
                                    const sCol = SERVICE_EXPORT_COLORS.domingo
                                    return (
                                        <tr key={key}>
                                            <td
                                                style={{
                                                    ...tdBase,
                                                    backgroundColor: rIdx % 2 === 0 ? sCol.labelBgEven : sCol.labelBgOdd,
                                                    fontWeight: 700,
                                                    color: sCol.labelText,
                                                    padding: '8px 14px',
                                                    fontSize: 10,
                                                }}
                                            >
                                                {colLabel}
                                            </td>
                                            {servicios.map((srv, idx) => (
                                                <td
                                                    key={srv.id}
                                                    style={{
                                                        ...tdBase,
                                                        backgroundColor: rIdx % 2 === 0 ? EXPORT_CELL.bodyEven : EXPORT_CELL.bodyOdd,
                                                        textAlign: 'center',
                                                        padding: '8px 4px',
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        color: IDMJI_BRAND.text,
                                                        ...weekLeftBorder(idx),
                                                    }}
                                                >
                                                    {getMiembroNombre(miembros, asignaciones, srv.id, key)}
                                                </td>
                                            ))}
                                        </tr>
                                    )
                                })}
                            </tbody>

                            <tfoot>
                                <tr>
                                    <td
                                        style={{
                                            ...tdBase,
                                            backgroundColor: IDMJI_BRAND.tableMeta,
                                            color: '#b8c0cc',
                                            fontWeight: 700,
                                            fontSize: 9,
                                            padding: '6px 14px',
                                        }}
                                    >
                                        {labels.semanaIso}
                                    </td>
                                    {servicios.map((srv, idx) => (
                                        <td
                                            key={srv.id}
                                            style={{
                                                ...tdBase,
                                                backgroundColor: IDMJI_BRAND.navyDark,
                                                color: '#e2e8f0',
                                                textAlign: 'center',
                                                fontWeight: 700,
                                                fontSize: 10,
                                                padding: '6px 4px',
                                                ...weekLeftBorder(idx),
                                            }}
                                        >
                                            S{srv.semana_iso}
                                        </td>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Pie */}
                    <div
                        style={{
                            borderTop: `2px solid ${IDMJI_BRAND.goldPale}`,
                            backgroundColor: '#f7f8fa',
                            padding: '11px 24px 13px',
                            display: 'flex',
                            justifyContent: collaboratorsOnly ? 'center' : 'space-between',
                            alignItems: 'center',
                            gap: 16,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 9,
                                color: IDMJI_BRAND.textMuted,
                                fontWeight: 600,
                                textAlign: collaboratorsOnly ? 'center' : 'left',
                            }}
                        >
                            {labels.footer}{' · '}{creationDate}
                        </div>
                        {!collaboratorsOnly ? (
                            <div style={{ fontSize: 9, color: IDMJI_BRAND.textSecondary, fontWeight: 600, textAlign: 'right' }}>
                                {labels.sacosMeta(
                                    (plan.plan.sacos_jueves ?? 4) + (plan.plan.sacos_domingo ?? 8) + (plan.plan.sacos_domingo_tarde ?? 4),
                                    plan.plan.sacos_jueves ?? 4,
                                    plan.plan.sacos_domingo ?? 8,
                                    plan.plan.sacos_domingo_tarde ?? 4,
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        )
    }
)

const thBase: React.CSSProperties = {
    border: `1px solid ${EXPORT_CELL.cellBorder}`,
    fontSize: 11,
}

const tdBase: React.CSSProperties = {
    border: `1px solid ${EXPORT_CELL.cellBorder}`,
}
