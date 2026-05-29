'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import type { Locale } from 'date-fns'
import { Check, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useOfrendaToast } from './ofrendaFeedback'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { updateAsignacion, updateSecuenciaServicio } from './actions'
import type { PlanCompleto, OfrMiembro, OfrServicio, OfrAsignacion } from './actions'
import { getDateFnsLocale, interpolate } from './ofrendaLocale'
import { PersonaPicker } from './PersonaPicker'
import { SecuenciaEditor } from './SecuenciaEditor'
import {
    formatSecuenciaRange,
    getMaxSacosForDiaTipo,
    getSecuenciaMaximo,
    validateSecuenciaSacos,
} from './secuenciaSacosLimits'
import {
    countFollowingServicios,
    type SecuenciaApplyScope,
} from './secuenciaPropagation'
import { MobileWeekPager } from './MobileWeekPager'
import { DesktopWeekNavigator } from './DesktopWeekNavigator'
import { useOfrendaMobileOrTablet } from './OfrendaLiquidShell'
import {
    PLAN_ROLE_COL_STYLE,
    PLAN_SERVICE_COL_STYLE,
    planTableMinWidthPx,
    PLAN_SERVICE_COL_WIDTH_PX,
} from './planTableLayout'
import {
    scrollLeftForWeekIndex,
    weekIndexFromScrollLeft,
} from './planTableScroll'
import './ofrenda-plan-desktop.css'

const STICKY_ROLE_HEADER_CLASS =
    'ofrenda-plan-sticky-role px-3 py-3 text-left text-sm font-black text-[#1f2e85] dark:text-[#e8d9a8] border-b border-border/50 whitespace-nowrap'
const STICKY_ROLE_CELL_CLASS =
    'ofrenda-plan-sticky-role ofrenda-plan-sticky-role--body px-3 py-2.5 text-sm font-semibold border-b border-border/50 whitespace-nowrap'

const COL_WIDTH_PX = PLAN_SERVICE_COL_WIDTH_PX

// ─── Esquema de colores por tipo de día ────────────────────────────────────────

const TIPO_COLORS = {
    jueves: {
        border:  'border-emerald-500/30',
        header:  'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
        badge:   'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        label:   'text-emerald-700 dark:text-emerald-300',
        thBg:    '#064e3b',
        seqBg:   '#ecfdf5',
        seqText: '#065f46',
    },
    domingo: {
        border:  'border-blue-500/30',
        header:  'bg-blue-500/10 text-blue-800 dark:text-blue-200',
        badge:   'bg-blue-500/20 text-blue-700 dark:text-blue-300',
        label:   'text-blue-700 dark:text-blue-300',
        thBg:    '#1e3a5f',
        seqBg:   '#eff6ff',
        seqText: '#1e40af',
    },
    domingo_tarde: {
        border:  'border-violet-500/30',
        header:  'bg-violet-500/10 text-violet-800 dark:text-violet-200',
        badge:   'bg-violet-500/20 text-violet-700 dark:text-violet-300',
        label:   'text-violet-700 dark:text-violet-300',
        thBg:    '#3b0764',
        seqBg:   '#f5f3ff',
        seqText: '#5b21b6',
    },
} as const

// ─── Helpers de estilo ────────────────────────────────────────────────────────

function getCellClass(localId: string | null, isOverride: boolean): string {
    if (!localId) return 'bg-muted/30 border-dashed border-border text-muted-foreground'
    if (isOverride) return 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200'
    return 'bg-muted/50 border-border hover:border-primary/40 text-foreground'
}

type DiaTipoLocal = 'jueves' | 'domingo' | 'domingo_tarde'

function getThBg(tipo: DiaTipoLocal): string {
    if (tipo === 'jueves') return 'bg-emerald-500/10'
    if (tipo === 'domingo') return 'bg-blue-500/10'
    return 'bg-violet-500/10'
}

function getSeqBg(tipo: DiaTipoLocal): string {
    if (tipo === 'jueves') return 'bg-emerald-500/5'
    if (tipo === 'domingo') return 'bg-blue-500/5'
    return 'bg-violet-500/5'
}

function getRowBg(tipo: DiaTipoLocal, even: boolean): string {
    if (tipo === 'jueves') return even ? 'bg-emerald-500/2' : ''
    if (tipo === 'domingo') return even ? 'bg-blue-500/2' : ''
    return even ? 'bg-violet-500/2' : ''
}

// ─── Tipos de rol y labels ─────────────────────────────────────────────────────

const ROLES_G1_KEYS = ['realiza', 'apoyo', 'vigilancia'] as const
const ROLES_G2_KEYS = ['colaborador_1', 'colaborador_2', 'colaborador_3'] as const

// ─── Props ─────────────────────────────────────────────────────────────────────

interface PlanTableProps {
    plan: PlanCompleto
    miembros: OfrMiembro[]
    canEdit: boolean
    onAsignacionChange: () => void
}


// ─── Helper: asignación para un servicio y rol ─────────────────────────────────

function getAsig(
    asignaciones: OfrAsignacion[],
    servicioId: string,
    rol: string
): OfrAsignacion | undefined {
    return asignaciones.find(a => a.servicio_id === servicioId && a.rol === rol)
}

// ─── Helper: label del día ─────────────────────────────────────────────────────

function formatWeekRangeLabel(week: OfrServicio[], dateLocale: Locale): string {
    if (week.length === 0) return ''
    const first = new Date(`${week[0].fecha}T00:00:00`)
    const last = new Date(`${week[week.length - 1].fecha}T00:00:00`)
    if (week.length === 1) return format(first, 'd MMM', { locale: dateLocale })
    const sameMonth = first.getMonth() === last.getMonth()
    if (sameMonth) {
        return `${format(first, 'd', { locale: dateLocale })} – ${format(last, 'd MMM', { locale: dateLocale })}`
    }
    return `${format(first, 'd MMM', { locale: dateLocale })} – ${format(last, 'd MMM', { locale: dateLocale })}`
}

function formatFecha(
    fecha: string,
    diaTipo: 'jueves' | 'domingo' | 'domingo_tarde',
    t: (key: import('@/lib/i18n/types').TranslationKey) => string,
    dateLocale: ReturnType<typeof getDateFnsLocale>
): { dia: string; numero: string; mes: string } {
    const d = new Date(fecha + 'T00:00:00')
    const diaNombre = diaTipo === 'jueves' ? t('ofrenda.days.jueShort') : t('ofrenda.days.domShort')
    return {
        dia: diaNombre,
        numero: format(d, 'd', { locale: dateLocale }),
        mes: format(d, 'MMM', { locale: dateLocale }),
    }
}

function useRoleRows() {
    const { t } = useI18n()
    return useMemo(() => ({
        g1: [
            { key: 'realiza' as const, label: t('ofrenda.roles.realiza') },
            { key: 'apoyo' as const, label: t('ofrenda.roles.apoyo') },
            { key: 'vigilancia' as const, label: t('ofrenda.roles.vigilancia') },
        ],
        g2: [
            { key: 'colaborador_1' as const, label: `${t('ofrenda.roles.colaborador')} 1` },
            { key: 'colaborador_2' as const, label: `${t('ofrenda.roles.colaborador')} 2` },
            { key: 'colaborador_3' as const, label: `${t('ofrenda.roles.colaborador')} 3` },
        ],
    }), [t])
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PlanTable({ plan, miembros, canEdit, onAsignacionChange }: Readonly<PlanTableProps>) {
    const { servicios, asignaciones } = plan
    const { t, language } = useI18n()
    const dateLocale = getDateFnsLocale(language)
    const roleRows = useRoleRows()
    const isCompact = useOfrendaMobileOrTablet()
    const [currentPage, setCurrentPage] = useState(0)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    const tableMinWidth = planTableMinWidthPx(servicios.length)

    const weeks = useMemo(() => {
        const chunks: OfrServicio[][] = []
        for (let i = 0; i < servicios.length; i += 3) {
            chunks.push(servicios.slice(i, i + 3))
        }
        return chunks
    }, [servicios])
    const weeksCount = weeks.length
    const visibleWeek = weeks[currentPage] ?? []

    const weekLabel = interpolate(t('ofrenda.week.of'), {
        current: currentPage + 1,
        total: weeksCount,
    })

    const weekRangeLabels = useMemo(
        () => weeks.map((w) => formatWeekRangeLabel(w, dateLocale)),
        [weeks, dateLocale],
    )
    const weekRangeLabel = weekRangeLabels[currentPage] ?? null

    useEffect(() => {
        setCurrentPage(0)
    }, [plan.plan.id, servicios.length])

    /** Evita scroll residual que solapa la 1ª columna de servicio sobre «Rol / Fecha». */
    useEffect(() => {
        if (isCompact) return
        const el = scrollRef.current
        if (!el) return

        if (el.scrollLeft !== 0) {
            el.scrollLeft = 0
        }
        const canScroll = el.scrollWidth - el.clientWidth > 8
        setCanScrollRight((prev) => (prev === canScroll ? prev : canScroll))
    }, [isCompact, plan.plan.id, servicios.length])

    const scrollToWeek = useCallback((weekIndex: number) => {
        const el = scrollRef.current
        if (!el) return
        const targetLeft = scrollLeftForWeekIndex(weekIndex)
        const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth)
        el.scrollTo({ left: Math.min(targetLeft, maxLeft), behavior: 'auto' })
        setCurrentPage(weekIndex)
    }, [])

    const updateScrollHint = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        const canScroll = el.scrollWidth - el.scrollLeft - el.clientWidth > 8
        setCanScrollRight((prev) => (prev === canScroll ? prev : canScroll))
    }, [])

    useEffect(() => {
        if (isCompact) return

        updateScrollHint()
        const el = scrollRef.current
        if (!el) return

        const onScroll = () => {
            const canScroll = el.scrollWidth - el.scrollLeft - el.clientWidth > 8
            setCanScrollRight((prev) => (prev === canScroll ? prev : canScroll))
            if (weeksCount <= 1) return
            const clamped = Math.min(
                weeksCount - 1,
                Math.max(0, weekIndexFromScrollLeft(el.scrollLeft)),
            )
            setCurrentPage((prev) => (prev === clamped ? prev : clamped))
        }

        el.addEventListener('scroll', onScroll, { passive: true })
        const onResize = () => updateScrollHint()
        window.addEventListener('resize', onResize)
        return () => {
            el.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onResize)
        }
    }, [isCompact, servicios.length, updateScrollHint, weeksCount])

    return (
        <div className="space-y-4">
            {/* Leyenda de colores */}
            <div className="flex flex-wrap gap-3 justify-center text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-800" />
                    {t('ofrenda.legend.jueves')}
                </span>
                <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-900" />
                    {t('ofrenda.legend.domManana')}
                </span>
                <span className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-violet-950" />
                    {t('ofrenda.legend.domTarde')}
                </span>
            </div>

            {isCompact ? (
                <MobileWeekPager
                    weeksCount={weeksCount}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    weekLabel={weekLabel}
                    weekRangeLabel={weekRangeLabel}
                >
                    {visibleWeek.map((srv) => (
                        <ServicioCard
                            key={`${srv.id}-${srv.dia_tipo}`}
                            servicio={srv}
                            planServicios={servicios}
                            sacosConfig={plan.plan}
                            asignaciones={asignaciones}
                            miembros={miembros}
                            canEdit={canEdit}
                            onAsignacionChange={onAsignacionChange}
                        />
                    ))}
                </MobileWeekPager>
            ) : (
            <div
                className="ofrenda-plan-desktop-shell relative rounded-2xl overflow-hidden"
                data-testid="ofrenda-plan-desktop"
            >
                <DesktopWeekNavigator
                    weeksCount={weeksCount}
                    currentWeekIndex={currentPage}
                    onWeekSelect={scrollToWeek}
                    weekRangeLabels={weekRangeLabels}
                />
                {canScrollRight && (
                    <div
                        className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-20 bg-linear-to-l from-background to-transparent"
                        aria-hidden
                    />
                )}
                <p className="text-xs text-muted-foreground px-4 py-2.5 border-b border-[rgba(184,150,74,0.15)] bg-[#1f2e85]/[0.04] font-medium tracking-wide">
                    {t('ofrenda.scrollHint')}
                </p>
                <div
                    ref={scrollRef}
                    className="ofrenda-plan-desktop-scroll overflow-x-auto scroll-smooth overscroll-x-contain"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                    data-testid="ofrenda-plan-desktop-scroll"
                >
                <table
                    data-testid="ofrenda-plan-desktop-table"
                    className="text-sm border-separate border-spacing-0"
                    style={{
                        tableLayout: 'fixed',
                        minWidth: tableMinWidth,
                        width: tableMinWidth,
                    }}
                >
                    <colgroup>
                        <col style={{ width: PLAN_ROLE_COL_STYLE.width }} />
                        {servicios.map((srv) => (
                            <col key={`col-${srv.id}`} style={{ width: PLAN_SERVICE_COL_STYLE.width }} />
                        ))}
                    </colgroup>
                    <thead>
                        {/* Fila 1: Encabezado de fechas */}
                        <tr>
                            <th
                                className={STICKY_ROLE_HEADER_CLASS}
                                style={PLAN_ROLE_COL_STYLE}
                                data-testid="ofrenda-plan-sticky-role-header"
                            >
                                {t('ofrenda.table.rolFecha')}
                            </th>
                            {servicios.map((srv, idx) => {
                                const { dia, numero, mes: mesLabel } = formatFecha(srv.fecha, srv.dia_tipo, t, dateLocale)
                                const col = TIPO_COLORS[srv.dia_tipo]
                                const isWeekStart = idx % 3 === 0
                                return (
                                    <th
                                        key={`${srv.id}-hdr`}
                                        className={`px-2 py-2 text-center border-b border-border/50 align-middle ${isWeekStart && idx > 0 ? 'border-l-2 border-l-[rgba(184,150,74,0.35)]' : ''} ${getThBg(srv.dia_tipo)}`}
                                        style={PLAN_SERVICE_COL_STYLE}
                                        data-week-col={isWeekStart ? Math.floor(idx / 3) : undefined}
                                    >
                                        <div className={`text-[11px] font-black whitespace-nowrap ${col.label}`}>
                                            {dia} {numero}-{mesLabel}
                                        </div>
                                        {srv.dia_tipo !== 'jueves' && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${col.badge}`}>
                                                {srv.dia_tipo === 'domingo' ? t('ofrenda.days.manana') : t('ofrenda.days.tarde')}
                                            </span>
                                        )}
                                    </th>
                                )
                            })}
                        </tr>
                        {/* Fila 2: Sacos */}
                        <tr>
                            <td
                                className={`${STICKY_ROLE_HEADER_CLASS} py-2`}
                                style={PLAN_ROLE_COL_STYLE}
                                data-testid="ofrenda-plan-sticky-role-sacos"
                            >
                                {t('ofrenda.table.sacos')}
                            </td>
                            {servicios.map((srv, idx) => {
                                const col = TIPO_COLORS[srv.dia_tipo]
                                const isWeekStart = idx % 3 === 0 && idx > 0
                                return (
                                    <td
                                        key={`${srv.id}-seq`}
                                        className={`px-1 py-1.5 text-center border-b border-border/50 align-middle ${isWeekStart ? 'border-l-2 border-l-border' : ''} ${getSeqBg(srv.dia_tipo)}`}
                                        style={PLAN_SERVICE_COL_STYLE}
                                    >
                                        <SecuenciaCell
                                            servicio={srv}
                                            planServicios={servicios}
                                            sacosConfig={plan.plan}
                                            canEdit={canEdit}
                                            onAsignacionChange={onAsignacionChange}
                                            labelColor={col.label}
                                        />
                                    </td>
                                )
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {/* Grupo 1: Roles */}
                        {roleRows.g1.map(({ key, label }, ri) => {
                            const g1m = miembros.filter(m => m.grupo === 1 && m.activo)
                            return (
                                <tr key={`g1-${key}`} className={ri % 2 === 0 ? 'bg-emerald-500/2' : ''}>
                                    <td
                                        className={`${STICKY_ROLE_CELL_CLASS} text-emerald-700 dark:text-emerald-300`}
                                        style={PLAN_ROLE_COL_STYLE}
                                        data-testid="ofrenda-plan-sticky-role"
                                    >
                                        {label}
                                    </td>
                                    {servicios.map((srv, idx) => {
                                        const asig = getAsig(asignaciones, srv.id, key)
                                        const isWeekStart = idx % 3 === 0 && idx > 0
                                        return (
                                            <td
                                                key={`${srv.id}-${key}`}
                                                className={`px-1 py-1.5 text-center border-b border-border/50 align-middle ${isWeekStart ? 'border-l-2 border-l-border' : ''}`}
                                                style={PLAN_SERVICE_COL_STYLE}
                                            >
                                                <AsignacionCell
                                                    servicio={srv}
                                                    rol={key}
                                                    rolLabel={label}
                                                    turnoLabel={srv.dia_tipo === 'domingo' ? t('ofrenda.days.manana') : srv.dia_tipo === 'domingo_tarde' ? t('ofrenda.days.tarde') : null}
                                                    headerColorClass={TIPO_COLORS[srv.dia_tipo].label}
                                                    miembroId={asig?.miembro_id ?? null}
                                                    isOverride={asig?.es_override ?? false}
                                                    miembros={g1m}
                                                    canEdit={canEdit}
                                                    onChanged={onAsignacionChange}
                                                />
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}

                        {/* Divisor entre grupos */}
                        <tr>
                            <td colSpan={servicios.length + 1} className="h-0.5 bg-border/40" />
                        </tr>

                        {/* Grupo 2: Colaboradores */}
                        {roleRows.g2.map(({ key, label }, ri) => {
                            const g2m = miembros.filter(m => m.grupo === 2 && m.activo)
                            return (
                                <tr key={`g2-${key}`} className={ri % 2 === 0 ? 'bg-blue-500/2' : ''}>
                                    <td
                                        className={`${STICKY_ROLE_CELL_CLASS} text-blue-700 dark:text-blue-300`}
                                        style={PLAN_ROLE_COL_STYLE}
                                        data-testid="ofrenda-plan-sticky-role"
                                    >
                                        {label}
                                    </td>
                                    {servicios.map((srv, idx) => {
                                        const asig = getAsig(asignaciones, srv.id, key)
                                        const isWeekStart = idx % 3 === 0 && idx > 0
                                        return (
                                            <td
                                                key={`${srv.id}-${key}`}
                                                className={`px-1 py-1.5 text-center border-b border-border/50 align-middle ${isWeekStart ? 'border-l-2 border-l-border' : ''}`}
                                                style={PLAN_SERVICE_COL_STYLE}
                                            >
                                                <AsignacionCell
                                                    servicio={srv}
                                                    rol={key}
                                                    rolLabel={label}
                                                    turnoLabel={srv.dia_tipo === 'domingo' ? t('ofrenda.days.manana') : srv.dia_tipo === 'domingo_tarde' ? t('ofrenda.days.tarde') : null}
                                                    headerColorClass={TIPO_COLORS[srv.dia_tipo].label}
                                                    miembroId={asig?.miembro_id ?? null}
                                                    isOverride={asig?.es_override ?? false}
                                                    miembros={g2m}
                                                    canEdit={canEdit}
                                                    onChanged={onAsignacionChange}
                                                />
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
            )}
        </div>
    )
}

// ─── Tarjeta mobile por servicio ──────────────────────────────────────────────

function ServicioCard({
    servicio,
    planServicios,
    sacosConfig,
    asignaciones,
    miembros,
    canEdit,
    onAsignacionChange,
}: Readonly<{
    servicio: OfrServicio
    planServicios: OfrServicio[]
    sacosConfig: PlanCompleto['plan']
    asignaciones: OfrAsignacion[]
    miembros: OfrMiembro[]
    canEdit: boolean
    onAsignacionChange: () => void
}>) {
    const { t, language } = useI18n()
    const dateLocale = getDateFnsLocale(language)
    const roleRows = useRoleRows()
    const { dia, numero, mes } = formatFecha(servicio.fecha, servicio.dia_tipo, t, dateLocale)
    const col = TIPO_COLORS[servicio.dia_tipo]
    const g1Members = miembros.filter(m => m.grupo === 1 && m.activo)
    const g2Members = miembros.filter(m => m.grupo === 2 && m.activo)

    let turnoLabel: string | null = null
    if (servicio.dia_tipo === 'domingo') turnoLabel = t('ofrenda.days.manana')
    else if (servicio.dia_tipo === 'domingo_tarde') turnoLabel = t('ofrenda.days.tarde')

    return (
        <div className={`rounded-2xl border overflow-hidden ${col.border}`}>
            {/* Header */}
            <div className={`px-4 py-3 ${col.header}`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-black text-base">{dia} {numero}-{mes}</span>
                        {turnoLabel && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                                {turnoLabel}
                            </span>
                        )}
                        <span className="text-xs opacity-60">S.{servicio.semana_iso}</span>
                    </div>
                    {/* Secuencia de sacos */}
                    <SecuenciaCell
                        servicio={servicio}
                        planServicios={planServicios}
                        sacosConfig={sacosConfig}
                        canEdit={canEdit}
                        onAsignacionChange={onAsignacionChange}
                        labelColor={col.label}
                    />
                </div>
            </div>

            {/* Roles G1 */}
            <div className="divide-y divide-border/50 bg-background">
                {roleRows.g1.map(({ key, label }) => {
                    const asig = getAsig(asignaciones, servicio.id, key)
                    return (
                        <div key={key} className="flex items-center justify-between px-4 py-2.5 gap-2">
                            <span className={`text-sm font-semibold shrink-0 w-32 ${col.label}`}>
                                {label}
                            </span>
                            <AsignacionCell
                                servicio={servicio}
                                rol={key}
                                rolLabel={label}
                                turnoLabel={turnoLabel}
                                headerColorClass={col.label}
                                miembroId={asig?.miembro_id ?? null}
                                isOverride={asig?.es_override ?? false}
                                miembros={g1Members}
                                canEdit={canEdit}
                                onChanged={onAsignacionChange}
                            />
                        </div>
                    )
                })}
            </div>

            {/* Separador */}
            <div className="h-px bg-border/40" />

            {/* Colaboradores G2 */}
            <div className="divide-y divide-border/50 bg-muted/20">
                {roleRows.g2.map(({ key, label }) => {
                    const asig = getAsig(asignaciones, servicio.id, key)
                    return (
                        <div key={key} className="flex items-center justify-between px-4 py-2 gap-2">
                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 shrink-0 w-32">
                                {label}
                            </span>
                            <AsignacionCell
                                servicio={servicio}
                                rol={key}
                                rolLabel={label}
                                turnoLabel={turnoLabel}
                                headerColorClass={col.label}
                                miembroId={asig?.miembro_id ?? null}
                                isOverride={asig?.es_override ?? false}
                                miembros={g2Members}
                                canEdit={canEdit}
                                onChanged={onAsignacionChange}
                            />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Props de AsignacionCell ───────────────────────────────────────────────────

interface AsignacionCellProps {
    servicio: OfrServicio
    rol: string
    rolLabel: string
    turnoLabel?: string | null
    headerColorClass: string
    miembroId: string | null
    isOverride: boolean
    miembros: OfrMiembro[]
    canEdit: boolean
    onChanged: () => void
}

function AsignacionCell({
    servicio,
    rol,
    rolLabel,
    turnoLabel,
    headerColorClass,
    miembroId,
    isOverride,
    miembros,
    canEdit,
    onChanged,
}: Readonly<AsignacionCellProps>) {
    const { t } = useI18n()
    const feedback = useOfrendaToast()
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [localId, setLocalId] = useState(miembroId)
    const [localOverride, setLocalOverride] = useState(isOverride)
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
    const btnRef = useRef<HTMLButtonElement>(null)
    const nombre = miembros.find(m => m.id === localId)?.nombre ?? '—'

    useEffect(() => {
        setLocalId(miembroId)
        setLocalOverride(isOverride)
    }, [miembroId, isOverride])

    const handleOpen = () => {
        setAnchorRect(btnRef.current?.getBoundingClientRect() ?? null)
        setOpen(true)
    }

    const handleSelect = useCallback(async (nuevoId: string | null) => {
        if (nuevoId === localId) return
        setSaving(true)
        const prev = localId
        const prevOverride = localOverride
        setLocalId(nuevoId)
        setLocalOverride(true)

        const result = await updateAsignacion(servicio.id, rol, nuevoId)
        setSaving(false)
        if (result.error) {
            feedback.quickError(t('ofrenda.toast.assignError'), result.error)
            setLocalId(prev)
            setLocalOverride(prevOverride)
        } else {
            const mNombre = miembros.find(m => m.id === nuevoId)?.nombre ?? t('ofrenda.picker.unassign')
            feedback.quickSuccess(
                t('ofrenda.toast.assignOk'),
                interpolate(t('ofrenda.toast.assignOkDesc'), { name: mNombre })
            )
            onChanged()
        }
    }, [localId, localOverride, servicio.id, rol, onChanged, miembros, t, feedback])

    if (!canEdit) {
        return <span className="text-sm font-semibold px-1">{nombre}</span>
    }

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={handleOpen}
                disabled={saving}
                className={`
                    flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-semibold
                    border transition-all touch-manipulation min-h-[40px]
                    ${getCellClass(localId, localOverride)}
                    ${saving ? 'opacity-50 cursor-wait' : 'hover:shadow-sm'}
                `}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                {saving && (
                    <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                )}
                {!saving && localOverride && localId && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                )}
                <span className="truncate max-w-[110px] lg:max-w-[100px]">{nombre}</span>
            </button>
            <PersonaPicker
                open={open}
                onClose={() => setOpen(false)}
                miembros={miembros}
                selectedId={localId}
                onSelect={handleSelect}
                anchorRect={anchorRect}
                context={{
                    servicio,
                    rolLabel,
                    turnoLabel,
                    headerColorClass,
                }}
            />
        </>
    )
}

function dayConfigLabel(
    diaTipo: OfrServicio['dia_tipo'],
    t: (key: string) => string
): string {
    switch (diaTipo) {
        case 'jueves':
            return t('ofrenda.sacos.jueves')
        case 'domingo':
            return t('ofrenda.sacos.domingo')
        case 'domingo_tarde':
            return t('ofrenda.sacos.domingoTarde')
        default:
            return diaTipo
    }
}

function SecuenciaCell({
    servicio,
    planServicios,
    sacosConfig,
    canEdit,
    onAsignacionChange,
    labelColor,
}: Readonly<{
    servicio: OfrServicio
    planServicios: OfrServicio[]
    sacosConfig: PlanCompleto['plan']
    canEdit: boolean
    onAsignacionChange: () => void
    labelColor: string
}>) {
    const { t } = useI18n()
    const feedback = useOfrendaToast()
    const [open, setOpen] = useState(false)
    const [displayTexto, setDisplayTexto] = useState(servicio.secuencia_texto)
    const [saving, setSaving] = useState(false)

    const secuenciaMaximo = getSecuenciaMaximo(sacosConfig)
    const maxSacos = getMaxSacosForDiaTipo(servicio.dia_tipo, sacosConfig)
    const followingCount = countFollowingServicios(planServicios, servicio.posicion)
    const configDayLabel = dayConfigLabel(servicio.dia_tipo, t)

    useEffect(() => {
        setDisplayTexto(servicio.secuencia_texto)
    }, [servicio.secuencia_texto])

    const showLimitFeedback = (d: number, h: number) => {
        const v = validateSecuenciaSacos(d, h, maxSacos, secuenciaMaximo)
        if (v.ok) return
        const descKey =
            v.reason === 'too_few'
                ? 'ofrenda.sequence.limitTooFewDesc'
                : 'ofrenda.sequence.limitTooManyDesc'
        feedback.planWarning(
            t('ofrenda.sequence.limitMismatch'),
            interpolate(t(descKey), {
                day: configDayLabel,
                required: String(maxSacos),
                count: String(v.count),
                range: formatSecuenciaRange(d, h),
            }),
            0,
        )
    }

    const handleSave = async (d: number, h: number, scope: SecuenciaApplyScope) => {
        const validation = validateSecuenciaSacos(d, h, maxSacos, secuenciaMaximo)
        if (!validation.ok) {
            if (validation.reason === 'bounds') {
                feedback.quickWarning(
                    t('ofrenda.toast.sequenceInvalid'),
                    interpolate(t('ofrenda.toast.sequenceInvalidDesc'), {
                        max: String(secuenciaMaximo),
                    })
                )
            } else if (
                validation.reason === 'too_few' ||
                validation.reason === 'too_many'
            ) {
                showLimitFeedback(d, h)
            }
            return
        }
        setSaving(true)
        const nuevoTexto = `${String(d).padStart(2, '0')} al ${String(h).padStart(2, '0')}`
        const prevTexto = displayTexto
        setDisplayTexto(nuevoTexto)
        setOpen(false)

        const result = await updateSecuenciaServicio(servicio.id, d, h, scope)
        setSaving(false)
        if (result.error) {
            if (
                result.code === 'limit' ||
                result.code === 'too_few' ||
                result.code === 'too_many'
            ) {
                showLimitFeedback(d, h)
            } else {
                feedback.quickError(t('ofrenda.toast.sequenceError'), result.error)
            }
            setDisplayTexto(prevTexto)
        } else {
            const descKey =
                scope === 'forward' && (result.updatedCount ?? 0) > 1
                    ? 'ofrenda.toast.sequenceOkForwardDesc'
                    : 'ofrenda.toast.sequenceOkDesc'
            feedback.quickSuccess(
                t('ofrenda.toast.sequenceOk'),
                interpolate(t(descKey), {
                    range: nuevoTexto,
                    count: String((result.updatedCount ?? 1) - 1),
                })
            )
            onAsignacionChange()
        }
    }

    if (!canEdit) {
        return (
            <span className={`text-sm font-black font-mono ${labelColor}`}>
                {displayTexto}
            </span>
        )
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-black font-mono hover:bg-black/10 dark:hover:bg-white/10 transition-colors touch-manipulation min-h-[36px] ${labelColor}`}
            >
                {saving ? (
                    <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                    <RotateCcw className="w-3 h-3 opacity-40" />
                )}
                {displayTexto}
            </button>
            <SecuenciaEditor
                open={open}
                onClose={() => setOpen(false)}
                servicio={servicio}
                initialDesde={servicio.secuencia_desde}
                initialHasta={servicio.secuencia_hasta}
                displayTexto={displayTexto}
                saving={saving}
                maxSacos={maxSacos}
                secuenciaMaximo={secuenciaMaximo}
                followingCount={followingCount}
                dayConfigLabel={configDayLabel}
                onSave={handleSave}
                onLimitExceeded={showLimitFeedback}
            />
        </>
    )
}
