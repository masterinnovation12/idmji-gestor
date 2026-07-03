'use client'

import { useMemo, useState } from 'react'
import { Calendar, ChevronDown, Sun, Sunset } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { interpolate } from '../ofrendaLocale'
import { OfrendaLiquidShell } from '../OfrendaLiquidShell'
import type { OfrServicio } from '../actions'
import type { CultoFillStatus, WeekFillInfo, WeekFillStatus } from './planoGenerateWeekStatus'

export interface PlanoGenerateWeekOption {
    semanaIso: number
    weekIndex: number
    totalWeeks: number
    label: string
    fill: WeekFillInfo
}

interface Props {
    weeks: PlanoGenerateWeekOption[]
    selectedSemanaIso: number
    onSelect: (semanaIso: number) => void
    disabled?: boolean
    turnLabels: { jueves: string; domManana: string; domTarde: string }
}

const FILL_BADGE: Record<WeekFillStatus | CultoFillStatus, string> = {
    empty: 'bg-slate-100 text-slate-500 border-slate-200',
    partial: 'bg-amber-50 text-amber-800 border-amber-200',
    full: 'bg-emerald-50 text-emerald-800 border-emerald-200',
}

function cultoIcon(dia: OfrServicio['dia_tipo']) {
    if (dia === 'jueves') return Calendar
    if (dia === 'domingo') return Sun
    return Sunset
}

function cultoLabel(
    dia: OfrServicio['dia_tipo'],
    labels: Props['turnLabels'],
): string {
    if (dia === 'jueves') return labels.jueves
    if (dia === 'domingo') return labels.domManana
    return labels.domTarde
}

export function PlanoGenerateWeekPicker({
    weeks,
    selectedSemanaIso,
    onSelect,
    disabled = false,
    turnLabels,
}: Readonly<Props>) {
    const { t } = useI18n()
    const [open, setOpen] = useState(false)

    const selected = useMemo(
        () => weeks.find(w => w.semanaIso === selectedSemanaIso) ?? weeks[0],
        [weeks, selectedSemanaIso],
    )

    if (!weeks.length || !selected) return null

    const fillLabel = (status: WeekFillStatus | CultoFillStatus, kind: 'week' | 'culto') => {
        const prefix = kind === 'week' ? 'ofrenda.planoGenerate.weekFill' : 'ofrenda.planoGenerate.cultoFill'
        return t(`${prefix}.${status}` as 'ofrenda.planoGenerate.weekFill.empty')
    }

    const pick = (semanaIso: number) => {
        onSelect(semanaIso)
        setOpen(false)
    }

    return (
        <>
            <button
                type="button"
                disabled={disabled}
                data-testid="plano-generate-week-trigger"
                onClick={() => setOpen(true)}
                className="ofrenda-liquid-search w-full sm:w-auto flex items-center justify-between gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-[#1f2e85] touch-manipulation disabled:opacity-50"
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <span className="min-w-0 text-left">
                    <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
                        {interpolate(t('ofrenda.planoGenerate.weekPicker.weekChip'), {
                            n: String(selected.weekIndex),
                            total: String(selected.totalWeeks),
                        })}
                        {' · '}
                        {interpolate(t('ofrenda.planoGenerate.weekPicker.iso'), {
                            iso: String(selected.semanaIso),
                        })}
                    </span>
                    <span className="block truncate">{selected.label}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                    <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${FILL_BADGE[selected.fill.weekStatus]}`}
                        data-testid="plano-generate-week-trigger-status"
                    >
                        {fillLabel(selected.fill.weekStatus, 'week')}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden />
                </span>
            </button>

            <OfrendaLiquidShell
                open={open}
                onClose={() => setOpen(false)}
                ariaLabel={t('ofrenda.planoGenerate.weekPicker.headline')}
                title={t('ofrenda.planoGenerate.weekPicker.title')}
                headline={t('ofrenda.planoGenerate.weekPicker.headline')}
                accent="gold"
                testIdPrefix="plano-generate-week"
                currentLabel={t('ofrenda.planoGenerate.weekPicker.current')}
                currentValue={selected.label}
                currentTestId="plano-generate-week-current"
                unstyledBody
            >
                <div className="px-4 pb-4 space-y-2" data-testid="plano-generate-week-list">
                    {weeks.map(w => {
                        const active = w.semanaIso === selectedSemanaIso
                        return (
                            <button
                                key={w.semanaIso}
                                type="button"
                                data-testid={`plano-generate-week-option-${w.semanaIso}`}
                                aria-pressed={active}
                                onClick={() => pick(w.semanaIso)}
                                className={`w-full text-left rounded-xl border px-3 py-3 min-h-[44px] touch-manipulation transition-colors ${
                                    active
                                        ? 'border-[#b8964a] bg-[#1f2e85]/10 ring-2 ring-[#b8964a]/30'
                                        : 'border-[rgba(184,150,74,0.3)] bg-white hover:bg-[#f8f3e8]'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-[#1f2e85]">
                                            {interpolate(t('ofrenda.planoGenerate.weekPicker.weekChip'), {
                                                n: String(w.weekIndex),
                                                total: String(w.totalWeeks),
                                            })}
                                            {' · '}
                                            {interpolate(t('ofrenda.planoGenerate.weekPicker.iso'), {
                                                iso: String(w.semanaIso),
                                            })}
                                        </p>
                                        <p className="text-sm font-bold text-[#1f2e85] truncate">{w.label}</p>
                                    </div>
                                    <span
                                        className={`shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${FILL_BADGE[w.fill.weekStatus]}`}
                                    >
                                        {fillLabel(w.fill.weekStatus, 'week')}
                                    </span>
                                </div>
                                <ul className="mt-2 space-y-1" aria-label={w.label}>
                                    {w.fill.cultos.map(c => {
                                        const Icon = cultoIcon(c.diaTipo)
                                        return (
                                            <li
                                                key={c.servicioId}
                                                className="flex items-center justify-between gap-2 text-[11px]"
                                                data-testid={`plano-generate-week-culto-${w.semanaIso}-${c.diaTipo}`}
                                            >
                                                <span className="inline-flex items-center gap-1.5 min-w-0 text-slate-500 font-semibold">
                                                    <Icon className="w-3 h-3 shrink-0" aria-hidden />
                                                    <span className="truncate">{cultoLabel(c.diaTipo, turnLabels)}</span>
                                                </span>
                                                <span
                                                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${FILL_BADGE[c.status]}`}
                                                >
                                                    {fillLabel(c.status, 'culto')}
                                                </span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </button>
                        )
                    })}
                </div>
            </OfrendaLiquidShell>
        </>
    )
}
