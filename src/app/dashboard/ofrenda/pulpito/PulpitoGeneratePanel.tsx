'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, RefreshCw, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useOfrendaToast } from '../ofrendaFeedback'
import { interpolate } from '../ofrendaLocale'
import { eliminarAsignacionesPulpito, generarPulpito } from './actions'
import { OfrendaDangerConfirmButton } from '../OfrendaDangerConfirmButton'
import type { ModoGeneracion } from '@/lib/utils/pulpitoEngine'
import type { PulpitoRol } from '@/lib/utils/pulpitoAvailability'

interface Props {
    fechaInicio: string
    fechaFin: string
    canEdit: boolean
    onGenerated: () => void
    rolLabel: (rol: PulpitoRol) => string
    formatFecha: (fecha: string) => string
}

export function PulpitoGeneratePanel({
    fechaInicio,
    fechaFin,
    canEdit,
    onGenerated,
    rolLabel,
    formatFecha,
}: Readonly<Props>) {
    const { t } = useI18n()
    const feedback = useOfrendaToast()
    const [modo, setModo] = useState<ModoGeneracion>('todo')
    const [isLoading, setIsLoading] = useState(false)
    const [problemas, setProblemas] = useState<{ fecha: string; rol: PulpitoRol }[]>([])

    const errorMsg = (code: string): string => {
        if (code === 'SIN_HERMANOS') return t('ofrenda.pulpito.generar.noHermanos')
        if (code === 'SIN_CULTOS') return t('ofrenda.pulpito.generar.noCultos')
        return code
    }

    const handleGenerar = async () => {
        setIsLoading(true)
        setProblemas([])
        const result = await generarPulpito(fechaInicio, fechaFin, modo)
        setIsLoading(false)

        if (result.error) {
            feedback.planError(t('ofrenda.pulpito.generar.error'), errorMsg(result.error))
            return
        }

        setProblemas(result.problemas ?? [])
        feedback.planSuccess(
            t('ofrenda.pulpito.generar.success'),
            interpolate(t('ofrenda.pulpito.generar.successDesc'), { n: String(result.actualizados ?? 0) }),
        )
        onGenerated()
    }

    const handleEliminar = async () => {
        setIsLoading(true)
        setProblemas([])
        const result = await eliminarAsignacionesPulpito(fechaInicio, fechaFin)
        setIsLoading(false)
        if (result.error) {
            feedback.planError(t('ofrenda.pulpito.generar.deleteError'), errorMsg(result.error))
            return
        }
        feedback.planSuccess(
            t('ofrenda.pulpito.generar.deleted'),
            interpolate(t('ofrenda.pulpito.generar.deletedDesc'), { n: String(result.actualizados ?? 0) }),
        )
        onGenerated()
    }

    if (!canEdit) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-[rgba(184,150,74,0.3)] p-8 text-center text-sm text-slate-500">
                {t('ofrenda.pulpito.generar.desc')}
            </div>
        )
    }

    return (
        <div className="ofrenda-liquid-card space-y-5 p-4 sm:p-5" data-testid="pulpito-generate-panel">
            <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    {t('ofrenda.pulpito.generar.title')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('ofrenda.pulpito.generar.desc')}</p>
            </div>

            {/* Selector de modo */}
            <div className="grid gap-2 sm:grid-cols-2">
                {([
                    { id: 'todo' as const, label: t('ofrenda.pulpito.generar.modeAll'), desc: t('ofrenda.pulpito.generar.modeAllDesc') },
                    { id: 'solo_huecos' as const, label: t('ofrenda.pulpito.generar.modeFill'), desc: t('ofrenda.pulpito.generar.modeFillDesc') },
                ]).map(m => {
                    const active = modo === m.id
                    return (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setModo(m.id)}
                            aria-pressed={active}
                            data-testid={`pulpito-mode-${m.id}`}
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

            <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => void handleGenerar()}
                disabled={isLoading}
                data-testid="pulpito-generate-btn"
                className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white text-sm font-bold shadow-[0_4px_16px_rgba(31,46,133,0.32)] hover:shadow-[0_6px_22px_rgba(31,46,133,0.42)] transition-shadow disabled:opacity-50 touch-manipulation"
            >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {t('ofrenda.pulpito.generar.button')}
            </motion.button>

            <div className="pt-4 border-t border-border/50">
                <OfrendaDangerConfirmButton
                    label={t('ofrenda.pulpito.generar.deleteBtn')}
                    confirmText={t('ofrenda.pulpito.generar.deleteConfirm')}
                    isLoading={isLoading}
                    onConfirm={() => void handleEliminar()}
                    testIdPrefix="pulpito-delete"
                />
            </div>

            {/* Puestos sin cubrir */}
            {problemas.length > 0 && (
                <div
                    className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3"
                    data-testid="pulpito-problemas"
                >
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {t('ofrenda.pulpito.generar.problemasTitle')}
                    </div>
                    <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">
                        {interpolate(t('ofrenda.pulpito.generar.problemasDesc'), { n: String(problemas.length) })}
                    </p>
                    <ul className="mt-2 space-y-1">
                        {problemas.map((p, i) => (
                            <li key={`${p.fecha}-${p.rol}-${i}`} className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                                <span className="font-semibold">{formatFecha(p.fecha)}</span>
                                <span className="opacity-60">·</span>
                                <span>{rolLabel(p.rol)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
