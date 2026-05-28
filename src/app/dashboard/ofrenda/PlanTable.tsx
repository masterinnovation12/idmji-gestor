'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { updateAsignacion, updateSecuenciaServicio } from './actions'
import type { PlanCompleto, OfrMiembro, OfrServicio, OfrAsignacion } from './actions'

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

const ROLES_G1 = [
    { key: 'realiza',    label: 'Realiza labor'    },
    { key: 'apoyo',      label: 'Apoyo'            },
    { key: 'vigilancia', label: 'Vig. Orientación' },
] as const

const ROLES_G2 = [
    { key: 'colaborador_1', label: 'Colaborador 1' },
    { key: 'colaborador_2', label: 'Colaborador 2' },
    { key: 'colaborador_3', label: 'Colaborador 3' },
] as const

const ALL_ROLES = [...ROLES_G1, ...ROLES_G2]

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

function formatFecha(
    fecha: string,
    diaTipo: 'jueves' | 'domingo' | 'domingo_tarde'
): { dia: string; numero: string; mes: string } {
    const d = new Date(fecha + 'T00:00:00')
    const diaNombre = diaTipo === 'jueves' ? 'Jue' : 'Dom'
    return {
        dia: diaNombre,
        numero: format(d, 'd', { locale: es }),
        mes: format(d, 'MMM', { locale: es }),
    }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PlanTable({ plan, miembros, canEdit, onAsignacionChange }: Readonly<PlanTableProps>) {
    const { servicios, asignaciones } = plan
    const [currentPage, setCurrentPage] = useState(0)

    // Agrupar servicios en semanas (grupos de 3: Jue + DomM + DomT)
    const weeks: OfrServicio[][] = []
    for (let i = 0; i < servicios.length; i += 3) {
        weeks.push(servicios.slice(i, i + 3))
    }
    const weeksCount = weeks.length
    const visibleWeek = weeks[currentPage] ?? []

    return (
        <div className="space-y-4">
            {/* ── Navegación mobile por semana ─────────────────────────── */}
            <div className="flex items-center justify-between lg:hidden">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Semana {currentPage + 1} de {weeksCount}
                </span>
                <div className="flex gap-1">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 touch-manipulation"
                        aria-label="Semana anterior"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(weeksCount - 1, p + 1))}
                        disabled={currentPage >= weeksCount - 1}
                        className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 touch-manipulation"
                        aria-label="Semana siguiente"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Vista MOBILE: 3 tarjetas apiladas por semana ────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="lg:hidden space-y-3"
                >
                    {visibleWeek.map(srv => (
                        <ServicioCard
                            key={`${srv.id}-${srv.dia_tipo}`}
                            servicio={srv}
                            asignaciones={asignaciones}
                            miembros={miembros}
                            canEdit={canEdit}
                            onAsignacionChange={onAsignacionChange}
                        />
                    ))}
                </motion.div>
            </AnimatePresence>

            {/* ── Indicador de páginas mobile ────────────────────────── */}
            <div className="flex justify-center gap-1.5 lg:hidden">
                {Array.from({ length: weeksCount }, (_, i) => i).map((i) => (
                    <button
                        key={`semana-${i + 1}`}
                        onClick={() => setCurrentPage(i)}
                        className={`h-2 rounded-full transition-all touch-manipulation ${
                            i === currentPage ? 'bg-emerald-500 w-5' : 'bg-border w-2'
                        }`}
                        aria-label={`Ir a semana ${i + 1}`}
                    />
                ))}
            </div>

            {/* ── Vista DESKTOP: tabla plana con separadores de semana ── */}
            <div className="hidden lg:block overflow-x-auto rounded-2xl border border-border/50">
                <table className="text-sm border-collapse" style={{ minWidth: '100%' }}>
                    <thead>
                        {/* Fila 1: Encabezado de fechas */}
                        <tr>
                            <th className="px-3 py-2.5 text-left text-xs font-black text-muted-foreground bg-muted/40 border-b border-border/50 w-36 sticky left-0 z-10 whitespace-nowrap">
                                Rol / Fecha
                            </th>
                            {servicios.map((srv, idx) => {
                                const { dia, numero, mes: mesLabel } = formatFecha(srv.fecha, srv.dia_tipo)
                                const col = TIPO_COLORS[srv.dia_tipo]
                                const isWeekStart = idx % 3 === 0 && idx > 0
                                return (
                                    <th
                                        key={`${srv.id}-hdr`}
                                        className={`px-2 py-2 text-center border-b border-border/50 ${isWeekStart ? 'border-l-2 border-l-border' : ''} ${getThBg(srv.dia_tipo)}`}
                                    >
                                        <div className={`text-[11px] font-black whitespace-nowrap ${col.label}`}>
                                            {dia} {numero}-{mesLabel}
                                        </div>
                                        {srv.dia_tipo !== 'jueves' && (
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${col.badge}`}>
                                                {srv.dia_tipo === 'domingo' ? 'Mañana' : 'Tarde'}
                                            </span>
                                        )}
                                    </th>
                                )
                            })}
                        </tr>
                        {/* Fila 2: Sacos */}
                        <tr>
                            <td className="px-3 py-1.5 text-left text-[11px] font-black text-muted-foreground bg-muted/30 border-b border-border/50 sticky left-0 z-10">
                                Sacos
                            </td>
                            {servicios.map((srv, idx) => {
                                const col = TIPO_COLORS[srv.dia_tipo]
                                const isWeekStart = idx % 3 === 0 && idx > 0
                                return (
                                    <td
                                        key={`${srv.id}-seq`}
                                        className={`px-1 py-1.5 text-center border-b border-border/50 ${isWeekStart ? 'border-l-2 border-l-border' : ''} ${getSeqBg(srv.dia_tipo)}`}
                                    >
                                        <SecuenciaCell
                                            servicio={srv}
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
                        {ROLES_G1.map(({ key, label }, ri) => {
                            const g1m = miembros.filter(m => m.grupo === 1 && m.activo)
                            return (
                                <tr key={`g1-${key}`} className={ri % 2 === 0 ? 'bg-emerald-500/2' : ''}>
                                    <td className="px-3 py-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border-b border-border/50 bg-emerald-500/3 sticky left-0 z-10 whitespace-nowrap">
                                        {label}
                                    </td>
                                    {servicios.map((srv, idx) => {
                                        const asig = getAsig(asignaciones, srv.id, key)
                                        const isWeekStart = idx % 3 === 0 && idx > 0
                                        return (
                                            <td key={`${srv.id}-${key}`} className={`px-1 py-1.5 text-center border-b border-border/50 ${isWeekStart ? 'border-l-2 border-l-border' : ''}`}>
                                                <AsignacionCell
                                                    servicio={srv}
                                                    rol={key}
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
                        {ROLES_G2.map(({ key, label }, ri) => {
                            const g2m = miembros.filter(m => m.grupo === 2 && m.activo)
                            return (
                                <tr key={`g2-${key}`} className={ri % 2 === 0 ? 'bg-blue-500/2' : ''}>
                                    <td className="px-3 py-2 text-[11px] font-semibold text-blue-700 dark:text-blue-300 border-b border-border/50 bg-blue-500/3 sticky left-0 z-10 whitespace-nowrap">
                                        {label}
                                    </td>
                                    {servicios.map((srv, idx) => {
                                        const asig = getAsig(asignaciones, srv.id, key)
                                        const isWeekStart = idx % 3 === 0 && idx > 0
                                        return (
                                            <td key={`${srv.id}-${key}`} className={`px-1 py-1.5 text-center border-b border-border/50 ${isWeekStart ? 'border-l-2 border-l-border' : ''}`}>
                                                <AsignacionCell
                                                    servicio={srv}
                                                    rol={key}
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
    )
}

// ─── Tarjeta mobile por servicio ──────────────────────────────────────────────

function ServicioCard({
    servicio,
    asignaciones,
    miembros,
    canEdit,
    onAsignacionChange,
}: Readonly<{
    servicio: OfrServicio
    asignaciones: OfrAsignacion[]
    miembros: OfrMiembro[]
    canEdit: boolean
    onAsignacionChange: () => void
}>) {
    const { dia, numero, mes } = formatFecha(servicio.fecha, servicio.dia_tipo)
    const col = TIPO_COLORS[servicio.dia_tipo]
    const g1Members = miembros.filter(m => m.grupo === 1 && m.activo)
    const g2Members = miembros.filter(m => m.grupo === 2 && m.activo)

    let turnoLabel: string | null = null
    if (servicio.dia_tipo === 'domingo') turnoLabel = 'Mañana'
    else if (servicio.dia_tipo === 'domingo_tarde') turnoLabel = 'Tarde'

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
                        canEdit={canEdit}
                        onAsignacionChange={onAsignacionChange}
                        labelColor={col.label}
                    />
                </div>
            </div>

            {/* Roles G1 */}
            <div className="divide-y divide-border/50 bg-background">
                {ROLES_G1.map(({ key, label }) => {
                    const asig = getAsig(asignaciones, servicio.id, key)
                    return (
                        <div key={key} className="flex items-center justify-between px-4 py-2.5 gap-2">
                            <span className={`text-xs font-semibold shrink-0 w-28 ${col.label}`}>
                                {label}
                            </span>
                            <AsignacionCell
                                servicio={servicio}
                                rol={key}
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
                {ROLES_G2.map(({ key, label }) => {
                    const asig = getAsig(asignaciones, servicio.id, key)
                    return (
                        <div key={key} className="flex items-center justify-between px-4 py-2 gap-2">
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0 w-28">
                                {label}
                            </span>
                            <AsignacionCell
                                servicio={servicio}
                                rol={key}
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
    miembroId: string | null
    isOverride: boolean
    miembros: OfrMiembro[]
    canEdit: boolean
    onChanged: () => void
}

// ─── Celda de asignación editable (dropdown via Portal para evitar overflow-clip) ─

function AsignacionCell({
    servicio,
    rol,
    miembroId,
    isOverride,
    miembros,
    canEdit,
    onChanged,
}: Readonly<AsignacionCellProps>) {
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [localId, setLocalId] = useState(miembroId)
    const [localOverride, setLocalOverride] = useState(isOverride)
    const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null)
    const btnRef  = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const nombre  = miembros.find(m => m.id === localId)?.nombre ?? '—'

    // Sync con props externas
    useEffect(() => {
        setLocalId(miembroId)
        setLocalOverride(isOverride)
    }, [miembroId, isOverride])

    // Calcular posición del panel al abrirse
    const handleOpen = useCallback(() => {
        if (!btnRef.current) return
        const r = btnRef.current.getBoundingClientRect()
        const panelH = 310  // estimado máx del panel
        const panelW = 240
        const spaceBelow = window.innerHeight - r.bottom
        const openUp = spaceBelow < panelH && r.top > panelH

        // Centrar horizontalmente respecto al botón; respetar viewport
        let left = r.left + r.width / 2 - panelW / 2
        if (left + panelW > window.innerWidth - 8) left = window.innerWidth - panelW - 8
        if (left < 8) left = 8

        setDropPos({
            top:    openUp ? r.top - 4 : r.bottom + 6,
            left,
            width:  panelW,
            openUp,
        })
        setOpen(true)
    }, [])

    // Recalcular si el viewport cambia mientras está abierto
    useEffect(() => {
        if (!open) return
        const update = () => {
            if (!btnRef.current) return
            const r = btnRef.current.getBoundingClientRect()
            const panelH = 310
            const panelW = 240
            const spaceBelow = window.innerHeight - r.bottom
            const openUp = spaceBelow < panelH && r.top > panelH
            let left = r.left + r.width / 2 - panelW / 2
            if (left + panelW > window.innerWidth - 8) left = window.innerWidth - panelW - 8
            if (left < 8) left = 8
            setDropPos({ top: openUp ? r.top - 4 : r.bottom + 6, left, width: panelW, openUp })
        }
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update, true)
            window.removeEventListener('resize', update)
        }
    }, [open])

    // Cerrar al pulsar fuera (botón + panel)
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            const t = e.target as Node
            if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return
            setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const handleSelect = useCallback(async (nuevoId: string | null) => {
        setOpen(false)
        if (nuevoId === localId) return
        setSaving(true)
        const prev = localId
        const prevOverride = localOverride
        setLocalId(nuevoId)
        setLocalOverride(true)

        const result = await updateAsignacion(servicio.id, rol, nuevoId)
        setSaving(false)
        if (result.error) {
            toast.error('Error al asignar persona', {
                description: result.error,
                icon: <X className="w-4 h-4 text-red-500" />,
            })
            setLocalId(prev)
            setLocalOverride(prevOverride)
        } else {
            const mNombre = miembros.find(m => m.id === nuevoId)?.nombre ?? 'Sin asignar'
            toast.success('Asignación modificada', {
                description: `Se ha asignado a ${mNombre} para este rol. Se muestra un punto amarillo de modificación manual.`,
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                duration: 4000,
            })
            onChanged()
        }
    }, [localId, localOverride, servicio.id, rol, onChanged, miembros])

    if (!canEdit) {
        return <span className="text-xs font-semibold px-1">{nombre}</span>
    }

    // ── Panel como Portal (escapa de cualquier overflow/stacking context padre) ─
    const panel = open && dropPos ? createPortal(
        <AnimatePresence>
            <motion.div
                key="asig-panel"
                ref={panelRef}
                initial={{ opacity: 0, y: dropPos.openUp ? 6 : -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.13, ease: 'easeOut' }}
                style={{
                    position:        'fixed',
                    zIndex:          9999,
                    top:             dropPos.openUp ? 'auto' : dropPos.top,
                    bottom:          dropPos.openUp ? window.innerHeight - dropPos.top : 'auto',
                    left:            dropPos.left,
                    width:           dropPos.width,
                    pointerEvents:   'auto',
                    // Fondo opaco garantizado — nunca depende de variables CSS del árbol padre
                    backgroundColor: 'hsl(var(--background, 210 40% 98.5%))',
                    color:           'hsl(var(--foreground, 222 47% 11%))',
                    borderRadius:    '1rem',
                    border:          '1px solid hsl(var(--border, 220 13% 91%))',
                    boxShadow:       '0 16px 48px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.12)',
                    overflow:        'hidden',
                }}
                role="listbox"
                aria-label="Seleccionar miembro"
            >
                {/* Cabecera —fondo ligeramente diferenciado, totalmente sólido */}
                <div style={{
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'space-between',
                    padding:         '10px 14px 9px',
                    borderBottom:    '1px solid hsl(var(--border, 220 13% 91%))',
                    backgroundColor: 'hsl(var(--muted, 210 40% 96%))',
                }}>
                    <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'hsl(var(--muted-foreground, 215 16% 47%))' }}>
                            Asignar persona
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                            {nombre === '—' ? 'Sin asignar' : nombre}
                        </p>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        style={{ padding: 4, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: 'hsl(var(--muted-foreground, 215 16% 47%))' }}
                        aria-label="Cerrar"
                    >
                        <X style={{ width: 14, height: 14 }} />
                    </button>
                </div>

                {/* Lista de opciones — fondo sólido en cada fila */}
                <div style={{ maxHeight: 280, overflowY: 'auto', overscrollBehavior: 'contain' }}>
                    {/* Sin asignar */}
                    <button
                        onClick={() => handleSelect(null)}
                        style={{
                            display:         'flex',
                            alignItems:      'center',
                            gap:             10,
                            width:           '100%',
                            padding:         '11px 14px',
                            textAlign:       'left',
                            fontSize:        12,
                            fontWeight:      500,
                            border:          'none',
                            borderBottom:    '1px solid hsl(var(--border, 220 13% 91%))',
                            cursor:          'pointer',
                            backgroundColor: localId === null ? 'hsl(var(--primary, 222 89% 55%) / 0.12)' : 'transparent',
                            color:           localId === null ? 'hsl(var(--primary, 222 89% 55%))' : 'hsl(var(--muted-foreground, 215 16% 47%))',
                        }}
                        role="option"
                        aria-selected={localId === null}
                    >
                        <span style={{ flex: 1 }}>— Sin asignar —</span>
                        {localId === null && <Check style={{ width: 13, height: 13, flexShrink: 0 }} />}
                    </button>

                    {miembros.map((m, idx) => {
                        const isSelected = m.id === localId
                        return (
                            <button
                                key={m.id}
                                onClick={() => handleSelect(m.id)}
                                style={{
                                    display:         'flex',
                                    alignItems:      'center',
                                    gap:             10,
                                    width:           '100%',
                                    padding:         '11px 14px',
                                    textAlign:       'left',
                                    fontSize:        12,
                                    fontWeight:      isSelected ? 700 : 600,
                                    border:          'none',
                                    borderBottom:    idx < miembros.length - 1 ? '1px solid hsl(var(--border, 220 13% 91%) / 0.5)' : 'none',
                                    cursor:          'pointer',
                                    backgroundColor: isSelected ? 'hsl(var(--primary, 222 89% 55%))' : 'transparent',
                                    color:           isSelected ? '#fff' : 'hsl(var(--foreground, 222 47% 11%))',
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                                role="option"
                                aria-selected={isSelected}
                            >
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nombre}</span>
                                {isSelected && <Check style={{ width: 13, height: 13, flexShrink: 0 }} />}
                            </button>
                        )
                    })}
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    ) : null

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleOpen}
                disabled={saving}
                className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                    border transition-all touch-manipulation min-h-[32px]
                    ${getCellClass(localId, localOverride)}
                    ${saving ? 'opacity-50 cursor-wait' : 'hover:shadow-sm'}
                `}
                aria-label={`Cambiar asignación de ${rol} en ${servicio.fecha} ${servicio.dia_tipo}`}
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                {saving && (
                    <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                )}
                {!saving && localOverride && localId && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-label="Modificado manualmente" />
                )}
                <span className="truncate max-w-[90px]">{nombre}</span>
            </button>
            {panel}
        </>
    )
}

// ─── Celda de secuencia editable ───────────────────────────────────────────────

function SecuenciaCell({
    servicio,
    canEdit,
    onAsignacionChange,
    labelColor,
}: Readonly<{
    servicio: OfrServicio
    canEdit: boolean
    onAsignacionChange: () => void
    labelColor: string
}>) {
    const [editing, setEditing]           = useState(false)
    const [desde, setDesde]               = useState(String(servicio.secuencia_desde))
    const [hasta, setHasta]               = useState(String(servicio.secuencia_hasta))
    const [displayTexto, setDisplayTexto] = useState(servicio.secuencia_texto)
    const [saving, setSaving]             = useState(false)
    const fromRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setDesde(String(servicio.secuencia_desde))
        setHasta(String(servicio.secuencia_hasta))
        setDisplayTexto(servicio.secuencia_texto)
    }, [servicio.secuencia_desde, servicio.secuencia_hasta, servicio.secuencia_texto])

    const handleSave = async () => {
        const d = Number.parseInt(desde, 10)
        const h = Number.parseInt(hasta, 10)
        if (Number.isNaN(d) || Number.isNaN(h) || d < 1 || d > 20 || h < 1 || h > 20) {
            toast.error('Valores no válidos', {
                description: 'Los rangos de saco deben estar comprendidos entre 1 y 20.',
                icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
            })
            return
        }
        setSaving(true)
        const nuevoTexto = `${String(d).padStart(2, '0')} al ${String(h).padStart(2, '0')}`
        const prevTexto = displayTexto

        setDisplayTexto(nuevoTexto)
        setEditing(false)

        const result = await updateSecuenciaServicio(servicio.id, d, h)
        setSaving(false)
        if (result.error) {
            toast.error('Error al actualizar secuencia', {
                description: result.error,
                icon: <X className="w-4 h-4 text-red-500" />,
            })
            setDisplayTexto(prevTexto)
        } else {
            toast.success('Secuencia actualizada', {
                description: `Se ha guardado la secuencia de sacos de ${nuevoTexto} para este servicio.`,
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                duration: 4000,
            })
            onAsignacionChange()
        }
    }

    if (!canEdit) {
        return (
            <span className={`text-xs font-black font-mono ${labelColor}`}>
                {displayTexto}
            </span>
        )
    }

    if (!editing) {
        return (
            <button
                onClick={() => { setEditing(true); setTimeout(() => fromRef.current?.focus(), 50) }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black font-mono hover:bg-black/10 dark:hover:bg-white/10 transition-colors touch-manipulation ${labelColor}`}
                title="Editar secuencia de sacos"
                aria-label={`Secuencia: ${displayTexto}. Clic para editar`}
            >
                {saving ? (
                    <div className="w-2.5 h-2.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                    <RotateCcw className="w-2.5 h-2.5 opacity-40" />
                )}
                {displayTexto}
            </button>
        )
    }

    return (
        <div className="flex items-center gap-1" aria-label="Editar secuencia de sacos">
            <input
                ref={fromRef}
                type="number"
                min={1}
                max={20}
                value={desde}
                onChange={e => setDesde(e.target.value)}
                className="w-10 text-center text-xs font-mono border border-border rounded-lg p-1 bg-background outline-none focus:ring-1 focus:ring-primary/50"
                aria-label="Saco inicial"
            />
            <span className="text-xs text-muted-foreground" aria-hidden="true">al</span>
            <input
                type="number"
                min={1}
                max={20}
                value={hasta}
                onChange={e => setHasta(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') {
                        setEditing(false)
                        setDesde(String(servicio.secuencia_desde))
                        setHasta(String(servicio.secuencia_hasta))
                    }
                }}
                className="w-10 text-center text-xs font-mono border border-border rounded-lg p-1 bg-background outline-none focus:ring-1 focus:ring-primary/50"
                aria-label="Saco final"
            />
            <button
                onClick={handleSave}
                disabled={saving}
                className="p-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 touch-manipulation"
                aria-label="Guardar secuencia"
            >
                {saving ? (
                    <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : (
                    <Check className="w-3 h-3" />
                )}
            </button>
        </div>
    )
}

// Re-export ALL_ROLES for use in other components
export { ALL_ROLES }
