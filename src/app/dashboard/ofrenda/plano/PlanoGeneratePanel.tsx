'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { interpolate, getDateFnsLocale } from '../ofrendaLocale'
import { useOfrendaToast } from '../ofrendaFeedback'
import { invokePlanoAction } from './planoInvoke'
import {
    eliminarPlanoAsignaciones,
    generarPlanoLabor,
    type PlanoGenerateMode,
    type PlanoGenerateScope,
} from './planoGenerateActions'
import { OfrendaDangerConfirmButton } from '../OfrendaDangerConfirmButton'
import { getPlanoAsignacionCountsForPlan } from './planoActions'
import { PlanoGenerateRulesInfo } from './PlanoGenerateRulesInfo'
import { PlanoGenerateActionInfo } from './PlanoGenerateActionInfo'
import { PlanoGenerateWeekPicker } from './PlanoGenerateWeekPicker'
import { buildWeekFillInfo } from './planoGenerateWeekStatus'
import { PlanoServiceStrip } from './PlanoServiceStrip'
import { PLANO_SERVICE_ACCENT } from './planoServiceAccent'
import { pickDefaultServicioId, todayIsoLocal } from './planoDefaultServicio'
import { planoServicioChipLabel } from './planoChipLabel'
import type { OfrServicio, PlanCompleto } from '../actions'
import { formatWeekRangeLabel, groupServiciosByWeek } from '../exportWeekUtils'

interface Props {
    plan: PlanCompleto | null
    anio: number
    mes: number
    canEdit: boolean
    onGenerated: () => void
}

const ACTION_STYLES: Record<PlanoGenerateMode, string> = {
    generar:
        'border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white shadow-[0_4px_16px_rgba(31,46,133,0.32)] hover:shadow-[0_6px_22px_rgba(31,46,133,0.42)]',
    regenerar:
        'border-[1.5px] border-[rgba(184,150,74,0.5)] bg-[#f8f3e8] text-[#1f2e85] hover:bg-[#f3ead4]',
    rellenar:
        'border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white text-[#1f2e85] hover:bg-[#f8f3e8]',
}

export function PlanoGeneratePanel({ plan, anio, mes, canEdit, onGenerated }: Readonly<Props>) {
    const { t, language } = useI18n()
    const { quickSuccess, planError } = useOfrendaToast()
    const [scope, setScope] = useState<PlanoGenerateScope>('month')
    const [busy, setBusy] = useState(false)
    const [countsByServicio, setCountsByServicio] = useState<Record<string, number>>({})

    const turnLabels = useMemo(
        () => ({
            jueves: t('ofrenda.plano.personas.sectionJueves'),
            domManana: t('ofrenda.plano.personas.sectionDomManana'),
            domTarde: t('ofrenda.plano.personas.sectionDomTarde'),
        }),
        [t],
    )

    const planId = plan?.plan.id ?? null
    const loadCounts = useCallback(async () => {
        if (!planId) return
        const res = await invokePlanoAction(() => getPlanoAsignacionCountsForPlan(planId))
        if (res.data) setCountsByServicio(res.data)
    }, [planId])

    useEffect(() => {
        void loadCounts()
    }, [loadCounts])

    const weekGroups = useMemo(() => {
        if (!plan) return []
        return groupServiciosByWeek(plan.servicios)
    }, [plan])

    const countMap = useMemo(() => new Map(Object.entries(countsByServicio)), [countsByServicio])

    const weekOptions = useMemo(() => {
        if (!plan) return []
        const dateLocale = getDateFnsLocale(language)
        const sacos = plan.plan
        return weekGroups.map((week, index) => ({
            semanaIso: week[0]?.semana_iso ?? 0,
            weekIndex: index + 1,
            totalWeeks: weekGroups.length,
            label: formatWeekRangeLabel(week, dateLocale),
            fill: buildWeekFillInfo(week, countMap, sacos),
        }))
    }, [plan, weekGroups, language, countMap])

    const [semanaIso, setSemanaIso] = useState<number | undefined>(undefined)
    const selectedSemana = semanaIso ?? weekOptions[0]?.semanaIso

    // ── Selección de día (alcance «día») ─────────────────────────────────────
    const servicios = plan?.servicios ?? []
    const [servicioId, setServicioId] = useState<string | null>(null)
    const servicio = servicios.find(s => s.id === servicioId) ?? servicios[0] ?? null

    useEffect(() => {
        if (!plan?.servicios.length) {
            setServicioId(null)
            return
        }
        setServicioId(prev => {
            if (prev && plan.servicios.some(s => s.id === prev)) return prev
            return pickDefaultServicioId(plan.servicios, todayIsoLocal())
        })
    }, [plan])

    const diaLabel = useCallback(
        (s: OfrServicio) => planoServicioChipLabel(s, t),
        [t],
    )

    const run = async (modo: PlanoGenerateMode) => {
        if (!plan || busy) return
        setBusy(true)
        const res = await invokePlanoAction(() =>
            generarPlanoLabor({
                anio,
                mes,
                alcance: scope,
                semanaIso: scope === 'week' ? selectedSemana : undefined,
                servicioId: scope === 'day' ? (servicio?.id ?? undefined) : undefined,
                modo,
            }),
        )
        setBusy(false)
        if (!('ok' in res) || !res.ok) {
            const err = 'error' in res ? res.error : ''
            planError(t('ofrenda.planoGenerate.error'), err ?? '')
            return
        }
        quickSuccess(
            t('ofrenda.planoGenerate.success'),
            interpolate(t('ofrenda.planoGenerate.successDesc'), { n: String(res.asignados) }),
        )
        await loadCounts()
        onGenerated()
    }

    const runEliminar = async () => {
        if (!plan || busy) return
        setBusy(true)
        const res = await invokePlanoAction(() =>
            eliminarPlanoAsignaciones({
                anio,
                mes,
                alcance: scope,
                semanaIso: scope === 'week' ? selectedSemana : undefined,
                servicioId: scope === 'day' ? (servicio?.id ?? undefined) : undefined,
            }),
        )
        setBusy(false)
        if (!('ok' in res) || !res.ok) {
            const err = 'error' in res ? res.error : ''
            planError(t('ofrenda.planoGenerate.deleteError'), err ?? '')
            return
        }
        quickSuccess(
            t('ofrenda.planoGenerate.deleted'),
            interpolate(t('ofrenda.planoGenerate.deletedDesc'), { n: String(res.eliminados) }),
        )
        await loadCounts()
        onGenerated()
    }

    if (!plan) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-[rgba(184,150,74,0.3)] p-8 text-center text-sm text-slate-500">
                {t('ofrenda.planoGenerate.noPlan')}
            </div>
        )
    }

    const actions: Array<{ m: PlanoGenerateMode; label: string }> = [
        { m: 'generar', label: t('ofrenda.planoGenerate.generate') },
        { m: 'regenerar', label: t('ofrenda.planoGenerate.regenerate') },
        { m: 'rellenar', label: t('ofrenda.planoGenerate.fill') },
    ]

    return (
        <div className="ofrenda-liquid-card space-y-4 p-4 sm:p-5" data-testid="ofrenda-plano-generate-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            {t('ofrenda.planoGenerate.title')}
                        </h3>
                        <PlanoGenerateRulesInfo />
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{t('ofrenda.planoGenerate.desc')}</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <div className="inline-flex w-full sm:w-auto rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-1" role="group">
                    {(['day', 'week', 'month'] as const).map(s => {
                        const scopeKey =
                            s === 'day'
                                ? 'ofrenda.planoGenerate.scope.day'
                                : s === 'week'
                                    ? 'ofrenda.planoGenerate.scope.week'
                                    : 'ofrenda.planoGenerate.scope.month'
                        return (
                            <button
                                key={s}
                                type="button"
                                data-testid={`ofrenda-plano-generate-scope-${s}`}
                                onClick={() => setScope(s)}
                                className={`flex-1 sm:flex-none px-4 py-2 min-h-[44px] rounded-[0.6rem] text-xs font-bold touch-manipulation transition-all ${
                                    scope === s ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)]' : 'text-slate-500 hover:text-[#1f2e85]'
                                }`}
                            >
                                {t(scopeKey)}
                            </button>
                        )
                    })}
                </div>

                {scope === 'week' && weekOptions.length > 0 && (
                    <PlanoGenerateWeekPicker
                        weeks={weekOptions}
                        selectedSemanaIso={selectedSemana}
                        onSelect={setSemanaIso}
                        disabled={busy}
                        turnLabels={turnLabels}
                    />
                )}
            </div>

            {scope === 'day' && servicios.length > 0 && (
                <PlanoServiceStrip
                    servicios={servicios}
                    activeId={servicio?.id ?? ''}
                    accent={PLANO_SERVICE_ACCENT}
                    diaLabel={diaLabel}
                    onSelect={setServicioId}
                />
            )}

            {canEdit && (
                <div className="flex flex-col gap-2">
                    {actions.map(({ m, label }) => (
                        <div key={m} className="flex items-stretch gap-1.5 w-full sm:max-w-md">
                            <button
                                type="button"
                                data-testid={`ofrenda-plano-generate-${m}`}
                                disabled={busy}
                                onClick={() => void run(m)}
                                className={`flex flex-1 items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold disabled:opacity-50 touch-manipulation ${ACTION_STYLES[m]}`}
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                <span suppressHydrationWarning>{label}</span>
                            </button>
                            <PlanoGenerateActionInfo mode={m} />
                        </div>
                    ))}
                </div>
            )}

            {canEdit && (
                <div className="pt-4 border-t border-border/50">
                    <OfrendaDangerConfirmButton
                        label={t('ofrenda.planoGenerate.deleteBtn')}
                        confirmText={t('ofrenda.planoGenerate.deleteConfirm')}
                        isLoading={busy}
                        onConfirm={() => void runEliminar()}
                        testIdPrefix="ofrenda-plano-delete"
                    />
                </div>
            )}
        </div>
    )
}
