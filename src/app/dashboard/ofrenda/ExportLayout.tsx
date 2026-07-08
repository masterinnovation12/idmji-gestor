'use client'

import { forwardRef } from 'react'
import type { PlanCompleto, OfrMiembro, OfrServicio } from './actions'
import type { OfrendaExportLabels } from './ofrendaLocale'
import { IDMJI_BRAND, SERVICE_EXPORT_COLORS, EXPORT_CELL } from './exportBrand'
import { exportImageLayoutWidthPx } from './exportLayoutMetrics'
import { ExportHeaderBlock } from './ExportHeaderBlock'
import { formatExportPeriodLabel } from './exportHeaderShared'
import type { ExportPeopleScope } from './exportPeopleScope'
import {
    exportIncludesGroup1,
    exportIncludesSacosRows,
    isCollaboratorsOnlyExport,
} from './exportPeopleScope'
import { rolGrupo2AplicaEnTurno } from '@/lib/utils/ofrendaEngine'

const ROLES_G1_KEYS = ['realiza', 'apoyo', 'vigilancia'] as const
const ROLES_G2_KEYS = ['colaborador_1', 'colaborador_2', 'colaborador_3'] as const
const EMPTY_ASSIGNMENT = '—'
/** Roles extra de G1 (opcionales en el export); orden canónico. */
const EXTRA_G1_ORDER = ['primera_vez', 'segunda_tercera_vez', 'imposicion_manos'] as const

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
    locale?: 'es-ES' | 'ca-ES'
    /** Completo (G1+G2+sacos) o solo colaboradores sin sacos. */
    peopleScope?: ExportPeopleScope
    /** Roles extra de G1 a incluir (primera_vez, segunda_tercera_vez, imposicion_manos). */
    extraG1Roles?: string[]
}

function getDayShort(tipo: OfrServicio['dia_tipo'], labels: OfrendaExportLabels): string {
    return tipo === 'jueves' ? labels.jueves : labels.domingo
}

function getFechaLabel(fecha: string, locale: 'es-ES' | 'ca-ES' = 'es-ES'): string {
    const d = new Date(fecha + 'T00:00:00')
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = new Intl.DateTimeFormat(locale, { month: 'short' })
        .format(d)
        .replace('.', '')
        .toLowerCase()
    return `${dia}-${mes}`
}

function getMiembroNombre(
    miembros: OfrMiembro[],
    asignaciones: PlanCompleto['asignaciones'],
    servicioId: string,
    rol: string
): string {
    const asig = asignaciones.find(a => a.servicio_id === servicioId && a.rol === rol)
    if (!asig?.miembro_id) return EMPTY_ASSIGNMENT
    const m = miembros.find(m => m.id === asig.miembro_id)
    return m ? m.nombre : EMPTY_ASSIGNMENT
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
        exportScope = 'month',
        locale = 'es-ES',
        peopleScope = 'all',
        extraG1Roles = [],
    }, ref) {
        const servicios = serviciosProp ?? plan.servicios
        const isWeekExport = exportScope === 'week'
        const collaboratorsOnly = isCollaboratorsOnlyExport(peopleScope)
        const showSacos = exportIncludesSacosRows(peopleScope)
        const showG1 = exportIncludesGroup1(peopleScope)
        const { asignaciones } = plan
        const roleLabels: Record<string, string> = {
            realiza: labels.realiza,
            apoyo: labels.apoyo,
            vigilancia: labels.vigilancia,
            primera_vez: labels.primeraVez,
            segunda_tercera_vez: labels.segundaTerceraVez,
            imposicion_manos: labels.imposicionManos,
        }
        // Roles G1 a pintar: los 3 clásicos + los extra seleccionados (en orden canónico).
        const g1Keys: string[] = [
            ...ROLES_G1_KEYS,
            ...EXTRA_G1_ORDER.filter(k => extraG1Roles.includes(k)),
        ]

        const layoutWidth = exportImageLayoutWidthPx(servicios.length, exportScope)
        const periodLabel = formatExportPeriodLabel(mesTitulo, anio)

        const creationDate = new Date().toLocaleDateString(locale, {
            day: '2-digit', month: 'long', year: 'numeric',
        })

        const weekLeftBorder = (idx: number): React.CSSProperties =>
            !isWeekExport && idx % 3 === 0 && idx > 0
                ? { borderLeft: `2px solid ${EXPORT_CELL.weekBorder}` }
                : {}

        // Semanal: misma tabla que el mensual, compactada a formato vertical (~1080px),
        // con tipografías y paddings ampliados para lectura en móvil.
        const wk = <T,>(weekVal: T, monthVal: T): T => (isWeekExport ? weekVal : monthVal)

        return (
            <div
                ref={ref}
                style={{
                    width: layoutWidth,
                    minWidth: layoutWidth,
                    backgroundColor: IDMJI_BRAND.pageBg,
                    fontFamily: IDMJI_BRAND.fontFamily,
                    padding: isWeekExport ? '44px 46px 48px' : '28px 32px 32px',
                    boxSizing: 'border-box',
                    color: IDMJI_BRAND.text,
                }}
            >
                <div
                    style={{
                        backgroundColor: IDMJI_BRAND.surface,
                        borderRadius: isWeekExport ? 16 : 14,
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
                                fontSize: wk(16, 11),
                            }}
                        >
                            <thead>
                                {/* Fila de encabezados de servicio */}
                                <tr>
                                    <th
                                        style={{
                                            ...thBase,
                                            width: wk(230, 145),
                                            backgroundColor: IDMJI_BRAND.tableMeta,
                                            color: '#fff',
                                            textAlign: 'left',
                                            padding: wk('14px 22px', '9px 14px'),
                                            fontWeight: 800,
                                            fontSize: wk(14, 10),
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
                                                    padding: wk('12px 8px', '7px 6px'),
                                                    textAlign: 'center',
                                                    ...weekLeftBorder(idx),
                                                }}
                                            >
                                                <div style={{ fontWeight: 800, fontSize: wk(14, 10) }}>
                                                    {getDayShort(srv.dia_tipo, labels)}
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: wk(18, 11) }}>
                                                    {getFechaLabel(srv.fecha, locale)}
                                                </div>
                                                {col.badgeBg && (
                                                    <div
                                                        style={{
                                                            fontSize: wk(12, 9),
                                                            fontWeight: 700,
                                                            backgroundColor: col.badgeBg,
                                                            color: col.seqText,
                                                            borderRadius: 10,
                                                            padding: wk('3px 12px', '2px 7px'),
                                                            marginTop: wk(5, 3),
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
                                                fontSize: wk(14, 10),
                                                padding: wk('11px 22px', '6px 14px'),
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
                                                        fontSize: wk(18, 12),
                                                        color: col.seqText,
                                                        padding: wk('11px 6px', '6px 4px'),
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
                                {showG1 ? g1Keys.map((key, rIdx) => {
                                    const sCol = SERVICE_EXPORT_COLORS.jueves
                                    return (
                                        <tr key={key}>
                                            <td
                                                style={{
                                                    ...tdBase,
                                                    backgroundColor: rIdx % 2 === 0 ? sCol.labelBgEven : sCol.labelBgOdd,
                                                    fontWeight: 700,
                                                    color: sCol.labelText,
                                                    padding: wk('13px 22px', '8px 14px'),
                                                    fontSize: wk(14, 10),
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
                                                        padding: wk('13px 8px', '8px 4px'),
                                                        fontSize: wk(16, 11),
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
                                            style={{ height: wk(4, 3), backgroundColor: EXPORT_CELL.divider, padding: 0 }}
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
                                                    padding: wk('13px 22px', '8px 14px'),
                                                    fontSize: wk(14, 10),
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
                                                        padding: wk('13px 8px', '8px 4px'),
                                                        fontSize: wk(16, 11),
                                                        fontWeight: 600,
                                                        color: IDMJI_BRAND.text,
                                                        ...weekLeftBorder(idx),
                                                    }}
                                                >
                                                    {rolGrupo2AplicaEnTurno(key, srv.dia_tipo)
                                                        ? getMiembroNombre(miembros, asignaciones, srv.id, key)
                                                        : EMPTY_ASSIGNMENT}
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
                                            fontSize: wk(12, 9),
                                            padding: wk('9px 22px', '6px 14px'),
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
                                                fontSize: wk(13, 10),
                                                padding: wk('9px 6px', '6px 4px'),
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
                            padding: isWeekExport ? '18px 36px 20px' : '11px 24px 13px',
                            display: 'flex',
                            justifyContent: collaboratorsOnly ? 'center' : 'space-between',
                            alignItems: 'center',
                            gap: 16,
                        }}
                    >
                        <div
                            style={{
                                fontSize: isWeekExport ? 14 : 9,
                                color: IDMJI_BRAND.textMuted,
                                fontWeight: 600,
                                textAlign: collaboratorsOnly ? 'center' : 'left',
                            }}
                        >
                            {labels.footer}{' · '}{creationDate}
                        </div>
                        {!collaboratorsOnly ? (
                            <div style={{ fontSize: isWeekExport ? 13 : 9, color: IDMJI_BRAND.textSecondary, fontWeight: 600, textAlign: 'right' }}>
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
