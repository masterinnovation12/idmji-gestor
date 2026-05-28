'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Users, Download, ChevronLeft, ChevronRight, RefreshCw, Plus, Settings2, ChevronDown, CheckCircle2, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import BackButton from '@/components/BackButton'
import { MiembrosManager } from './MiembrosManager'
import { PlanTable } from './PlanTable'
import { ExportPanel } from './ExportPanel'
import { getPlan, generarORegenerarPlan, updateSacosConfig } from './actions'
import type { OfrMiembro, OfrPlan, PlanCompleto } from './actions'

// ─── Tipos de tab ─────────────────────────────────────────────────────────────

type Tab = 'plan' | 'personas' | 'exportar'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'plan',      label: 'Plan Mensual',  icon: Gift },
    { id: 'personas',  label: 'Personas',       icon: Users },
    { id: 'exportar',  label: 'Exportar',       icon: Download },
]

// ─── Nombres de meses ─────────────────────────────────────────────────────────

const MESES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    initialMiembros: OfrMiembro[]
    initialPlan: PlanCompleto | null
    initialAnio: number
    initialMes: number
    canEdit: boolean
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OfrendaPageClient({
    initialMiembros,
    initialPlan,
    initialAnio,
    initialMes,
    canEdit,
}: Readonly<Props>) {
    const [activeTab, setActiveTab] = useState<Tab>('plan')
    const [anio, setAnio]           = useState(initialAnio)
    const [mes,  setMes]            = useState(initialMes)
    const [plan, setPlan]           = useState<PlanCompleto | null>(initialPlan)
    const [miembros, setMiembros]   = useState<OfrMiembro[]>(initialMiembros)
    const [isLoading, setIsLoading] = useState(false)

    // ── Navegar entre meses ──────────────────────────────────────────────────
    const navigate = useCallback(async (delta: number) => {
        let newMes  = mes  + delta
        let newAnio = anio
        if (newMes > 12) { newMes = 1; newAnio++ }
        if (newMes < 1)  { newMes = 12; newAnio-- }
        setMes(newMes)
        setAnio(newAnio)

        setIsLoading(true)
        const result = await getPlan(newAnio, newMes)
        setIsLoading(false)
        if (result.error) {
            toast.error('Error al cargar plan', {
                description: result.error,
                icon: <X className="w-4 h-4 text-red-500" />,
            })
        } else {
            setPlan(result.data ?? null)
        }
    }, [anio, mes])

    // ── Generar / Regenerar ──────────────────────────────────────────────────
    const handleGenerar = useCallback(async (grupo?: 1 | 2) => {
        setIsLoading(true)
        const result = await generarORegenerarPlan(anio, mes, undefined, grupo ?? null)
        if (result.error) {
            toast.error('Error al generar plan', {
                description: result.error,
                icon: <X className="w-4 h-4 text-red-500" />,
            })
            setIsLoading(false)
            return
        }
        // Recargar datos frescos
        const planResult = await getPlan(anio, mes)
        setIsLoading(false)
        if (planResult.error) {
            toast.error('Error al recargar plan', {
                description: planResult.error,
                icon: <X className="w-4 h-4 text-red-500" />,
            })
        } else {
            setPlan(planResult.data ?? null)
            const msgTitle = plan ? 'Plan regenerado correctamente' : 'Plan generado correctamente'
            const msgDesc = plan 
                ? 'Se han actualizado las asignaciones manteniendo tus cambios manuales.'
                : 'Se han distribuido de forma equitativa las asignaciones de este mes.'
            toast.success(msgTitle, {
                description: msgDesc,
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                duration: 4000,
            })
        }
    }, [anio, mes, plan])

    // ── Callback para PlanTable cuando hay cambios de asignación ─────────────
    const handleAsignacionChange = useCallback(async () => {
        const result = await getPlan(anio, mes)
        if (result.data) setPlan(result.data)
    }, [anio, mes])

    // ── Callback para MiembrosManager ─────────────────────────────────────────
    const handleMiembrosChange = useCallback((nuevos: OfrMiembro[]) => {
        setMiembros(nuevos)
    }, [])

    // ── Título del mes ───────────────────────────────────────────────────────
    const tituloMes = `${MESES[mes]} ${anio}`

    return (
        <div className="min-h-dvh bg-background">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
                    <BackButton />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg shrink-0">
                            <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-black text-base sm:text-lg leading-tight truncate">
                                Labor Ofrenda
                            </h1>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                Iglesia de Dios Ministerial de Jesucristo Internacional
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Tabs ─────────────────────────────────────────────── */}
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex gap-1 pb-0.5 overflow-x-auto no-scrollbar">
                        {TABS.map(tab => {
                            const Icon = tab.icon
                            const active = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-all border-b-2 ${
                                        active
                                            ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500 bg-emerald-500/5'
                                            : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
                                    }`}
                                    aria-selected={active}
                                    role="tab"
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ── Contenido ───────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto px-4 py-5">
                <AnimatePresence mode="wait">
                    {/* ── TAB: PLAN ─────────────────────────────────────── */}
                    {activeTab === 'plan' && (
                        <motion.div
                            key="plan"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                        >
                            {/* Selector de mes */}
                            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(-1)}
                                        disabled={isLoading}
                                        aria-label="Mes anterior"
                                        className="p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-50 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>

                                    <h2 className="text-lg sm:text-xl font-black tracking-tight min-w-[160px] text-center">
                                        {isLoading ? (
                                            <span className="inline-block w-32 h-6 bg-muted animate-pulse rounded-lg" />
                                        ) : tituloMes}
                                    </h2>

                                    <button
                                        onClick={() => navigate(1)}
                                        disabled={isLoading}
                                        aria-label="Mes siguiente"
                                        className="p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-50 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {canEdit && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {plan && (
                                            <RegenerateMenu onRegenerate={handleGenerar} isLoading={isLoading} />
                                        )}
                                        {!plan && (
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => handleGenerar()}
                                                disabled={isLoading}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 touch-manipulation"
                                            >
                                                {isLoading ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Plus className="w-4 h-4" />
                                                )}
                                                Generar Plan
                                            </motion.button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Configuración de sacos (solo editor, solo cuando hay plan) */}
                            {canEdit && plan && (
                                <SacosConfigPanel
                                    plan={plan.plan}
                                    isLoading={isLoading}
                                    onUpdate={async (j, d, dt) => {
                                        setIsLoading(true)
                                        const r = await updateSacosConfig(plan.plan.id, j, d, dt)
                                        if (r.error) {
                                            toast.error('Error al actualizar sacos', {
                                                description: r.error,
                                                icon: <X className="w-4 h-4 text-red-500" />,
                                            })
                                            setIsLoading(false)
                                            return
                                        }
                                        const fr = await getPlan(anio, mes)
                                        setIsLoading(false)
                                        if (fr.error) {
                                            toast.error('Error al recargar plan', {
                                                description: fr.error,
                                                icon: <X className="w-4 h-4 text-red-500" />,
                                            })
                                        } else {
                                            setPlan(fr.data ?? null)
                                            toast.success('Configuración actualizada', {
                                                description: 'Sacos guardados y secuencias del plan recalculadas con éxito.',
                                                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
                                                duration: 4000,
                                            })
                                        }
                                    }}
                                />
                            )}

                            {/* Tabla del plan */}
                            {(() => {
                                if (isLoading) return <PlanSkeleton />
                                if (plan) return (
                                    <PlanTable
                                        plan={plan}
                                        miembros={miembros}
                                        canEdit={canEdit}
                                        onAsignacionChange={handleAsignacionChange}
                                    />
                                )
                                return (
                                <EmptyPlanState
                                    tituloMes={tituloMes}
                                    canEdit={canEdit}
                                    onGenerar={() => handleGenerar()}
                                    isLoading={isLoading}
                                />
                                )
                            })()}
                        </motion.div>
                    )}

                    {/* ── TAB: PERSONAS ─────────────────────────────────── */}
                    {activeTab === 'personas' && (
                        <motion.div
                            key="personas"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                        >
                            <MiembrosManager
                                initialMiembros={miembros}
                                canEdit={canEdit}
                                onChange={handleMiembrosChange}
                            />
                        </motion.div>
                    )}

                    {/* ── TAB: EXPORTAR ─────────────────────────────────── */}
                    {activeTab === 'exportar' && (
                        <motion.div
                            key="exportar"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                        >
                            <ExportPanel
                                plan={plan}
                                miembros={miembros}
                                tituloMes={tituloMes}
                                anio={anio}
                                mes={mes}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

// ─── Subcomponentes internos ──────────────────────────────────────────────────

function RegenerateMenu({
    onRegenerate,
    isLoading,
}: Readonly<{
    onRegenerate: (grupo?: 1 | 2) => void
    isLoading: boolean
}>) {
    const [open, setOpen] = useState(false)

    return (
        <div className="relative">
            <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setOpen(v => !v)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 border border-border bg-background hover:bg-muted text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 touch-manipulation"
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Regenerar
            </motion.button>

            <AnimatePresence>
                {open && (
                    <>
                        <button className="fixed inset-0 z-10 bg-transparent cursor-default" onClick={() => setOpen(false)} aria-label="Cerrar menú" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute right-0 top-full mt-2 z-20 bg-background border border-border rounded-2xl shadow-xl overflow-hidden min-w-[190px]"
                        >
                            {[
                                { label: 'Todo el plan',           grupo: undefined },
                                { label: 'Solo Grupo 1 (roles)',   grupo: 1 as const },
                                { label: 'Solo Grupo 2 (colabor.)',grupo: 2 as const },
                            ].map(item => (
                                <button
                                    key={item.label}
                                    onClick={() => { onRegenerate(item.grupo); setOpen(false) }}
                                    className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors font-medium"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

function EmptyPlanState({
    tituloMes,
    canEdit,
    onGenerar,
    isLoading,
}: Readonly<{
    tituloMes: string
    canEdit: boolean
    onGenerar: () => void
    isLoading: boolean
}>) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-5">
            <div className="p-5 bg-emerald-500/10 rounded-3xl">
                <Gift className="w-12 h-12 text-emerald-500" />
            </div>
            <div>
                <h3 className="text-lg font-bold mb-1">Sin plan para {tituloMes}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                    Genera el plan mensual para ver y gestionar las asignaciones de labor ofrenda.
                </p>
            </div>
            {canEdit && (
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onGenerar}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-colors disabled:opacity-50"
                >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Generar Plan de {tituloMes}
                </motion.button>
            )}
        </div>
    )
}

function PlanSkeleton() {
    return (
        <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Cargando plan">
            <div className="h-10 bg-muted rounded-2xl" />
            {Array.from({ length: 5 }, (_, i) => i).map(i => (
                <div key={`skel-${i}`} className="h-24 bg-muted rounded-2xl" />
            ))}
        </div>
    )
}

// ─── Acordeón de configuración de sacos ──────────────────────────────────────

function SacosConfigPanel({
    plan,
    isLoading,
    onUpdate,
}: Readonly<{
    plan: OfrPlan
    isLoading: boolean
    onUpdate: (jueves: number, domingo: number, domingoTarde: number) => Promise<void>
}>) {
    const [open, setOpen] = useState(false)
    const [j,  setJ]  = useState(plan.sacos_jueves)
    const [d,  setD]  = useState(plan.sacos_domingo)
    const [dt, setDt] = useState(plan.sacos_domingo_tarde)

    const handleApply = async () => {
        if (j < 1 || j > 20 || d < 1 || d > 20 || dt < 1 || dt > 20) {
            toast.error('Valores incorrectos', {
                description: 'Los sacos deben estar comprendidos entre 1 y 20.',
                icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
            })
            return
        }
        await onUpdate(j, d, dt)
        setOpen(false)
    }

    return (
        <div className="mb-4 rounded-2xl border border-border/50 overflow-hidden">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                aria-expanded={open}
            >
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Settings2 className="w-3.5 h-3.5" />
                    Configuración de sacos por servicio
                </div>
                <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.18 }}
                >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 py-4 bg-background space-y-4">
                            <p className="text-xs text-muted-foreground">
                                Cambia la cantidad de sacos por tipo de servicio. Al guardar, el plan se regenera automáticamente manteniendo los overrides manuales.
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                                <SacosInput
                                    label="Jueves"
                                    color="emerald"
                                    value={j}
                                    onChange={setJ}
                                />
                                <SacosInput
                                    label="Dom. Mañana"
                                    color="blue"
                                    value={d}
                                    onChange={setD}
                                />
                                <SacosInput
                                    label="Dom. Tarde"
                                    color="violet"
                                    value={dt}
                                    onChange={setDt}
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                                <button
                                    onClick={handleApply}
                                    disabled={isLoading}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-3.5 h-3.5" />
                                    )}
                                    Actualizar y regenerar
                                </button>
                                <button
                                    onClick={() => {
                                        setJ(plan.sacos_jueves)
                                        setD(plan.sacos_domingo)
                                        setDt(plan.sacos_domingo_tarde)
                                        setOpen(false)
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function SacosInput({
    label,
    color,
    value,
    onChange,
}: Readonly<{
    label: string
    color: 'emerald' | 'blue' | 'violet'
    value: number
    onChange: (v: number) => void
}>) {
    const colorClass = {
        emerald: 'text-emerald-700 dark:text-emerald-300 border-emerald-500/30 focus:ring-emerald-500/30',
        blue:    'text-blue-700 dark:text-blue-300 border-blue-500/30 focus:ring-blue-500/30',
        violet:  'text-violet-700 dark:text-violet-300 border-violet-500/30 focus:ring-violet-500/30',
    }[color]

    return (
        <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wide ${colorClass.split(' ')[0]}`}>
                {label}
            </label>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    min={1}
                    max={20}
                    value={value}
                    onChange={e => onChange(Math.max(1, Math.min(20, Number(e.target.value))))}
                    className={`w-full text-center text-sm font-black font-mono border rounded-xl p-2 bg-background outline-none focus:ring-2 ${colorClass}`}
                    aria-label={`Sacos ${label}`}
                />
                <span className="text-[10px] text-muted-foreground shrink-0">sacos</span>
            </div>
        </div>
    )
}

// Re-exportar tipos para que los hijos puedan importar desde aquí
export type { OfrMiembro, OfrPlan, PlanCompleto }
export type { OfrServicio, OfrAsignacion } from './actions'
