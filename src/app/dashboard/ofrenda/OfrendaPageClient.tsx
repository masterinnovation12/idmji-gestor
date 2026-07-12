'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Users, Download, Map, RefreshCw, Sparkles } from 'lucide-react'
import PageHero from '@/components/PageHero'
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
import { getStaticI18n, useI18n } from '@/lib/i18n/I18nProvider'
import type { TranslationKey } from '@/lib/i18n/types'
import { getDateFnsLocale, getTituloMes, interpolate } from './ofrendaLocale'
import { formatWeekRangeLabel, groupServiciosByWeek } from './exportWeekUtils'
import { SacosConfigPanel } from './SacosConfigPanel'
import { PlanMonthNavigator } from './PlanMonthNavigator'
import { formatOfrendaActionError, isOfrendaDbConstraintError } from './ofrendaDbErrors'
import { PulpitoSection } from './pulpito/PulpitoSection'
import { OfrendaDangerConfirmButton } from './OfrendaDangerConfirmButton'

type Section = 'general' | 'laborOfrenda' | 'laborPulpito'
type GeneralTab = 'plan' | 'personas' | 'generar' | 'exportar'
type LaborTab = 'personas' | 'generar' | 'plano' | 'exportar'

// Orden canónico compartido por las tres secciones: vista principal → Personas → Generar → Exportar
const GENERAL_TAB_DEFS: { id: GeneralTab; labelKey: TranslationKey; icon: React.ElementType }[] = [
    { id: 'plan', labelKey: 'ofrenda.tabs.planGeneral', icon: Gift },
    { id: 'personas', labelKey: 'ofrenda.tabs.peopleGeneral', icon: Users },
    { id: 'generar', labelKey: 'ofrenda.tabs.generateGeneral', icon: Sparkles },
    { id: 'exportar', labelKey: 'ofrenda.tabs.exportGeneral', icon: Download },
]

const LABOR_TAB_DEFS: { id: LaborTab; labelKey: TranslationKey; icon: React.ElementType }[] = [
    { id: 'plano', labelKey: 'ofrenda.tabs.planoMap', icon: Map },
    { id: 'personas', labelKey: 'ofrenda.tabs.planoPeople', icon: Users },
    { id: 'generar', labelKey: 'ofrenda.tabs.generatePlano', icon: Sparkles },
    { id: 'exportar', labelKey: 'ofrenda.tabs.exportPlano', icon: Download },
]

// Esqueleto de carga del plano (sin useI18n: el fallback de dynamic() puede SSR sin contexto).
function PlanoLoadingSkeleton() {
    return (
        <div
            className="min-h-[52dvh] h-[calc(100dvh-18rem)] max-h-[72dvh] bg-muted rounded-2xl animate-pulse"
            aria-busy="true"
            aria-label={getStaticI18n().t('ofrenda.plano.loading')}
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
    isAdmin: boolean
    /** Permisos granulares por sección; si faltan, se usa canEdit como fallback. */
    perms?: {
        laborGeneral?: boolean
        miembros?: boolean
        plano?: boolean
        planoPersonas?: boolean
        pulpito?: boolean
    }
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
    isAdmin,
    perms,
}: Readonly<Props>) {
    // Permisos granulares con fallback al canEdit clásico (ADMIN/EDITOR)
    const canLaborGeneral   = perms?.laborGeneral ?? canEdit
    const canMiembros       = perms?.miembros ?? canEdit
    const canPlano          = perms?.plano ?? canEdit
    const canPlanoPersonas  = perms?.planoPersonas ?? canEdit
    const canPulpito        = perms?.pulpito ?? canEdit
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

    // ── Alcance Semana/Mes en Labores generales (como Labor Púlpito) ─────────
    const [generalScope, setGeneralScope] = useState<'week' | 'month'>('month')
    const [generalWeekIndex, setGeneralWeekIndex] = useState(0)
    // Al retroceder de mes en modo semana: aterrizar en la ÚLTIMA semana del mes cargado.
    const [pendingLastWeek, setPendingLastWeek] = useState(false)

    const generalWeeks = useMemo(
        () => (plan ? groupServiciosByWeek(plan.servicios) : []),
        [plan],
    )

    useEffect(() => {
        if (pendingLastWeek) {
            if (generalWeeks.length > 0 && !isLoading) {
                setGeneralWeekIndex(generalWeeks.length - 1)
                setPendingLastWeek(false)
            }
            return
        }
        if (generalWeekIndex > Math.max(0, generalWeeks.length - 1)) {
            setGeneralWeekIndex(Math.max(0, generalWeeks.length - 1))
        }
    }, [generalWeekIndex, generalWeeks.length, pendingLastWeek, isLoading, generalWeeks])

    const weekModeActive = section === 'general' && generalScope === 'week' && generalWeeks.length > 0

    const displayTitle = weekModeActive
        ? `${interpolate(t('ofrenda.export.scope.weekChip'), {
              n: Math.min(generalWeekIndex, generalWeeks.length - 1) + 1,
              total: generalWeeks.length,
          })} · ${formatWeekRangeLabel(generalWeeks[Math.min(generalWeekIndex, generalWeeks.length - 1)], getDateFnsLocale(language))}`
        : tituloMes

    const navigateDisplay = useCallback((delta: number) => {
        if (!(section === 'general' && generalScope === 'week')) {
            void navigate(delta)
            return
        }
        const next = generalWeekIndex + delta
        if (next < 0) {
            setPendingLastWeek(true)
            void navigate(-1)
            return
        }
        if (next > generalWeeks.length - 1) {
            setGeneralWeekIndex(0)
            void navigate(1)
            return
        }
        setGeneralWeekIndex(next)
    }, [section, generalScope, generalWeekIndex, generalWeeks.length, navigate])

    // Plan filtrado a la semana visible (solo tabla del Plan en modo semana)
    const planForView = useMemo(() => {
        if (!plan || !weekModeActive) return plan
        const week = generalWeeks[Math.min(generalWeekIndex, generalWeeks.length - 1)] ?? []
        const ids = new Set(week.map(s => s.id))
        return { ...plan, servicios: week, asignaciones: plan.asignaciones.filter(a => ids.has(a.servicio_id)) }
    }, [plan, weekModeActive, generalWeeks, generalWeekIndex])

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
        <div className="ofrenda-liquid-scope min-h-dvh bg-background">
            {/* ── Hero liquid (marino + dorado) ───────────────────────────── */}
            <div className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
                <PageHero
                    title={t('ofrenda.title')}
                    subtitle={t('ofrenda.subtitle')}
                    icon={Gift}
                    animate={false}
                />
            </div>

            {/* ── Nav (secciones + mes + sub-pestañas) ─────────────────────── */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 pt-3">
                {/* ── Secciones + mes global ───────────────────────────── */}
                <div className="max-w-5xl mx-auto px-4 pb-2 space-y-3">
                    <div
                        className="ofrenda-liquid-segment w-full"
                        role="tablist"
                        aria-label={t('ofrenda.title')}
                    >
                        {(['general', 'laborOfrenda', 'laborPulpito'] as const).map(sec => {
                            const active = section === sec
                            const activeClass =
                                sec === 'general'
                                    ? 'bg-emerald-600 text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(5,150,105,0.32)]'
                                    : sec === 'laborOfrenda'
                                        ? 'bg-blue-600 text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(37,99,235,0.32)]'
                                        : 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.32)]'
                            const sectionKey: TranslationKey =
                                sec === 'general'
                                    ? 'ofrenda.sections.general'
                                    : sec === 'laborOfrenda'
                                        ? 'ofrenda.sections.laborOfrenda'
                                        : 'ofrenda.sections.laborPulpito'
                            return (
                                <button
                                    key={sec}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    data-testid={`ofrenda-section-${sec}`}
                                    onClick={() => handleSectionChange(sec)}
                                    className={`flex-1 px-2.5 py-2.5 min-h-[44px] rounded-[0.7rem] text-xs font-bold leading-tight transition-all touch-manipulation ${
                                        active ? activeClass : 'text-slate-500 hover:text-[#1f2e85] hover:bg-white/60'
                                    }`}
                                >
                                    <span suppressHydrationWarning>{t(sectionKey)}</span>
                                </button>
                            )
                        })}
                    </div>

                    {section === 'general' && (
                        <div
                            className="inline-flex w-full sm:w-auto rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1"
                            role="group"
                            aria-label={t('ofrenda.sections.general')}
                        >
                            {(['week', 'month'] as const).map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setGeneralScope(s)}
                                    data-testid={`ofrenda-general-scope-${s}`}
                                    className={`flex-1 sm:flex-none px-5 py-2 min-h-[44px] rounded-[0.6rem] text-xs font-bold touch-manipulation transition-all ${
                                        generalScope === s
                                            ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]'
                                            : 'text-slate-500 hover:text-[#1f2e85]'
                                    }`}
                                >
                                    <span suppressHydrationWarning>
                                        {t(s === 'week' ? 'ofrenda.planoGenerate.scope.week' : 'ofrenda.planoGenerate.scope.month')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {section !== 'laborPulpito' && (
                        <PlanMonthNavigator
                            title={displayTitle}
                            isLoading={isLoading}
                            onPrev={() => navigateDisplay(-1)}
                            onNext={() => navigateDisplay(1)}
                            prevAriaLabel={weekModeActive ? t('common.previous') : t('ofrenda.month.prev')}
                            nextAriaLabel={weekModeActive ? t('common.next') : t('ofrenda.month.next')}
                        />
                    )}
                </div>

                {/* ── Sub-tabs (secciones basadas en plan mensual) ─────── */}
                {section !== 'laborPulpito' && (
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
                                    ? 'text-emerald-700 dark:text-emerald-300 border-emerald-500'
                                    : 'text-blue-700 dark:text-blue-300 border-blue-600'
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() =>
                                        section === 'general'
                                            ? handleGeneralTabChange(tab.id as GeneralTab)
                                            : handleLaborTabChange(tab.id as LaborTab)
                                    }
                                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-t-xl whitespace-nowrap transition-all border-b-[2.5px] ${
                                        active
                                            ? `${accent} bg-[#f8f3e8]`
                                            : 'text-muted-foreground border-transparent hover:text-foreground hover:border-[rgba(184,150,74,0.32)]'
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
                )}
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
                            {/* Configuración de sacos (solo editor, solo cuando hay plan) */}
                            {canLaborGeneral && plan && (
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
                                if (planForView) return (
                                    <PlanTable
                                        plan={planForView}
                                        miembros={miembros}
                                        canEdit={canLaborGeneral}
                                        onAsignacionChange={handleAsignacionChange}
                                    />
                                )
                                return (
                                <EmptyPlanState
                                    tituloMes={tituloMes}
                                    canEdit={canLaborGeneral}
                                    onGoToGenerate={() => handleGeneralTabChange('generar')}
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
                                canEdit={canMiembros}
                                onChange={handleMiembrosChange}
                            />
                        </motion.div>
                    )}

                    {section === 'general' && generalTab === 'generar' && (
                        <motion.div
                            key="general-generar"
                            initial={false}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                        >
                            <GeneralGeneratePanel
                                hasPlan={!!plan}
                                tituloMes={tituloMes}
                                isLoading={isLoading}
                                canEdit={canLaborGeneral}
                                onGenerar={handleGenerar}
                                onEliminar={handleEliminarPlan}
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
                            <PlanoPersonasManager canEdit={canPlanoPersonas} />
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
                                canEdit={canPlano}
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
                                canEdit={canPlano}
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

                    {/* ── LABOR PÚLPITO ───────────────────────────────── */}
                    {section === 'laborPulpito' && (
                        <motion.div
                            key="labor-pulpito"
                            initial={false}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="min-w-0"
                        >
                            <PulpitoSection canEdit={canPulpito} isAdmin={isAdmin} />
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
    return (
        <OfrendaDangerConfirmButton
            label={t('ofrenda.deletePlan')}
            confirmText={interpolate(t('ofrenda.deletePlan.confirm'), { month: tituloMes })}
            isLoading={isLoading}
            onConfirm={onConfirm}
            testIdPrefix="ofrenda-delete-plan"
        />
    )
}

type GeneralGenerateGrupo = 'all' | 1 | 2

// Panel Generar de Labores generales — mismo patrón que Labor Ofrenda y Labor Púlpito.
function GeneralGeneratePanel({
    hasPlan,
    tituloMes,
    isLoading,
    canEdit,
    onGenerar,
    onEliminar,
}: Readonly<{
    hasPlan: boolean
    tituloMes: string
    isLoading: boolean
    canEdit: boolean
    onGenerar: (grupo?: 1 | 2) => void
    onEliminar: () => void
}>) {
    const { t } = useI18n()
    const [grupo, setGrupo] = useState<GeneralGenerateGrupo>('all')

    if (!canEdit) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-[rgba(184,150,74,0.3)] p-8 text-center text-sm text-slate-500">
                <span suppressHydrationWarning>{t('ofrenda.generalGenerate.desc')}</span>
            </div>
        )
    }

    const modos: { id: GeneralGenerateGrupo; label: string; desc: string }[] = [
        { id: 'all', label: t('ofrenda.regenerate.all'), desc: t('ofrenda.generalGenerate.modeAllDesc') },
        { id: 1, label: t('ofrenda.regenerate.g1'), desc: t('ofrenda.generalGenerate.modeG1Desc') },
        { id: 2, label: t('ofrenda.regenerate.g2'), desc: t('ofrenda.generalGenerate.modeG2Desc') },
    ]

    return (
        <div className="ofrenda-liquid-card space-y-5 p-4 sm:p-5" data-testid="ofrenda-general-generate-panel">
            <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span suppressHydrationWarning>{t('ofrenda.generalGenerate.title')}</span>
                </h3>
                <p className="mt-1 text-sm text-muted-foreground" suppressHydrationWarning>
                    {t('ofrenda.generalGenerate.desc')}
                </p>
            </div>

            {hasPlan && (
                <div className="grid gap-2 sm:grid-cols-3">
                    {modos.map(m => {
                        const active = grupo === m.id
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setGrupo(m.id)}
                                aria-pressed={active}
                                data-testid={`ofrenda-general-mode-${m.id === 'all' ? 'all' : `g${m.id}`}`}
                                className={`text-left rounded-2xl border-[1.5px] p-3 min-h-[64px] transition-all touch-manipulation ${
                                    active
                                        ? 'border-[#b8964a] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] shadow-[0_3px_12px_rgba(31,46,133,0.16)]'
                                        : 'border-[rgba(184,150,74,0.25)] hover:border-[#b8964a]/60 hover:bg-[#f8f3e8]/50'
                                }`}
                            >
                                <span className={`block text-sm font-bold ${active ? 'text-[#1f2e85]' : 'text-foreground'}`}>
                                    {m.label}
                                </span>
                                <span className="mt-0.5 block text-xs text-muted-foreground leading-snug">{m.desc}</span>
                            </button>
                        )
                    })}
                </div>
            )}

            <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => onGenerar(hasPlan && grupo !== 'all' ? grupo : undefined)}
                disabled={isLoading}
                data-testid="ofrenda-general-generate-btn"
                className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white text-sm font-bold shadow-[0_4px_16px_rgba(31,46,133,0.32)] hover:shadow-[0_6px_22px_rgba(31,46,133,0.42)] transition-shadow disabled:opacity-50 touch-manipulation"
            >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span suppressHydrationWarning>{hasPlan ? t('ofrenda.regenerate') : t('ofrenda.generate')}</span>
            </motion.button>

            {hasPlan && (
                <div className="pt-4 border-t border-border/50">
                    <DeletePlanButton
                        tituloMes={tituloMes}
                        isLoading={isLoading}
                        onConfirm={onEliminar}
                    />
                </div>
            )}
        </div>
    )
}

function EmptyPlanState({
    tituloMes,
    canEdit,
    onGoToGenerate,
    isLoading,
}: Readonly<{
    tituloMes: string
    canEdit: boolean
    onGoToGenerate: () => void
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
                    onClick={onGoToGenerate}
                    disabled={isLoading}
                    data-testid="ofrenda-empty-go-generate"
                    className="flex items-center gap-2 px-6 py-3 border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] hover:shadow-[0_6px_22px_rgba(31,46,133,0.42)] text-white font-bold rounded-2xl shadow-[0_4px_16px_rgba(31,46,133,0.32)] transition-shadow disabled:opacity-50 touch-manipulation min-h-[48px]"
                >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {t('ofrenda.emptyPlan.goToGenerate')}
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
