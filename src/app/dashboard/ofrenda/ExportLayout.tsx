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
    sectionLabel?: string
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

function getServiceBadge(srv: OfrServicio, labels: OfrendaExportLabels): string | null {
    if (srv.dia_tipo === 'domingo') return labels.manana
    if (srv.dia_tipo === 'domingo_tarde') return labels.tarde
    return null
}

function getServiceTitle(
    srv: OfrServicio,
    labels: OfrendaExportLabels,
    locale: 'es-ES' | 'ca-ES',
): string {
    return `${getDayShort(srv.dia_tipo, labels)} ${getFechaLabel(srv.fecha, locale)}`
}

const WEEK_ROLE_ACCENT: Record<string, { chip: string }> = {
    realiza: { chip: SERVICE_EXPORT_COLORS.jueves.headerBg },
    apoyo: { chip: '#1a6b52' },
    vigilancia: { chip: '#0d5c44' },
    primera_vez: { chip: '#4a3278' },
    segunda_tercera_vez: { chip: '#4a3278' },
    imposicion_manos: { chip: '#4a3278' },
    colaborador_1: { chip: IDMJI_BRAND.navy },
    colaborador_2: { chip: IDMJI_BRAND.navy },
    colaborador_3: { chip: IDMJI_BRAND.navy },
    secuencia: { chip: IDMJI_BRAND.gold },
    semana: { chip: IDMJI_BRAND.tableMeta },
}

function WeeklyRoleChip({ roleKey, label }: { roleKey: string; label: string }) {
    const acc = WEEK_ROLE_ACCENT[roleKey] ?? WEEK_ROLE_ACCENT.colaborador_1
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 31,
                borderRadius: 10,
                padding: '7px 14px',
                backgroundColor: acc.chip,
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                lineHeight: 1.1,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
            }}
        >
            {label}
        </span>
    )
}

function WeeklyAssignmentRow({
    roleKey,
    label,
    value,
    zebra,
}: {
    roleKey: string
    label: string
    value: string
    zebra: boolean
}) {
    const isEmptyAssignment = value === EMPTY_ASSIGNMENT

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(250px, 0.8fr) minmax(0, 1fr)',
                alignItems: 'center',
                gap: 26,
                padding: '18px 24px',
                borderTop: `1px solid ${IDMJI_BRAND.borderLight}`,
                backgroundColor: zebra ? '#f6f8fb' : '#ffffff',
            }}
        >
            <WeeklyRoleChip roleKey={roleKey} label={label} />
            <span
                style={{
                    fontSize: 22,
                    fontWeight: isEmptyAssignment ? 600 : 750,
                    color: isEmptyAssignment ? '#8a94a6' : IDMJI_BRAND.text,
                    textAlign: 'right',
                    lineHeight: 1.2,
                    overflowWrap: 'anywhere',
                    minWidth: 0,
                }}
            >
                {value}
            </span>
        </div>
    )
}

function WeeklyBody({
    plan,
    miembros,
    servicios,
    labels,
    roleLabels,
    g1Keys,
    showG1,
    showSacos,
    locale,
}: {
    plan: PlanCompleto
    miembros: OfrMiembro[]
    servicios: OfrServicio[]
    labels: OfrendaExportLabels
    roleLabels: Record<string, string>
    g1Keys: string[]
    showG1: boolean
    showSacos: boolean
    locale: 'es-ES' | 'ca-ES'
}) {
    const { asignaciones } = plan
    const collaboratorLabels: Record<(typeof ROLES_G2_KEYS)[number], string> = {
        colaborador_1: labels.colaborador1,
        colaborador_2: labels.colaborador2,
        colaborador_3: labels.colaborador3,
    }
    return (
        <div style={{ padding: '30px 34px 34px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {servicios.map(srv => {
                const col = SERVICE_EXPORT_COLORS[srv.dia_tipo]
                const badge = getServiceBadge(srv, labels)
                const rows: Array<{ key: string; label: string; value: string }> = []

                if (showSacos) {
                    rows.push({ key: 'secuencia', label: labels.secuencia, value: srv.secuencia_texto })
                }
                if (showG1) {
                    rows.push(...g1Keys.map(key => ({
                        key,
                        label: roleLabels[key],
                        value: getMiembroNombre(miembros, asignaciones, srv.id, key),
                    })))
                }
                rows.push(...ROLES_G2_KEYS
                    .filter(key => rolGrupo2AplicaEnTurno(key, srv.dia_tipo))
                    .map(key => ({
                        key,
                        label: collaboratorLabels[key],
                        value: getMiembroNombre(miembros, asignaciones, srv.id, key),
                    })))

                return (
                    <section
                        key={srv.id}
                        style={{
                            border: `1px solid ${IDMJI_BRAND.borderLight}`,
                            borderRadius: 16,
                            overflow: 'hidden',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 4px 14px rgba(31,46,133,0.07)',
                        }}
                    >
                        <div style={{ height: 6, backgroundColor: col.headerBg }} />
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 22,
                                padding: '18px 24px',
                                backgroundColor: IDMJI_BRAND.navy,
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                                    {getServiceTitle(srv, labels, locale)}
                                </div>
                                <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: '#c9d3ee' }}>
                                    {labels.semanaIso} S{srv.semana_iso}
                                </div>
                            </div>
                            {badge ? (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 999,
                                        padding: '7px 14px',
                                        backgroundColor: col.badgeBg ?? 'rgba(255,255,255,0.12)',
                                        color: col.seqText,
                                        fontSize: 14,
                                        fontWeight: 800,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {badge}
                                </span>
                            ) : null}
                        </div>
                        <div>
                            {rows.map((row, idx) => (
                                <WeeklyAssignmentRow
                                    key={`${srv.id}-${row.key}`}
                                    roleKey={row.key}
                                    label={row.label}
                                    value={row.value}
                                    zebra={idx % 2 === 1}
                                />
                            ))}
                        </div>
                    </section>
                )
            })}
        </div>
    )
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
        sectionLabel,
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
                    {sectionLabel ? (
                        <div style={{ backgroundColor: '#dbeefb', padding: isWeekExport ? '18px 42px 0' : '14px 28px 0' }}>
                            <div
                                style={{
                                    minHeight: isWeekExport ? 54 : 44,
                                    borderRadius: 10,
                                    backgroundColor: '#009b6a',
                                    border: '3px solid rgba(255,255,255,0.96)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: isWeekExport ? 18 : 12,
                                    fontWeight: 800,
                                }}
                            >
                                {sectionLabel}
                            </div>
                        </div>
                    ) : null}

                    {isWeekExport ? (
                        <WeeklyBody
                            plan={plan}
                            miembros={miembros}
                            servicios={servicios}
                            labels={labels}
                            roleLabels={roleLabels}
                            g1Keys={g1Keys}
                            showG1={showG1}
                            showSacos={showSacos}
                            locale={locale}
                        />
                    ) : (
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
                                                    {getFechaLabel(srv.fecha, locale)}
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
                    )}

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
