'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { interpolate, getDateFnsLocale } from '../ofrendaLocale'
import { useOfrendaToast } from '../ofrendaFeedback'
import { invokePlanoAction } from './planoInvoke'
import { generarPlanoLabor, type PlanoGenerateMode, type PlanoGenerateScope } from './planoGenerateActions'
import { PlanoGenerateRulesInfo } from './PlanoGenerateRulesInfo'
import { PlanoGenerateActionInfo } from './PlanoGenerateActionInfo'
import type { PlanCompleto } from '../actions'
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
        'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25',
    regenerar:
        'border-2 border-blue-600 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/60',
    rellenar:
        'border border-blue-500/40 bg-background text-blue-700 hover:bg-blue-500/5 dark:text-blue-300',
}

export function PlanoGeneratePanel({ plan, anio, mes, canEdit, onGenerated }: Readonly<Props>) {
    const { t, language } = useI18n()
    const { quickSuccess, planError } = useOfrendaToast()
    const [scope, setScope] = useState<PlanoGenerateScope>('month')
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

    const run = async (modo: PlanoGenerateMode) => {
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

    const actions: Array<{ m: PlanoGenerateMode; label: string }> = [
        { m: 'generar', label: t('ofrenda.planoGenerate.generate') },
        { m: 'regenerar', label: t('ofrenda.planoGenerate.regenerate') },
        { m: 'rellenar', label: t('ofrenda.planoGenerate.fill') },
    ]

    return (
        <div className="space-y-4" data-testid="ofrenda-plano-generate-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
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
                            data-testid={`ofrenda-plano-generate-scope-${s}`}
                            onClick={() => setScope(s)}
                            className={`flex-1 sm:flex-none px-4 py-2 min-h-[44px] rounded-[10px] text-xs font-bold touch-manipulation ${
                                scope === s ? 'bg-blue-600 text-white shadow' : 'text-muted-foreground'
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
        </div>
    )
}
