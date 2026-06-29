'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { interpolate } from '../ofrendaLocale'
import { useOfrendaToast } from '../ofrendaFeedback'
import { invokePlanoAction } from './planoInvoke'
import { generarPlanoLabor, type PlanoGenerateMode, type PlanoGenerateScope } from './planoGenerateActions'
import { PlanoGenerateRulesInfo } from './PlanoGenerateRulesInfo'
import type { PlanCompleto } from '../actions'
import { formatWeekRangeLabel, groupServiciosByWeek } from '../exportWeekUtils'
import { getDateFnsLocale } from '../ofrendaLocale'

interface Props {
    plan: PlanCompleto | null
    anio: number
    mes: number
    canEdit: boolean
    onGenerated: () => void
}

export function PlanoGeneratePanel({ plan, anio, mes, canEdit, onGenerated }: Readonly<Props>) {
    const { t, language } = useI18n()
    const { quickSuccess, planError } = useOfrendaToast()
    const [scope, setScope] = useState<PlanoGenerateScope>('month')
    const [modo, setModo] = useState<PlanoGenerateMode>('generar')
    const [busy, setBusy] = useState(false)

    const weekOptions = useMemo(() => {
        if (!plan) return []
        const dateLocale = getDateFnsLocale(language)
        return groupServiciosByWeek(plan.servicios).map(week => ({
            semanaIso: week[0]?.semana_iso ?? 0,
            label: formatWeekRangeLabel(week, dateLocale),
        }))
    }, [plan, language])
    const [semanaIso, setSemanaIso] = useState<number | undefined>(undefined)
    const selectedSemana = semanaIso ?? weekOptions[0]?.semanaIso

    const run = async () => {
        if (!plan || busy) return
        setBusy(true)
        const res = await invokePlanoAction(() =>
            generarPlanoLabor({
                anio,
                mes,
                alcance: scope,
                semanaIso: scope === 'week' ? selectedSemana : undefined,
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
        onGenerated()
    }

    if (!plan) {
        return (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {t('ofrenda.planoGenerate.noPlan')}
            </div>
        )
    }

    return (
        <div className="space-y-4" data-testid="ofrenda-plano-generate-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            {t('ofrenda.planoGenerate.title')}
                        </h3>
                        <PlanoGenerateRulesInfo />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t('ofrenda.planoGenerate.desc')}</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <div className="inline-flex w-full sm:w-auto rounded-xl border border-border bg-muted/40 p-0.5" role="group">
                    {(['week', 'month'] as const).map(s => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setScope(s)}
                            className={`flex-1 sm:flex-none px-4 py-2 min-h-[44px] rounded-[10px] text-xs font-bold touch-manipulation ${
                                scope === s ? 'bg-amber-600 text-white shadow' : 'text-muted-foreground'
                            }`}
                        >
                            {t(s === 'week' ? 'ofrenda.planoGenerate.scope.week' : 'ofrenda.planoGenerate.scope.month')}
                        </button>
                    ))}
                </div>

                {scope === 'week' && weekOptions.length > 0 && (
                    <select
                        value={selectedSemana}
                        onChange={e => setSemanaIso(Number(e.target.value))}
                        className="w-full sm:w-auto px-3 py-2 min-h-[44px] rounded-xl border border-border bg-background text-sm"
                    >
                        {weekOptions.map(w => (
                            <option key={w.semanaIso} value={w.semanaIso}>
                                {w.label}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {canEdit && (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {([
                        { m: 'generar' as const, label: t('ofrenda.planoGenerate.generate') },
                        { m: 'regenerar' as const, label: t('ofrenda.planoGenerate.regenerate') },
                        { m: 'rellenar' as const, label: t('ofrenda.planoGenerate.fill') },
                    ]).map(btn => (
                        <button
                            key={btn.m}
                            type="button"
                            disabled={busy}
                            onClick={() => { setModo(btn.m); void run() }}
                            className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-50 touch-manipulation"
                        >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {btn.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
