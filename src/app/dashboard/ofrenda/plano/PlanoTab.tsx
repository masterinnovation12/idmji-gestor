/**
 * PlanoTab.tsx — Pestaña "Plano" de Labor Ofrenda
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Map as MapIcon, AlertTriangle, Loader2, Move } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { interpolate } from '../ofrendaLocale'
import { buildOfrendaFeedbackPayload, useOfrendaToast } from '../ofrendaFeedback'
import { colorDeBloque, getPlanoVista } from './planoData'
import {
    getPlanoData,
    savePlanoAsignacion,
    savePlanoLayout,
    clearPlanoNombres,
    resetPlanoLayout,
    setPlanoPersonaCapacidad,
} from './planoActions'
import { vistaResueltaToElementos } from './planoLayoutSerialize'
import { exportPlanoPng } from './planoExportPng'
import { invokePlanoAction } from './planoInvoke'
import { PlanoCanvas } from './PlanoCanvas'
import { PlanoEditorSheet } from './PlanoEditorSheet'
import { PlanoServiceStrip } from './PlanoServiceStrip'
import { PlanoPersonaCombobox } from './PlanoPersonaCombobox'
import { PlanoBlockLabelEdit } from './PlanoBlockLabelEdit'
import { OfrendaLiquidShell } from '../OfrendaLiquidShell'
import type { PlanCompleto, OfrServicio } from '../actions'
import { pickDefaultServicioId, todayIsoLocal } from './planoDefaultServicio'
import {
    resolverModo,
    sacosParaDia,
    capacidadEncajaRol,
    type PlanoBloque,
    type PlanoCapacidad,
    type PlanoPosicion,
    type PlanoVista,
    type PlanoVistaResuelta,
} from './planoTypes'

type ConfirmAction = 'clear' | 'reset'

interface Props {
    plan: PlanCompleto | null
    tituloMes: string
    canEdit: boolean
    onGoToPlan: () => void
}

const ACCENT: Record<OfrServicio['dia_tipo'], { on: string; off: string; dot: string }> = {
    jueves: {
        on: 'bg-linear-to-br from-emerald-500 to-emerald-700 text-white border-transparent shadow-md shadow-emerald-600/35',
        off: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500/60 hover:bg-emerald-500/10',
        dot: 'bg-emerald-500',
    },
    domingo: {
        on: 'bg-linear-to-br from-sky-500 to-sky-700 text-white border-transparent shadow-md shadow-sky-600/35',
        off: 'border-sky-500/30 text-sky-700 dark:text-sky-300 hover:border-sky-500/60 hover:bg-sky-500/10',
        dot: 'bg-sky-500',
    },
    domingo_tarde: {
        on: 'bg-linear-to-br from-violet-500 to-violet-700 text-white border-transparent shadow-md shadow-violet-600/35',
        off: 'border-violet-500/30 text-violet-700 dark:text-violet-300 hover:border-violet-500/60 hover:bg-violet-500/10',
        dot: 'bg-violet-500',
    },
}

type LayoutStatus = 'idle' | 'saving' | 'saved'

export function PlanoTab({ plan, tituloMes, canEdit, onGoToPlan }: Readonly<Props>) {
    const { t } = useI18n()
    const { quickSuccess, planError, planSuccess, show } = useOfrendaToast()
    const planErrorRef = useRef(planError)
    const quickSuccessRef = useRef(quickSuccess)
    const planSuccessRef = useRef(planSuccess)
    const showRef = useRef(show)
    planErrorRef.current = planError
    quickSuccessRef.current = quickSuccess
    planSuccessRef.current = planSuccess
    showRef.current = show
    // Traduce los códigos de error de auth de las server actions; el resto pasa tal cual.
    const planoErr = useCallback(
        (e?: string) => {
            if (e === 'no_auth') return t('ofrenda.plano.err.noAuth')
            if (e === 'no_permission') return t('ofrenda.plano.err.noPermission')
            return e ?? ''
        },
        [t],
    )
    const [vista, setVista] = useState<PlanoVista>('3d')
    const [planoData, setPlanoData] = useState<PlanoVistaResuelta | null>(null)
    const [planoLoadedFor, setPlanoLoadedFor] = useState<{
        servicioId: string
        modo: NonNullable<ReturnType<typeof resolverModo>>
        vista: PlanoVista
    } | null>(null)
    const [loading, setLoading] = useState(false)
    const [editorOpen, setEditorOpen] = useState(false)
    const [comboboxPos, setComboboxPos] = useState<PlanoPosicion | null>(null)
    const [pendingAssign, setPendingAssign] = useState<{
        pos: PlanoPosicion
        personaId: string
        nombre: string
        capacidad: PlanoCapacidad
    } | null>(null)
    const [blockEdit, setBlockEdit] = useState<PlanoBloque | null>(null)
    const [layoutEditMode, setLayoutEditMode] = useState(false)
    const [dragging, setDragging] = useState(false)
    const canDrag = canEdit && layoutEditMode
    const [layoutStatus, setLayoutStatus] = useState<LayoutStatus>('idle')
    const [exporting, setExporting] = useState(false)
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
    const planoDataRef = useRef(planoData)
    planoDataRef.current = planoData

    const servicios = useMemo(
        () => (plan ? [...plan.servicios].sort((x, y) => x.fecha.localeCompare(y.fecha) || x.posicion - y.posicion) : []),
        [plan],
    )
    const [servicioId, setServicioId] = useState<string | null>(null)
    const planId = plan?.plan.id ?? null
    const planIdRef = useRef<string | null>(null)

    useEffect(() => {
        if (!planId || servicios.length === 0) {
            setServicioId(null)
            planIdRef.current = planId
            return
        }
        if (planIdRef.current !== planId) {
            planIdRef.current = planId
            setServicioId(pickDefaultServicioId(servicios, todayIsoLocal()))
        }
    }, [planId, servicios])

    const effectiveServicioId =
        servicioId ?? pickDefaultServicioId(servicios, todayIsoLocal())
    const servicio = servicios.find(s => s.id === effectiveServicioId) ?? servicios[0] ?? null

    const sacos = plan && servicio ? sacosParaDia(plan.plan, servicio.dia_tipo) : 0
    const modo = resolverModo(sacos)
    const fallbackData = modo ? getPlanoVista(vista, modo) : null

    const servicioIdResolved = servicio?.id ?? null

    useEffect(() => {
        setLayoutEditMode(false)
    }, [servicioIdResolved])

    const displayData = useMemo(() => {
        if (!fallbackData) return null
        const matches =
            planoData &&
            planoLoadedFor?.servicioId === servicioIdResolved &&
            planoLoadedFor.modo === modo &&
            planoLoadedFor.vista === vista
        return matches ? planoData : fallbackData
    }, [planoData, planoLoadedFor, servicioIdResolved, modo, vista, fallbackData])

    useEffect(() => {
        if (!servicioIdResolved || !modo) {
            setPlanoData(null)
            setPlanoLoadedFor(null)
            return
        }

        let cancelled = false
        setLoading(true)
        setLayoutStatus('idle')

        void (async () => {
            try {
                const res = await invokePlanoAction(() =>
                    getPlanoData(servicioIdResolved, vista, modo),
                )
                if (cancelled) return
                const embedded = getPlanoVista(vista, modo)
                const nextData = res.error ? embedded : (res.data?.data ?? embedded)
                if (res.error) planErrorRef.current(planoErr(res.error))
                setPlanoData(nextData)
                setPlanoLoadedFor({ servicioId: servicioIdResolved, modo, vista })
            } catch (err) {
                if (cancelled) return
                planErrorRef.current(
                    err instanceof Error ? err.message : t('ofrenda.plano.loading'),
                )
                setPlanoData(getPlanoVista(vista, modo))
                setPlanoLoadedFor({ servicioId: servicioIdResolved, modo, vista })
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [servicioIdResolved, modo, vista, t, planoErr])

    const reloadPlano = useCallback(async () => {
        if (!servicio || !modo) return
        setLoading(true)
        try {
            const res = await invokePlanoAction(() =>
                getPlanoData(servicio.id, vista, modo),
            )
            const embedded = getPlanoVista(vista, modo)
            if (res.error) {
                planErrorRef.current(planoErr(res.error))
                setPlanoData(embedded)
                setPlanoLoadedFor({ servicioId: servicio.id, modo, vista })
                return
            }
            const nextData = res.data?.data ?? embedded
            setPlanoData(nextData)
            setPlanoLoadedFor({ servicioId: servicio.id, modo, vista })
        } finally {
            setLoading(false)
        }
    }, [servicio, modo, vista, planoErr])

    const patchPlanoData = useCallback((fn: (d: PlanoVistaResuelta) => PlanoVistaResuelta) => {
        setPlanoData(prev => (prev ? fn(prev) : prev))
        setLayoutStatus('idle')
    }, [])

    const notifyLayoutSaved = useCallback(() => {
        showRef.current(
            buildOfrendaFeedbackPayload('success', t('ofrenda.plano.toast.layoutSaved'), undefined, undefined, {
                skipOpenDelay: true,
            }),
        )
        setLayoutStatus('saved')
    }, [t])

    const persistLayout = useCallback(
        async (opts?: { silent?: boolean }) => {
            const data = planoDataRef.current
            if (!canEdit || !data || !modo) return
            setLayoutStatus('saving')
            const res = await invokePlanoAction(() =>
                savePlanoLayout(vista, modo, vistaResueltaToElementos(data)),
            )
            if (res.error) {
                planErrorRef.current(planoErr(res.error))
                setLayoutStatus('idle')
                return
            }
            setLayoutStatus('saved')
            if (!opts?.silent) {
                quickSuccessRef.current(t('ofrenda.plano.toast.layoutSaved'))
            }
        },
        [canEdit, modo, vista, t, planoErr],
    )

    const saveLayoutAfterEdit = useCallback(() => {
        notifyLayoutSaved()
        void persistLayout({ silent: true })
    }, [notifyLayoutSaved, persistLayout])

    const handleDragEnd = useCallback(
        (moved = false) => {
            setDragging(false)
            if (moved && layoutEditMode) saveLayoutAfterEdit()
        },
        [layoutEditMode, saveLayoutAfterEdit],
    )

    const saveAssign = useCallback(
        async (pos: PlanoPosicion, personaId: string | null, nombre: string | null) => {
            if (!servicio) return
            const res = await invokePlanoAction(() =>
                savePlanoAsignacion(servicio.id, pos.bloque, pos.rol, personaId, nombre),
            )
            if (res.error) {
                planErrorRef.current(planoErr(res.error))
                return
            }
            quickSuccessRef.current(t('ofrenda.plano.toast.saved'))
            void reloadPlano()
        },
        [servicio, reloadPlano, t, planoErr],
    )

    const handleAsignacion = async (
        personaId: string | null,
        nombre: string | null,
        capacidad: PlanoCapacidad | null,
        alreadyExisted?: boolean,
    ) => {
        if (!servicio || !comboboxPos) return
        const pos = comboboxPos
        setComboboxPos(null)
        if (alreadyExisted) quickSuccessRef.current(t('ofrenda.plano.combobox.reused'))

        // Limpiar el hueco
        if (!personaId) {
            await saveAssign(pos, null, null)
            return
        }

        // Aviso si la capacidad de la persona no encaja con el rol del hueco
        if (capacidad && !capacidadEncajaRol(capacidad, pos.rol)) {
            setPendingAssign({ pos, personaId, nombre: nombre ?? '', capacidad })
            return
        }

        await saveAssign(pos, personaId, nombre)
    }

    const resolvePendingAssign = async (mode: 'once' | 'permanent') => {
        if (!pendingAssign) return
        const { pos, personaId, nombre } = pendingAssign
        setPendingAssign(null)
        if (mode === 'permanent') {
            const res = await invokePlanoAction(() =>
                setPlanoPersonaCapacidad(personaId, 'ambos'),
            )
            if (res.error) {
                planErrorRef.current(planoErr(res.error))
                return
            }
            quickSuccessRef.current(t('ofrenda.plano.capacidad.updated'))
        }
        await saveAssign(pos, personaId, nombre)
    }

    const handleExportPng = async () => {
        const data = displayData
        if (!data || !servicio) return
        setExporting(true)
        try {
            const turno =
                servicio.dia_tipo === 'jueves'
                    ? 'jueves'
                    : servicio.dia_tipo === 'domingo'
                      ? 'dom-manana'
                      : 'dom-tarde'
            const filename = `plano-ofrenda-sabadell-${servicio.fecha}-${turno}-${vista}.png`
            await exportPlanoPng(data, {
                ofrendario: t('ofrenda.plano.rol.ofrendario'),
                apoyo: t('ofrenda.plano.rol.apoyo'),
                nombrePlaceholder: t('ofrenda.plano.nombrePlaceholder'),
            }, filename)
            quickSuccess(t('ofrenda.plano.toast.exported'))
        } catch (err) {
            planErrorRef.current(err instanceof Error ? err.message : t('ofrenda.plano.exportError'))
        } finally {
            setExporting(false)
        }
    }

    const executeConfirm = async () => {
        if (!confirmAction) return
        const action = confirmAction
        setConfirmAction(null)
        if (action === 'clear' && servicio) {
            const res = await invokePlanoAction(() => clearPlanoNombres(servicio.id))
            if (res.error) planErrorRef.current(planoErr(res.error))
            else {
                quickSuccessRef.current(t('ofrenda.plano.toast.cleared'))
                void reloadPlano()
            }
            return
        }
        if (action === 'reset' && modo) {
            const res = await invokePlanoAction(() => resetPlanoLayout(vista, modo))
            if (res.error) planErrorRef.current(planoErr(res.error))
            else {
                planSuccessRef.current(t('ofrenda.plano.toast.reset'))
                void reloadPlano()
            }
        }
    }

    if (!plan || !servicio) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-5">
                <div className="p-5 bg-emerald-500/10 rounded-3xl">
                    <MapIcon className="w-12 h-12 text-emerald-500" />
                </div>
                <div>
                    <h3 className="text-lg font-bold mb-1">
                        {t('ofrenda.emptyPlan.title')} — {tituloMes}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">{t('ofrenda.plano.emptyDesc')}</p>
                </div>
                <button
                    type="button"
                    onClick={onGoToPlan}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-colors touch-manipulation min-h-[48px]"
                >
                    {t('ofrenda.plano.goToPlan')}
                </button>
            </div>
        )
    }

    const data = displayData
    const planoDataMatches = Boolean(
        planoData &&
            planoLoadedFor?.servicioId === servicioIdResolved &&
            planoLoadedFor.modo === modo &&
            planoLoadedFor.vista === vista,
    )

    const diaLabel = (s: OfrServicio) => {
        const dayNum = Number(s.fecha.slice(8, 10))
        if (s.dia_tipo === 'jueves') return `${t('ofrenda.days.jueShort')} ${dayNum}`
        const turno = s.dia_tipo === 'domingo' ? t('ofrenda.days.manana') : t('ofrenda.days.tarde')
        return `${t('ofrenda.days.domShort')} ${dayNum} · ${turno}`
    }

    const rolLabel = (rol: 'ofrendario' | 'apoyo') =>
        rol === 'ofrendario' ? t('ofrenda.plano.rol.ofrendario') : t('ofrenda.plano.rol.apoyo')

    return (
        <div className="space-y-4" data-testid="plano-tab">
            <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/95 backdrop-blur-sm space-y-2 border-b border-border/40 min-w-0 max-w-full sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:p-0">
                <h2 className="text-sm font-bold text-muted-foreground">{tituloMes}</h2>
                <PlanoServiceStrip
                    servicios={servicios}
                    activeId={effectiveServicioId ?? servicio.id}
                    accent={ACCENT}
                    diaLabel={diaLabel}
                    onSelect={setServicioId}
                />

                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span
                        className="ofrenda-liquid-pill px-3 py-1.5 rounded-full text-xs font-bold"
                        data-testid="plano-modo-badge"
                    >
                        {modo
                            ? interpolate(t('ofrenda.plano.modoBadge'), {
                                  sacos: String(sacos),
                                  bloques: String(modo === 'sacos_8' ? 8 : 4),
                              })
                            : interpolate(t('ofrenda.plano.sinDisposicion'), { sacos: String(sacos) })}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                    {canEdit && (
                        <button
                            type="button"
                            aria-pressed={layoutEditMode}
                            data-testid="plano-layout-edit-toggle"
                            onClick={() => setLayoutEditMode(v => !v)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-bold transition-colors touch-manipulation ${
                                layoutEditMode
                                    ? 'bg-amber-500 text-amber-950 border-amber-600 shadow-md'
                                    : 'bg-white border-[rgba(184,150,74,0.32)] text-slate-500 hover:text-[#1f2e85] hover:border-[#b8964a]'
                            }`}
                        >
                            <Move className="w-3.5 h-3.5 shrink-0" />
                            <span>{t('ofrenda.plano.layoutEdit')}</span>
                        </button>
                    )}
                    <div className="inline-flex rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1" role="group" aria-label={t('ofrenda.plano.vistaToggle')}>
                        {(['2d', '3d'] as const).map(v => {
                            const active = vista === v
                            const activeClass =
                                v === '2d'
                                    ? 'bg-emerald-600 text-white shadow border border-emerald-600'
                                    : 'bg-violet-600 text-white shadow border border-violet-600'
                            return (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setVista(v)}
                                aria-pressed={active}
                                data-testid={`plano-vista-${v}`}
                                className={`px-4 py-2 min-h-[44px] rounded-[10px] text-xs font-black uppercase transition-colors touch-manipulation ${
                                    active
                                        ? activeClass
                                        : 'text-slate-500 hover:text-[#1f2e85] border border-transparent'
                                }`}
                            >
                                {v === '2d' ? t('ofrenda.plano.vista2d') : t('ofrenda.plano.vista3d')}
                            </button>
                            )
                        })}
                    </div>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {data ? (
                    <motion.div
                        key={`${vista}-${data.modo}`}
                        initial={false}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="grid xl:grid-cols-[1fr_minmax(280px,410px)] gap-4 items-start"
                    >
                        <div className="relative min-w-0">
                            {loading && planoDataMatches && (
                                <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-background/50 backdrop-blur-[2px]">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" aria-label={t('ofrenda.plano.loading')} />
                                </div>
                            )}
                            <PlanoCanvas
                                data={data}
                                canEdit={canEdit}
                                canDrag={canDrag}
                                layoutEditMode={layoutEditMode}
                                editingOpen={comboboxPos !== null || blockEdit !== null}
                                dragging={dragging}
                                onDragStart={() => setDragging(true)}
                                onDragEnd={handleDragEnd}
                                onEditPosicion={setComboboxPos}
                                onEditBlockLabel={setBlockEdit}
                                onMoveCard={(id, p) =>
                                    patchPlanoData(d => ({
                                        ...d,
                                        posiciones: d.posiciones.map(pos =>
                                            pos.id === id ? { ...pos, card: p } : pos,
                                        ),
                                    }))
                                }
                                onMoveFigure={(id, p) =>
                                    patchPlanoData(d => ({
                                        ...d,
                                        posiciones: d.posiciones.map(pos =>
                                            pos.id === id ? { ...pos, figura: p } : pos,
                                        ),
                                    }))
                                }
                                onMoveBlockLabel={(n, p) =>
                                    patchPlanoData(d => ({
                                        ...d,
                                        bloques: d.bloques.map(b =>
                                            b.n === n ? { ...b, labelPos: p } : b,
                                        ),
                                    }))
                                }
                            />
                        </div>
                        <PlanoEditorSheet
                            data={data}
                            canEdit={canEdit}
                            mobileOpen={editorOpen}
                            onMobileOpenChange={setEditorOpen}
                            onEditPosicion={setComboboxPos}
                            layoutStatus={layoutStatus}
                            onSaveLayout={() => void persistLayout()}
                            onExportPng={() => void handleExportPng()}
                            onClearNombres={() => setConfirmAction('clear')}
                            onResetLayout={() => setConfirmAction('reset')}
                            exporting={exporting}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="sin-disposicion"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10"
                        role="status"
                    >
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                            {interpolate(t('ofrenda.plano.sinDisposicion'), { sacos: String(sacos) })}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {data && (
                <table className="sr-only">
                    <caption>{t('ofrenda.plano.canvasLabel')}</caption>
                    <thead>
                        <tr>
                            <th scope="col">{t('ofrenda.plano.tabla.bloque')}</th>
                            <th scope="col">{t('ofrenda.plano.tabla.rol')}</th>
                            <th scope="col">{t('ofrenda.plano.tabla.nombre')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.posiciones.map(p => (
                            <tr key={p.id}>
                                <td>{p.bloque}</td>
                                <td>{rolLabel(p.rol)}</td>
                                <td>{p.nombre || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {comboboxPos && data && (
                <PlanoPersonaCombobox
                    open
                    onClose={() => setComboboxPos(null)}
                    bloque={comboboxPos.bloque}
                    rolLabel={rolLabel(comboboxPos.rol)}
                    color={colorDeBloque(data.bloques, comboboxPos.bloque)}
                    value={comboboxPos.nombre ?? ''}
                    onSelect={handleAsignacion}
                />
            )}

            {pendingAssign && (
                <OfrendaLiquidShell
                    open
                    onClose={() => setPendingAssign(null)}
                    ariaLabel={t('ofrenda.plano.rolWarn.title')}
                    title={t('ofrenda.plano.rolWarn.title')}
                    headline={t('ofrenda.plano.rolWarn.title')}
                    accent="gold"
                    testIdPrefix="plano-rolwarn"
                    unstyledBody
                >
                    <div className="px-4 pb-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {interpolate(
                                t(
                                    pendingAssign.pos.rol === 'apoyo'
                                        ? 'ofrenda.plano.rolWarn.toApoyo'
                                        : 'ofrenda.plano.rolWarn.toOfrendario',
                                ),
                                { nombre: pendingAssign.nombre },
                            )}
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => void resolvePendingAssign('once')}
                                className="w-full py-3 min-h-[48px] rounded-xl bg-amber-600 text-white font-bold touch-manipulation"
                            >
                                {t('ofrenda.plano.rolWarn.once')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void resolvePendingAssign('permanent')}
                                className="w-full py-3 min-h-[48px] rounded-xl border border-amber-500/50 font-semibold touch-manipulation"
                            >
                                {t('ofrenda.plano.rolWarn.permanent')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingAssign(null)}
                                className="w-full py-3 min-h-[48px] rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] text-[#1f2e85] hover:bg-[#f8f3e8] font-semibold touch-manipulation"
                            >
                                {t('ofrenda.plano.rolWarn.no')}
                            </button>
                        </div>
                    </div>
                </OfrendaLiquidShell>
            )}

            <PlanoBlockLabelEdit
                bloque={blockEdit}
                onClose={() => setBlockEdit(null)}
                onSave={(n, text) => {
                    patchPlanoData(d => ({
                        ...d,
                        bloques: d.bloques.map(b => (b.n === n ? { ...b, labelText: text } : b)),
                    }))
                    saveLayoutAfterEdit()
                }}
            />

            {confirmAction && (
                <OfrendaLiquidShell
                    open
                    onClose={() => setConfirmAction(null)}
                    ariaLabel={
                        confirmAction === 'clear'
                            ? t('ofrenda.plano.confirmClearTitle')
                            : t('ofrenda.plano.confirmResetTitle')
                    }
                    title={
                        confirmAction === 'clear'
                            ? t('ofrenda.plano.confirmClearTitle')
                            : t('ofrenda.plano.confirmResetTitle')
                    }
                    headline={
                        confirmAction === 'clear'
                            ? t('ofrenda.plano.confirmClearTitle')
                            : t('ofrenda.plano.confirmResetTitle')
                    }
                    accent="gold"
                    testIdPrefix="plano-confirm"
                    unstyledBody
                >
                    <div className="px-4 pb-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {confirmAction === 'clear'
                                ? t('ofrenda.plano.confirmClearDesc')
                                : t('ofrenda.plano.confirmResetDesc')}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                className="flex-1 py-3 min-h-[48px] rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] text-[#1f2e85] hover:bg-[#f8f3e8] font-semibold touch-manipulation"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void executeConfirm()}
                                className="flex-1 py-3 min-h-[48px] rounded-xl bg-amber-600 text-white font-bold touch-manipulation"
                            >
                                {t('ofrenda.plano.confirm')}
                            </button>
                        </div>
                    </div>
                </OfrendaLiquidShell>
            )}
        </div>
    )
}

export default PlanoTab
