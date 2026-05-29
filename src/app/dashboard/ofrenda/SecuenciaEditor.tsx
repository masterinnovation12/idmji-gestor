'use client'

import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, Check, Minus, Plus } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { formatServicioFechaLabel, interpolate } from './ofrendaLocale'
import { OfrendaLiquidShell, diaTipoToAccent } from './OfrendaLiquidShell'
import {
    countSacosInSequence,
    validateSecuenciaSacos,
} from './secuenciaSacosLimits'
import type { OfrServicio } from './actions'
import type { SecuenciaApplyScope } from './secuenciaPropagation'

interface SecuenciaEditorProps {
    open: boolean
    onClose: () => void
    servicio: OfrServicio
    initialDesde: number
    initialHasta: number
    displayTexto: string
    saving: boolean
    maxSacos: number
    secuenciaMaximo: number
    followingCount: number
    dayConfigLabel: string
    onSave: (desde: number, hasta: number, scope: SecuenciaApplyScope) => void
    onLimitExceeded: (desde: number, hasta: number) => void
}

export function SecuenciaEditor({
    open,
    onClose,
    servicio,
    initialDesde,
    initialHasta,
    displayTexto,
    saving,
    maxSacos,
    secuenciaMaximo,
    followingCount,
    dayConfigLabel,
    onSave,
    onLimitExceeded,
}: Readonly<SecuenciaEditorProps>) {
    const { t, language } = useI18n()
    const [desde, setDesde] = useState(initialDesde)
    const [hasta, setHasta] = useState(initialHasta)

    useEffect(() => {
        if (open) {
            setDesde(initialDesde)
            setHasta(initialHasta)
        }
    }, [open, initialDesde, initialHasta])

    const clamp = (n: number) => Math.min(secuenciaMaximo, Math.max(1, n))
    const preview = `${String(desde).padStart(2, '0')} al ${String(hasta).padStart(2, '0')}`
    const sacoCount = countSacosInSequence(desde, hasta)
    const validation = useMemo(
        () => validateSecuenciaSacos(desde, hasta, maxSacos, secuenciaMaximo),
        [desde, hasta, maxSacos, secuenciaMaximo]
    )
    const sequenceMismatch =
        !validation.ok &&
        (validation.reason === 'too_few' || validation.reason === 'too_many')

    const fechaLabel = formatServicioFechaLabel(
        language,
        servicio.fecha,
        servicio.dia_tipo,
        t
    )

    let turnoLabel: string | null = null
    if (servicio.dia_tipo === 'domingo') turnoLabel = t('ofrenda.days.manana')
    else if (servicio.dia_tipo === 'domingo_tarde') turnoLabel = t('ofrenda.days.tarde')

    const headline = turnoLabel
        ? `${t('ofrenda.table.sacos')} · ${turnoLabel}`
        : t('ofrenda.table.sacos')

    const handleSaveClick = () => {
        if (!validation.ok) {
            if (validation.reason === 'too_few' || validation.reason === 'too_many') {
                onLimitExceeded(desde, hasta)
            }
            return
        }
        onSave(desde, hasta, 'single')
    }

    const handleSaveForward = () => {
        if (!validation.ok) {
            if (validation.reason === 'too_few' || validation.reason === 'too_many') {
                onLimitExceeded(desde, hasta)
            }
            return
        }
        onSave(desde, hasta, 'forward')
    }

    if (!open) return null

    return (
        <OfrendaLiquidShell
            open
            onClose={onClose}
            ariaLabel={t('ofrenda.sequence.edit')}
            title={t('ofrenda.sequence.edit')}
            headline={headline}
            subtitle={fechaLabel}
            currentLabel={t('ofrenda.sequence.preview')}
            currentValue={displayTexto}
            accent={diaTipoToAccent(servicio.dia_tipo)}
            panelSize="sm"
            testIdPrefix="ofrenda-sequence"
            closeLabel={t('common.close')}
            footer={
                <div className="flex flex-col gap-2">
                    {followingCount > 0 ? (
                        <>
                            <p className="text-[11px] leading-relaxed text-slate-600 text-center px-1">
                                {t('ofrenda.sequence.applyForwardHint')}
                            </p>
                            <button
                                type="button"
                                onClick={handleSaveForward}
                                disabled={saving || !validation.ok}
                                className="ofrenda-liquid-btn-primary w-full"
                                data-testid="ofrenda-sequence-save-forward"
                            >
                                {t('ofrenda.sequence.applyForward')}
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveClick}
                                disabled={saving || !validation.ok}
                                className="ofrenda-liquid-btn-secondary w-full border border-[#b8964a]/40"
                                data-testid="ofrenda-sequence-save-single"
                            >
                                {t('ofrenda.sequence.applySingle')}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSaveClick}
                            disabled={saving || !validation.ok}
                            className="ofrenda-liquid-btn-primary w-full"
                            data-testid="ofrenda-sequence-save"
                        >
                            {saving ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                                <Check className="h-4 w-4 inline mr-1" />
                            )}
                            {t('common.save')}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="ofrenda-liquid-btn-secondary w-full"
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-xs leading-relaxed text-slate-600">
                    {interpolate(t('ofrenda.sequence.help'), {
                        max: String(secuenciaMaximo),
                    })}
                </p>
                <div
                    className="rounded-xl border border-[rgba(184,150,74,0.35)] bg-gradient-to-br from-[#f8f3e8]/90 to-white px-3 py-2 text-center"
                    data-testid="ofrenda-sequence-limit-badge"
                >
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#8a7340]">
                        {interpolate(t('ofrenda.sequence.limitBadge'), {
                            required: String(maxSacos),
                            day: dayConfigLabel,
                        })}
                    </span>
                </div>
                <div className="flex items-center justify-center gap-4">
                    <Stepper
                        label={t('ofrenda.sequence.from')}
                        value={desde}
                        max={secuenciaMaximo}
                        onChange={v => setDesde(clamp(v))}
                        disabled={saving}
                    />
                    <span className="pt-5 font-bold text-[#b8964a]">→</span>
                    <Stepper
                        label={t('ofrenda.sequence.to')}
                        value={hasta}
                        max={secuenciaMaximo}
                        onChange={v => setHasta(clamp(v))}
                        disabled={saving}
                    />
                </div>
                <div
                    className={`ofrenda-liquid-preview ${sequenceMismatch ? 'ring-2 ring-amber-500/60' : ''}`}
                    data-testid="ofrenda-sequence-preview"
                    data-sequence-mismatch={sequenceMismatch ? 'true' : 'false'}
                >
                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#8a7340]">
                        {t('ofrenda.sequence.preview')}
                    </span>
                    <span className="text-lg font-black tabular-nums text-[#1f2e85]">{preview}</span>
                    <span
                        className={`mt-1 block text-[10px] font-semibold tabular-nums ${
                            sequenceMismatch ? 'text-amber-700' : 'text-slate-500'
                        }`}
                        data-testid="ofrenda-sequence-count"
                    >
                        {validation.ok
                            ? interpolate(t('ofrenda.sequence.limitCountOk'), {
                                  count: String(sacoCount),
                              })
                            : interpolate(t('ofrenda.sequence.limitCountWrong'), {
                                  count: String(sacoCount),
                                  required: String(maxSacos),
                              })}
                    </span>
                </div>
                {sequenceMismatch && (
                    <div
                        className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50/90 px-3 py-2.5 text-xs leading-relaxed text-amber-900"
                        role="alert"
                        data-testid="ofrenda-sequence-limit-alert"
                        data-mismatch-reason={validation.reason}
                    >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                        <span>
                            {interpolate(
                                t(
                                    validation.reason === 'too_few'
                                        ? 'ofrenda.sequence.limitInlineTooFew'
                                        : 'ofrenda.sequence.limitInlineTooMany'
                                ),
                                {
                                count: String(sacoCount),
                                required: String(maxSacos),
                                day: dayConfigLabel,
                            })}
                        </span>
                    </div>
                )}
            </div>
        </OfrendaLiquidShell>
    )
}

function Stepper({
    label,
    value,
    max,
    onChange,
    disabled,
}: Readonly<{
    label: string
    value: number
    max: number
    onChange: (v: number) => void
    disabled: boolean
}>) {
    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#8a7340]">{label}</span>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={disabled || value <= 1}
                    onClick={() => onChange(value - 1)}
                    className="ofrenda-liquid-stepper-btn"
                    aria-label={`${label} menos`}
                >
                    <Minus className="h-4 w-4 text-[#1f2e85]" />
                </button>
                <span className="w-12 text-center text-xl font-black tabular-nums text-[#1f2e85]">{value}</span>
                <button
                    type="button"
                    disabled={disabled || value >= max}
                    onClick={() => onChange(value + 1)}
                    className="ofrenda-liquid-stepper-btn"
                    aria-label={`${label} más`}
                >
                    <Plus className="h-4 w-4 text-[#1f2e85]" />
                </button>
            </div>
        </div>
    )
}
