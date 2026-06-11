/**
 * PlanoTab.tsx — Pestaña "Plano" de Labor Ofrenda
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Map as MapIcon, AlertTriangle, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { interpolate } from '../ofrendaLocale'
import { useOfrendaToast } from '../ofrendaFeedback'
import { colorDeBloque, getPlanoVista } from './planoData'
import {
    getPlanoData,
    savePlanoAsignacion,
    savePlanoLayout,
    clearPlanoNombres,
    resetPlanoLayout,
} from './planoActions'
import { vistaResueltaToElementos } from './planoLayoutSerialize'
import { exportPlanoPng } from './planoExportPng'
import { invokePlanoAction } from './planoInvoke'
import { PlanoCanvas } from './PlanoCanvas'
import { PlanoEditorSheet } from './PlanoEditorSheet'
import { PlanoPersonaCombobox } from './PlanoPersonaCombobox'
import { PlanoBlockLabelEdit } from './PlanoBlockLabelEdit'
import { OfrendaLiquidShell } from '../OfrendaLiquidShell'
import type { PlanCompleto, OfrServicio } from '../actions'
import {
    resolverModo,
    sacosParaDia,
    type PlanoBloque,
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

const ACCENT: Record<OfrServicio['dia_tipo'], { on: string; off: string }> = {
    jueves: {
        on: 'bg-emerald-600 text-white border-emerald-600',
        off: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10',
    },
    domingo: {
        on: 'bg-sky-600 text-white border-sky-600',
        off: 'border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10',
    },
    domingo_tarde: {
        on: 'bg-violet-600 text-white border-violet-600',
        off: 'border-violet-500/40 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10',
    },
}

type LayoutStatus = 'idle' | 'saving' | 'saved'

export function PlanoTab({ plan, tituloMes, canEdit, onGoToPlan }: Readonly<Props>) {
    const { t } = useI18n()
    const { quickSuccess, planError, planSuccess } = useOfrendaToast()
    const planErrorRef = useRef(planError)
    const quickSuccessRef = useRef(quickSuccess)
    const planSuccessRef = useRef(planSuccess)
    planErrorRef.current = planError
    quickSuccessRef.current = quickSuccess
    planSuccessRef.current = planSuccess
    const [vista, setVista] = useState<PlanoVista>('2d')
    const [planoData, setPlanoData] = useState<PlanoVistaResuelta | null>(null)
    const [loading, setLoading] = useState(false)
    const [editorOpen, setEditorOpen] = useState(false)
    const [comboboxPos, setComboboxPos] = useState<PlanoPosicion | null>(null)
    const [blockEdit, setBlockEdit] = useState<PlanoBloque | null>(null)
    const [dragging, setDragging] = useState(false)
    const [layoutStatus, setLayoutStatus] = useState<LayoutStatus>('idle')
    const [exporting, setExporting] = useState(false)
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const planoDataRef = useRef(planoData)
    planoDataRef.current = planoData

    const servicios = useMemo(
        () => (plan ? [...plan.servicios].sort((x, y) => x.fecha.localeCompare(y.fecha) || x.posicion - y.posicion) : []),
        [plan],
    )
    const [servicioId, setServicioId] = useState<string | null>(null)
    const servicio = servicios.find(s => s.id === servicioId) ?? servicios[0] ?? null

    const sacos = plan && servicio ? sacosParaDia(plan.plan, servicio.dia_tipo) : 0
    const modo = resolverModo(sacos)
    const fallbackData = modo ? getPlanoVista(vista, modo) : null

    const servicioIdResolved = servicio?.id ?? null

    useEffect(() => {
        if (!servicioIdResolved || !modo) {
            setPlanoData(null)
            return
        }

        let cancelled = false
        const timer = window.setTimeout(() => {
            void (async () => {
                setLoading(true)
                setLayoutStatus('idle')
                try {
                    const res = await invokePlanoAction(() =>
                        getPlanoData(servicioIdResolved, vista, modo),
                    )
                    if (cancelled) return
                    const embedded = getPlanoVista(vista, modo)
                    if (res.error) {
                        planErrorRef.current(res.error)
                        setPlanoData(embedded)
                        return
                    }
                    setPlanoData(res.data?.data ?? embedded)
                } catch (err) {
                    if (cancelled) return
                    planErrorRef.current(
                        err instanceof Error ? err.message : t('ofrenda.plano.loading'),
                    )
                    setPlanoData(getPlanoVista(vista, modo))
                } finally {
                    if (!cancelled) setLoading(false)
                }
            })()
        }, 0)

        return () => {
            cancelled = true
            window.clearTimeout(timer)
        }
    }, [servicioIdResolved, modo, vista, t])

    const reloadPlano = useCallback(async () => {
        if (!servicio || !modo) return
        setLoading(true)
        try {
            const res = await invokePlanoAction(() =>
                getPlanoData(servicio.id, vista, modo),
            )
            const embedded = getPlanoVista(vista, modo)
            if (res.error) {
                planErrorRef.current(res.error)
                setPlanoData(embedded)
                return
            }
            setPlanoData(res.data?.data ?? embedded)
        } finally {
            setLoading(false)
        }
    }, [servicio, modo, vista])

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [])

    const patchPlanoData = useCallback((fn: (d: PlanoVistaResuelta) => PlanoVistaResuelta) => {
        setPlanoData(prev => (prev ? fn(prev) : prev))
        setLayoutStatus('idle')
    }, [])

    const persistLayout = useCallback(async () => {
        const data = planoDataRef.current
        if (!canEdit || !data || !modo) return
        setLayoutStatus('saving')
        const res = await invokePlanoAction(() =>
            savePlanoLayout(vista, modo, vistaResueltaToElementos(data)),
        )
        if (res.error) {
            planErrorRef.current(res.error)
            setLayoutStatus('idle')
            return
        }
        setLayoutStatus('saved')
        quickSuccessRef.current(t('ofrenda.plano.toast.layoutSaved'))
    }, [canEdit, modo, vista, t])

    const scheduleLayoutSave = useCallback(() => {
        if (!canEdit) return
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
            void persistLayout()
        }, 800)
    }, [canEdit, persistLayout])

    const handleDragEnd = useCallback(() => {
        setDragging(false)
        scheduleLayoutSave()
    }, [scheduleLayoutSave])

    const handleAsignacion = async (personaId: string | null, nombre: string | null) => {
        if (!servicio || !comboboxPos) return
        const res = await invokePlanoAction(() =>
            savePlanoAsignacion(
                servicio.id,
                comboboxPos.bloque,
                comboboxPos.rol,
                personaId,
                nombre,
            ),
        )
        setComboboxPos(null)
        if (res.error) {
            planErrorRef.current(res.error)
            return
        }
        quickSuccessRef.current(t('ofrenda.plano.toast.saved'))
        void reloadPlano()
    }

    const handleExportPng = async () => {
        const data = planoData ?? fallbackData
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
            if (res.error) planErrorRef.current(res.error)
            else {
                quickSuccessRef.current(t('ofrenda.plano.toast.cleared'))
                void reloadPlano()
            }
            return
        }
        if (action === 'reset' && modo) {
            const res = await invokePlanoAction(() => resetPlanoLayout(vista, modo))
            if (res.error) planErrorRef.current(res.error)
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

    const data = planoData ?? fallbackData

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
            <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/95 backdrop-blur-sm space-y-2 border-b border-border/40 sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:p-0">
                <h2 className="text-sm font-bold text-muted-foreground">{tituloMes}</h2>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label={t('ofrenda.plano.serviceSelector')}>
                    {servicios.map(s => {
                        const active = s.id === servicio.id
                        const accent = ACCENT[s.dia_tipo]
                        return (
                            <button
                                key={s.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setServicioId(s.id)}
                                className={`px-3 py-2 min-h-[44px] rounded-xl border text-xs font-bold whitespace-nowrap transition-colors touch-manipulation ${
                                    active ? accent.on : `bg-background ${accent.off}`
                                }`}
                            >
                                {diaLabel(s)}
                            </button>
                        )
                    })}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span
                        className="px-3 py-1.5 rounded-full bg-muted text-xs font-bold text-muted-foreground"
                        data-testid="plano-modo-badge"
                    >
                        {modo
                            ? interpolate(t('ofrenda.plano.modoBadge'), {
                                  sacos: String(sacos),
                                  bloques: String(modo === 'sacos_8' ? 8 : 4),
                              })
                            : interpolate(t('ofrenda.plano.sinDisposicion'), { sacos: String(sacos) })}
                    </span>

                    <div className="inline-flex rounded-xl border border-border bg-muted/50 p-0.5" role="group" aria-label={t('ofrenda.plano.vistaToggle')}>
                        {(['2d', '3d'] as const).map(v => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => setVista(v)}
                                aria-pressed={vista === v}
                                className={`px-4 py-2 min-h-[44px] rounded-[10px] text-xs font-black uppercase transition-colors touch-manipulation ${
                                    vista === v
                                        ? 'bg-background shadow text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {v === '2d' ? t('ofrenda.plano.vista2d') : t('ofrenda.plano.vista3d')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {data ? (
                    <motion.div
                        key={`${vista}-${data.modo}-${servicio.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="grid xl:grid-cols-[1fr_minmax(280px,410px)] gap-4 items-start"
                    >
                        <div className="relative min-w-0">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-background/50 backdrop-blur-[2px]">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" aria-label={t('ofrenda.plano.loading')} />
                                </div>
                            )}
                            <PlanoCanvas
                                data={data}
                                canEdit={canEdit}
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

            <PlanoBlockLabelEdit
                bloque={blockEdit}
                onClose={() => setBlockEdit(null)}
                onSave={(n, text) => {
                    patchPlanoData(d => ({
                        ...d,
                        bloques: d.bloques.map(b => (b.n === n ? { ...b, labelText: text } : b)),
                    }))
                    scheduleLayoutSave()
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
                                className="flex-1 py-3 min-h-[48px] rounded-xl border border-border font-semibold touch-manipulation"
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
