'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListChecks, Users, Sparkles, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { TranslationKey } from '@/lib/i18n/types'
import { useOfrendaToast } from '../ofrendaFeedback'
import { PlanMonthNavigator } from '../PlanMonthNavigator'
import { getPulpitoData, type PulpitoData } from './actions'
import { rangoDePulpito, desplazarRef, type PulpitoScope } from './pulpitoDateRange'
import { PulpitoPlanPanel } from './PulpitoPlanPanel'
import { PulpitoPersonasPanel } from './PulpitoPersonasPanel'
import { PulpitoGeneratePanel } from './PulpitoGeneratePanel'
import { PulpitoExportPanel } from './PulpitoExportPanel'
import type { PulpitoRol } from '@/lib/utils/pulpitoAvailability'

type PulpitoTab = 'plan' | 'personas' | 'generar' | 'exportar'

const TAB_DEFS: { id: PulpitoTab; labelKey: TranslationKey; icon: React.ElementType }[] = [
    { id: 'plan', labelKey: 'ofrenda.pulpito.tabs.plan', icon: ListChecks },
    { id: 'personas', labelKey: 'ofrenda.pulpito.tabs.personas', icon: Users },
    { id: 'generar', labelKey: 'ofrenda.pulpito.tabs.generar', icon: Sparkles },
    { id: 'exportar', labelKey: 'ofrenda.pulpito.tabs.exportar', icon: Download },
]

interface Props {
    canEdit: boolean
    isAdmin: boolean
}

export function PulpitoSection({ canEdit, isAdmin }: Readonly<Props>) {
    const { t, language } = useI18n()
    const feedback = useOfrendaToast()
    const locale = language === 'ca-ES' ? ca : es

    const [scope, setScope] = useState<PulpitoScope>('week')
    const [refDate, setRefDate] = useState<Date>(() => new Date())
    const [tab, setTab] = useState<PulpitoTab>('plan')
    const [data, setData] = useState<PulpitoData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const rango = useMemo(() => rangoDePulpito(refDate, scope), [refDate, scope])

    const load = useCallback(async () => {
        setIsLoading(true)
        const result = await getPulpitoData(rango.inicio, rango.fin)
        setIsLoading(false)
        if (result.error) {
            feedback.planError(t('common.error'), result.error)
            setData({ cultos: [], hermanos: [] })
            return
        }
        setData(result.data ?? { cultos: [], hermanos: [] })
    }, [rango.inicio, rango.fin, t, feedback])

    useEffect(() => { void load() }, [load])

    const navigate = (delta: number) => {
        feedback.dismiss()
        setRefDate(prev => desplazarRef(prev, scope, delta))
    }

    const changeScope = (next: PulpitoScope) => {
        feedback.dismiss()
        setScope(next)
    }

    const rolLabel = useCallback(
        (rol: PulpitoRol): string => t(`ofrenda.pulpito.roles.${rol}` as TranslationKey),
        [t],
    )

    const diaLabel = useCallback(
        (fecha: string): string => {
            const d = new Date(`${fecha}T00:00:00`)
            const s = format(d, 'EEE d MMM', { locale })
            return s.charAt(0).toUpperCase() + s.slice(1)
        },
        [locale],
    )

    const periodLabel = useMemo(() => {
        if (scope === 'month') {
            const s = format(refDate, 'MMMM yyyy', { locale })
            return s.charAt(0).toUpperCase() + s.slice(1)
        }
        const ini = new Date(`${rango.inicio}T00:00:00`)
        const fin = new Date(`${rango.fin}T00:00:00`)
        return `${format(ini, 'd', { locale })} – ${format(fin, 'd MMM yyyy', { locale })}`
    }, [scope, refDate, rango.inicio, rango.fin, locale])

    const fileSlug = useMemo(
        () => (scope === 'month' ? format(refDate, 'yyyy-MM') : rango.inicio),
        [scope, refDate, rango.inicio],
    )

    const cultos = data?.cultos ?? []
    const hermanos = data?.hermanos ?? []

    return (
        <div className="space-y-4" data-testid="pulpito-section">
            {/* Scope + navegador */}
            <div className="space-y-3">
                <div
                    className="inline-flex w-full sm:w-auto rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1"
                    role="group"
                    aria-label={t('ofrenda.pulpito.title')}
                >
                    {(['week', 'month'] as const).map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => changeScope(s)}
                            data-testid={`pulpito-scope-${s}`}
                            className={`flex-1 sm:flex-none px-5 py-2 min-h-[44px] rounded-[0.6rem] text-xs font-bold touch-manipulation transition-all ${
                                scope === s
                                    ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]'
                                    : 'text-slate-500 hover:text-[#1f2e85]'
                            }`}
                        >
                            {t(s === 'week' ? 'ofrenda.planoGenerate.scope.week' : 'ofrenda.planoGenerate.scope.month')}
                        </button>
                    ))}
                </div>

                <PlanMonthNavigator
                    title={periodLabel}
                    isLoading={isLoading}
                    onPrev={() => navigate(-1)}
                    onNext={() => navigate(1)}
                    prevAriaLabel={t('common.previous')}
                    nextAriaLabel={t('common.next')}
                />
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-border/40">
                {TAB_DEFS.map(tabDef => {
                    const Icon = tabDef.icon
                    const active = tab === tabDef.id
                    return (
                        <button
                            key={tabDef.id}
                            type="button"
                            onClick={() => { feedback.dismiss(); setTab(tabDef.id) }}
                            data-testid={`pulpito-tab-${tabDef.id}`}
                            role="tab"
                            aria-selected={active}
                            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-t-xl whitespace-nowrap transition-all border-b-[2.5px] ${
                                active
                                    ? 'text-blue-700 dark:text-blue-300 border-blue-600 bg-[#f8f3e8]'
                                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-[rgba(184,150,74,0.32)]'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {t(tabDef.labelKey)}
                        </button>
                    )
                })}
            </div>

            {/* Contenido */}
            {isLoading && !data ? (
                <PulpitoSkeleton />
            ) : (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={tab}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16 }}
                    >
                        {tab === 'plan' && (
                            <PulpitoPlanPanel
                                cultos={cultos}
                                canEdit={canEdit}
                                diaLabel={diaLabel}
                                rolLabel={rolLabel}
                                onChanged={load}
                            />
                        )}
                        {tab === 'personas' && (
                            <PulpitoPersonasPanel
                                hermanos={hermanos}
                                rolLabel={rolLabel}
                                isAdmin={isAdmin}
                                onChanged={load}
                            />
                        )}
                        {tab === 'generar' && (
                            <PulpitoGeneratePanel
                                fechaInicio={rango.inicio}
                                fechaFin={rango.fin}
                                canEdit={canEdit}
                                onGenerated={load}
                                rolLabel={rolLabel}
                                formatFecha={diaLabel}
                            />
                        )}
                        {tab === 'exportar' && (
                            <PulpitoExportPanel
                                cultos={cultos}
                                periodLabel={periodLabel}
                                fileSlug={fileSlug}
                                diaLabel={diaLabel}
                                rolLabel={rolLabel}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    )
}

function PulpitoSkeleton() {
    return (
        <div className="space-y-3 animate-pulse" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => i).map(i => (
                <div key={i} className="h-24 bg-muted rounded-2xl" />
            ))}
        </div>
    )
}
