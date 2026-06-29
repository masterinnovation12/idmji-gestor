'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Users, Download, Map, RefreshCw, Plus, Trash2, Sparkles } from 'lucide-react'
import BackButton from '@/components/BackButton'
import { OfrendaFeedbackProvider, useOfrendaToast } from './ofrendaFeedback'
import { MiembrosManager } from './MiembrosManager'
import { PlanoPersonasManager } from './plano/PlanoPersonasManager'
import { PlanoGeneratePanel } from './plano/PlanoGeneratePanel'
import { PlanoExportPanel } from './plano/PlanoExportPanel'
import { PlanTable } from './PlanTable'
import { ExportPanel } from './ExportPanel'
import { getPlan, generarORegenerarPlan, updateSacosConfig, eliminarPlan } from './actions'
import type { OfrMiembro, OfrPlan, PlanCompleto } from './actions'
import { generarFechasDelPlan } from '@/lib/utils/ofrendaEngine'
import { validarDisponibilidadParaGenerar } from './ofrendaMemberAvailability'
import { formatDisponibilidadProblemas } from './ofrendaGeneracionValidation'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { TranslationKey } from '@/lib/i18n/types'
import { getTituloMes, interpolate } from './ofrendaLocale'
import { SacosConfigPanel } from './SacosConfigPanel'
import { PlanMonthNavigator } from './PlanMonthNavigator'
import { formatOfrendaActionError, isOfrendaDbConstraintError } from './ofrendaDbErrors'

type Section = 'general' | 'laborOfrenda'
type GeneralTab = 'plan' | 'personas' | 'exportar'
type LaborTab = 'personas' | 'generar' | 'plano' | 'exportar'

const GENERAL_TAB_DEFS: { id: GeneralTab; labelKey: TranslationKey; icon: React.ElementType }[] = [
    { id: 'plan', labelKey: 'ofrenda.tabs.planGeneral', icon: Gift },
    { id: 'personas', labelKey: 'ofrenda.tabs.peopleGeneral', icon: Users },
    { id: 'exportar', labelKey: 'ofrenda.tabs.exportGeneral', icon: Download },
]

const LABOR_TAB_DEFS: { id: LaborTab; labelKey: TranslationKey; icon: React.ElementType }[] = [
    { id: 'personas', labelKey: 'ofrenda.tabs.planoPeople', icon: Users },
    { id: 'generar', labelKey: 'ofrenda.tabs.generatePlano', icon: Sparkles },
    { id: 'plano', labelKey: 'ofrenda.tabs.planoMap', icon: Map },
    { id: 'exportar', labelKey: 'ofrenda.tabs.exportPlano', icon: Download },
]

// Esqueleto de carga del plano (componente para poder usar i18n en el aria-label).
function PlanoLoadingSkeleton() {
    const { t } = useI18n()
    return (
        <div
            className="min-h-[52dvh] h-[calc(100dvh-18rem)] max-h-[72dvh] bg-muted rounded-2xl animate-pulse"
            aria-busy="true"
            aria-label={t('ofrenda.plano.loading')}
        />
    )
}

// Carga perezosa del plano: el lienzo (SVG + react-zoom-pan-pinch) no debe
// penalizar el LCP de las otras pestañas.
const PlanoTab = dynamic(() => import('./plano/PlanoTab'), {
    ssr: false,
    loading: () => <PlanoLoadingSkeleton />,
})

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    initialMiembros: OfrMiembro[]
    initialPlan: PlanCompleto | null
    initialAnio: number
    initialMes: number
    canEdit: boolean
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OfrendaPageClient(props: Readonly<Props>) {
    return (
        <OfrendaFeedbackProvider>
            <OfrendaPageClientInner {...props} />
        </OfrendaFeedbackProvider>
    )
}

function OfrendaPageClientInner({
    initialMiembros,
    initialPlan,
    initialAnio,
    initialMes,
    canEdit,
}: Readonly<Props>) {
    const { t, language } = useI18n()
    const feedback = useOfrendaToast()
    const [section, setSection] = useState<Section>('general')
    const [generalTab, setGeneralTab] = useState<GeneralTab>('plan')
    const [laborTab, setLaborTab] = useState<LaborTab>('plano')
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
            feedback.planError(t('ofrenda.toast.loadError'), result.error)
        } else {
            setPlan(result.data ?? null)
        }
    }, [anio, mes, t, feedback])

    // ── Generar / Regenerar ──────────────────────────────────────────────────
    const handleGenerar = useCallback(async (grupo?: 1 | 2) => {
        const fechasPlan = generarFechasDelPlan(anio, mes)
        const precheck = validarDisponibilidadParaGenerar(
            fechasPlan,
            miembros,
            grupo ?? null,
        )
        if (!precheck.ok) {
            feedback.planError(
                t('ofrenda.toast.generateError'),
                formatDisponibilidadProblemas(t, precheck.problemas),
            )
            return
        }

        setIsLoading(true)
        const result = await generarORegenerarPlan(anio, mes, undefined, grupo ?? null)
        if (result.error) {
            const msg =
                result.error === 'DISPONIBILIDAD_INSUFICIENTE' && result.problemas
                    ? formatDisponibilidadProblemas(t, result.problemas)
                    : formatOfrendaActionError(result.error)
            feedback.planError(t('ofrenda.toast.generateError'), msg)
            setIsLoading(false)
            return
        }
        // Recargar datos frescos
        const planResult = await getPlan(anio, mes)
        setIsLoading(false)
        if (planResult.error) {
            feedback.planError(t('ofrenda.toast.loadError'), planResult.error)
        } else {
            setPlan(planResult.data ?? null)
            feedback.planSuccess(
                plan ? t('ofrenda.toast.planRegenerated') : t('ofrenda.toast.planGenerated'),
                plan ? t('ofrenda.toast.planRegeneratedDesc') : t('ofrenda.toast.planGeneratedDesc'),
            )
        }
    }, [anio, mes, plan, miembros, t, feedback])

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
    const tituloMes = getTituloMes(language, mes, anio)

    const handleSectionChange = useCallback((next: Section) => {
        feedback.dismiss()
        setSection(next)
    }, [feedback])

    const handleGeneralTabChange = useCallback((tab: GeneralTab) => {
        feedback.dismiss()
        setGeneralTab(tab)
    }, [feedback])

    const handleLaborTabChange = useCallback((tab: LaborTab) => {
        feedback.dismiss()
        setLaborTab(tab)
    }, [feedback])

    const activeTabDefs = section === 'general' ? GENERAL_TAB_DEFS : LABOR_TAB_DEFS
    const wideContent =
        (section === 'general' && generalTab === 'plan') ||
        (section === 'laborOfrenda' && laborTab === 'plano')

    const handleEliminarPlan = useCallback(async () => {
        setIsLoading(true)
        const result = await eliminarPlan(anio, mes)
        setIsLoading(false)
        if (result.error) {
            feedback.planError(t('ofrenda.toast.loadError'), result.error)
            return
        }
        setPlan(null)
        feedback.planSuccess(t('ofrenda.toast.planDeleted'), t('ofrenda.toast.planDeletedDesc'))
    }, [anio, mes, t, feedback])

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
                            <h1
                                className="font-black text-base sm:text-lg leading-tight truncate"
                                suppressHydrationWarning
                            >
                                {t('ofrenda.title')}
                            </h1>
                            <p
                                className="text-xs text-muted-foreground hidden sm:block"
                                suppressHydrationWarning
                            >
                                {t('ofrenda.subtitle')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Secciones + mes global ───────────────────────────── */}
                <div className="max-w-5xl mx-auto px-4 pb-2 space-y-3">
                    <div
                        className="inline-flex w-full rounded-xl border border-border bg-muted/40 p-0.5"
                        role="tablist"
                        aria-label={t('ofrenda.title')}
                    >
                        {(['general', 'laborOfrenda'] as const).map(sec => {
                            const active = section === sec
                            return (
                                <button
                                    key={sec}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    data-testid={`ofrenda-section-${sec}`}
                                    onClick={() => handleSectionChange(sec)}
                                    className={`flex-1 px-3 py-2.5 min-h-[44px] rounded-[10px] text-xs font-bold transition-colors touch-manipulation ${
                                        active
                                            ? sec === 'general'
                                                ? 'bg-emerald-600 text-white shadow'
                                                : 'bg-amber-600 text-white shadow'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <span suppressHydrationWarning>
                                        {t(sec === 'general' ? 'ofrenda.sections.general' : 'ofrenda.sections.laborOfrenda')}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <PlanMonthNavigator
                        title={tituloMes}
                        isLoading={isLoading}
                        onPrev={() => navigate(-1)}
                        onNext={() => navigate(1)}
                        prevAriaLabel={t('ofrenda.month.prev')}
                        nextAriaLabel={t('ofrenda.month.next')}
                    />
                </div>

                {/* ── Sub-tabs ─────────────────────────────────────────── */}
                <div className="max-w-5xl mx-auto px-4">
                    <div className="flex gap-1 pb-0.5 overflow-x-auto no-scrollbar">
                        {activeTabDefs.map(tab => {
                            const Icon = tab.icon
                            const active =
                                section === 'general'
                                    ? generalTab === tab.id
                                    : laborTab === tab.id
                            const accent =
                                section === 'general'
                                    ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500 bg-emerald-500/5'
                                    : 'text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-500/5'
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() =>
                                        section === 'general'
                                            ? handleGeneralTabChange(tab.id as GeneralTab)
                                            : handleLaborTabChange(tab.id as LaborTab)
                                    }
                                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-t-lg whitespace-nowrap transition-all border-b-2 ${
                                        active
                                            ? accent
                                            : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
                                    }`}
                                    aria-selected={active}
                                    role="tab"
                                    data-testid={`ofrenda-tab-${section}-${tab.id}`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span suppressHydrationWarning>{t(tab.labelKey)}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ── Contenido ───────────────────────────────────────────────── */}
            <div className={`mx-auto px-4 py-5 ${wideContent ? 'max-w-[100%] xl:max-w-7xl' : 'max-w-5xl'}`}>
                <AnimatePresence mode="wait">
                    {/* ── LABORES GENERALES ───────────────────────────── */}
                    {section === 'general' && generalTab === 'plan' && (
                        <motion.div
                            key="general-plan"
                            initial={false}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="min-w-0"
                        >
                            <div className="mb-5 space-y-3" data-testid="ofrenda-plan-toolbar">
                                {canEdit && (
                                    <div
                                        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end"
                                        data-testid="ofrenda-plan-actions"
                                    >
                                        {plan && (
                                            <>
                                                <RegenerateMenu
                                                    onRegenerate={handleGenerar}
                                                    isLoading={isLoading}
                                                />
                                                <DeletePlanButton
                                                    tituloMes={tituloMes}
                                                    isLoading={isLoading}
                                                    onConfirm={handleEliminarPlan}
                                                />
                                            </>
                                        )}
                                        {!plan && (
                                            <motion.button
                                                whileTap={{ scale: 0.97 }}
                                                type="button"
                                                onClick={() => handleGenerar()}
                                                disabled={isLoading}
                                                className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 touch-manipulation"
                                            >
                                                {isLoading ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Plus className="w-4 h-4" />
                                                )}
                                                {t('ofrenda.generate')}
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
                                    onUpdate={async (j, d, dt, secuenciaMaximo) => {
                                        setIsLoading(true)
                                        const r = await updateSacosConfig(
                                            plan.plan.id,
                                            j,
                                            d,
                                            dt,
                                            secuenciaMaximo,
                                        )
                                        if (r.error) {
                                            const raw = r.error
                                            feedback.planError(
                                                isOfrendaDbConstraintError(raw)
                                                    ? t('ofrenda.toast.sacosDbError')
                                                    : t('ofrenda.toast.sacosInvalid'),
                                                formatOfrendaActionError(raw),
                                            )
                                            setIsLoading(false)
                                            return
                                        }
                                        const fr = await getPlan(anio, mes)
                                        setIsLoading(false)
                                        if (fr.error) {
                                            feedback.planError(t('ofrenda.toast.loadError'), fr.error)
                                        } else {
                                            setPlan(fr.data ?? null)
                                            feedback.planSuccess(
                                                t('ofrenda.toast.sacosUpdated'),
                                                t('ofrenda.toast.sacosUpdatedDesc'),
                                            )
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

                    {section === 'general' && generalTab === 'personas' && (
                        <motion.div
                            key="general-personas"
                            initial={false}
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

                    {section === 'general' && generalTab === 'exportar' && (
                        <motion.div
                            key="general-exportar"
                            className="relative z-10 bg-background"
                            initial={false}
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

                    {/* ── LABOR OFRENDA ───────────────────────────────── */}
                    {section === 'laborOfrenda' && laborTab === 'personas' && (
                        <motion.div
                            key="labor-personas"
                            initial={false}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                        >
                            <PlanoPersonasManager canEdit={canEdit} />
                        </motion.div>
                    )}

                    {section === 'laborOfrenda' && laborTab === 'generar' && (
                        <motion.div
                            key="labor-generar"
                            initial={false}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                        >
                            <PlanoGeneratePanel
                                plan={plan}
                                anio={anio}
                                mes={mes}
                                canEdit={canEdit}
                                onGenerated={handleAsignacionChange}
                            />
                        </motion.div>
                    )}

                    {section === 'laborOfrenda' && laborTab === 'plano' && (
                        <motion.div
                            key="labor-plano"
                            initial={false}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="min-w-0"
                        >
                            <PlanoTab
                                plan={plan}
                                tituloMes={tituloMes}
                                canEdit={canEdit}
                                onGoToPlan={() => {
                                    setSection('general')
                                    setGeneralTab('plan')
                                }}
                            />
                        </motion.div>
                    )}

                    {section === 'laborOfrenda' && laborTab === 'exportar' && (
                        <motion.div
                            key="labor-exportar"
                            className="relative z-10 bg-background"
                            initial={false}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                        >
                            <PlanoExportPanel
                                plan={plan}
                                tituloMes={tituloMes}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

// ─── Subcomponentes internos ──────────────────────────────────────────────────

export function DeletePlanButton({
    tituloMes,
    isLoading,
    onConfirm,
}: Readonly<{
    tituloMes: string
    isLoading: boolean
    onConfirm: () => void
}>) {
    const { t } = useI18n()
    const [confirmOpen, setConfirmOpen] = useState(false)

    if (confirmOpen) {
        return (
            <div
                className="w-full rounded-2xl border border-red-500/30 bg-red-500/8 p-3 shadow-sm"
                data-testid="ofrenda-delete-plan-confirm"
                role="alertdialog"
                aria-labelledby="ofrenda-delete-plan-confirm-text"
            >
                <p
                    id="ofrenda-delete-plan-confirm-text"
                    className="text-sm font-semibold text-red-700 dark:text-red-300 leading-snug mb-3"
                >
                    {interpolate(t('ofrenda.deletePlan.confirm'), { month: tituloMes })}
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => { setConfirmOpen(false); onConfirm() }}
                        disabled={isLoading}
                        className="w-full px-3 py-3 min-h-[48px] text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50 touch-manipulation order-1"
                    >
                        {t('ofrenda.deletePlan.yes')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmOpen(false)}
                        disabled={isLoading}
                        className="w-full px-3 py-3 min-h-[48px] text-sm font-semibold border-2 border-border bg-background rounded-xl hover:bg-muted touch-manipulation order-2"
                    >
                        {t('ofrenda.deletePlan.no')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isLoading}
            className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-700 dark:text-red-300 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 touch-manipulation"
            data-testid="ofrenda-delete-plan-btn"
        >
            <Trash2 className="w-4 h-4" />
            {t('ofrenda.deletePlan')}
        </motion.button>
    )
}

function RegenerateMenu({
    onRegenerate,
    isLoading,
}: Readonly<{
    onRegenerate: (grupo?: 1 | 2) => void
    isLoading: boolean
}>) {
    const { t } = useI18n()
    const [open, setOpen] = useState(false)

    return (
        <div className="relative w-full sm:w-auto" data-testid="ofrenda-regenerate-menu">
            <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setOpen(v => !v)}
                disabled={isLoading}
                className="flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] border border-border bg-background hover:bg-muted text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 touch-manipulation"
                data-testid="ofrenda-regenerate-btn"
            >
                <RefreshCw className={`w-4 h-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
                {t('ofrenda.regenerate')}
            </motion.button>

            <AnimatePresence>
                {open && (
                    <>
                        <button
                            type="button"
                            className="fixed inset-0 z-10 bg-transparent cursor-default"
                            onClick={() => setOpen(false)}
                            aria-label={t('ofrenda.closeMenu')}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute left-0 right-0 sm:left-auto sm:right-0 top-full mt-2 z-20 bg-background border border-border rounded-2xl shadow-xl overflow-hidden sm:min-w-[190px]"
                        >
                            {[
                                { label: t('ofrenda.regenerate.all'), grupo: undefined, testId: 'ofrenda-regenerate-all' },
                                { label: t('ofrenda.regenerate.g1'), grupo: 1 as const, testId: 'ofrenda-regenerate-g1' },
                                { label: t('ofrenda.regenerate.g2'), grupo: 2 as const, testId: 'ofrenda-regenerate-g2' },
                            ].map(item => (
                                <button
                                    key={item.label}
                                    type="button"
                                    data-testid={item.testId}
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
    const { t } = useI18n()
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-5">
            <div className="p-5 bg-emerald-500/10 rounded-3xl">
                <Gift className="w-12 h-12 text-emerald-500" />
            </div>
            <div>
                <h3 className="text-lg font-bold mb-1">{t('ofrenda.emptyPlan.title')} — {tituloMes}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                    {t('ofrenda.emptyPlan.desc')}
                </p>
            </div>
            {canEdit && (
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={onGenerar}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-colors disabled:opacity-50 touch-manipulation min-h-[48px]"
                >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {t('ofrenda.generate')}
                </motion.button>
            )}
        </div>
    )
}

function PlanSkeleton() {
    const { t } = useI18n()
    return (
        <div className="space-y-3 animate-pulse" aria-busy="true" aria-label={t('ofrenda.loadingPlan')}>
            <div className="h-10 bg-muted rounded-2xl" />
            {Array.from({ length: 5 }, (_, i) => i).map(i => (
                <div key={`skel-${i}`} className="h-24 bg-muted rounded-2xl" />
            ))}
        </div>
    )
}

// ─── Acordeón de configuración de sacos ──────────────────────────────────────

// Re-exportar tipos para que los hijos puedan importar desde aquí
export type { OfrMiembro, OfrPlan, PlanCompleto }
export type { OfrServicio, OfrAsignacion } from './actions'
