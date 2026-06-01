'use client'

import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { commitSacosDraft, isSacosDraftAllowed } from './sacosNumericInput'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings2, ChevronDown, RefreshCw } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useOfrendaToast } from './ofrendaFeedback'
import type { OfrPlan } from './actions'

const SACOS_INPUT_SPINNER_HIDE =
    'appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]'

export interface SacosConfigPanelProps {
    plan: OfrPlan
    isLoading: boolean
    onUpdate: (
        jueves: number,
        domingo: number,
        domingoTarde: number,
        secuenciaMaximo: number,
    ) => Promise<void>
}

export function SacosConfigPanel({
    plan,
    isLoading,
    onUpdate,
}: Readonly<SacosConfigPanelProps>) {
    const { t } = useI18n()
    const feedback = useOfrendaToast()
    const [open, setOpen] = useState(false)
    const [j, setJ] = useState(plan.sacos_jueves)
    const [d, setD] = useState(plan.sacos_domingo)
    const [dt, setDt] = useState(plan.sacos_domingo_tarde)
    const [secMax, setSecMax] = useState(plan.secuencia_maximo ?? 20)
    const jInputRef = useRef<HTMLInputElement>(null)
    const dInputRef = useRef<HTMLInputElement>(null)
    const dtInputRef = useRef<HTMLInputElement>(null)
    const secMaxInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!open) return
        setJ(plan.sacos_jueves)
        setD(plan.sacos_domingo)
        setDt(plan.sacos_domingo_tarde)
        setSecMax(plan.secuencia_maximo ?? 20)
    }, [
        open,
        plan.sacos_jueves,
        plan.sacos_domingo,
        plan.sacos_domingo_tarde,
        plan.secuencia_maximo,
    ])

    const handleApply = async () => {
        const jVal = commitSacosDraft(jInputRef.current?.value ?? String(j), 1, 20)
        const dVal = commitSacosDraft(dInputRef.current?.value ?? String(d), 1, 20)
        const dtVal = commitSacosDraft(dtInputRef.current?.value ?? String(dt), 1, 20)
        const secVal = commitSacosDraft(secMaxInputRef.current?.value ?? String(secMax), 1, 99)

        setJ(jVal)
        setD(dVal)
        setDt(dtVal)
        setSecMax(secVal)

        if (
            jVal < 1 ||
            jVal > 20 ||
            dVal < 1 ||
            dVal > 20 ||
            dtVal < 1 ||
            dtVal > 20 ||
            secVal < 1 ||
            secVal > 99
        ) {
            feedback.quickWarning(
                t('ofrenda.toast.sacosInvalid'),
                t('ofrenda.toast.sacosInvalidDesc')
            )
            return
        }
        await onUpdate(jVal, dVal, dtVal, secVal)
        setOpen(false)
    }

    return (
        <div
            className="mb-4 overflow-hidden rounded-2xl border border-[rgba(184,150,74,0.35)] shadow-sm"
            data-testid="ofrenda-sacos-config"
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 bg-gradient-to-r from-[#1f2e85] to-[#2a3d9e] px-4 py-3.5 text-left transition-colors hover:from-[#253680] hover:to-[#1f3a8f] touch-manipulation min-h-[52px]"
                aria-expanded={open}
                data-testid="ofrenda-sacos-config-toggle"
            >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <Settings2 className="h-4 w-4 shrink-0 text-[#e8d9a8]" aria-hidden />
                    <span className="text-sm font-bold leading-snug text-white">
                        {t('ofrenda.sacos.configTitle')}
                    </span>
                </div>
                <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.18 }}
                    className="shrink-0"
                >
                    <ChevronDown className="h-5 w-5 text-[#e8d9a8]" aria-hidden />
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
                        data-testid="ofrenda-sacos-config-body"
                    >
                        <div className="space-y-4 border-t border-[rgba(184,150,74,0.2)] bg-background px-4 py-4">
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                {t('ofrenda.sacos.configDesc')}
                            </p>
                            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3 min-[480px]:gap-4">
                                <SacosInput
                                    ref={jInputRef}
                                    label={t('ofrenda.sacos.jueves')}
                                    color="emerald"
                                    value={j}
                                    min={1}
                                    max={20}
                                    maxDigits={2}
                                    onChange={setJ}
                                    testId="ofrenda-sacos-jueves"
                                />
                                <SacosInput
                                    ref={dInputRef}
                                    label={t('ofrenda.sacos.domingo')}
                                    color="blue"
                                    value={d}
                                    min={1}
                                    max={20}
                                    maxDigits={2}
                                    onChange={setD}
                                    testId="ofrenda-sacos-domingo-manana"
                                />
                                <SacosInput
                                    ref={dtInputRef}
                                    label={t('ofrenda.sacos.domingoTarde')}
                                    color="violet"
                                    value={dt}
                                    min={1}
                                    max={20}
                                    maxDigits={2}
                                    onChange={setDt}
                                    testId="ofrenda-sacos-domingo-tarde"
                                />
                            </div>
                            <div className="rounded-xl border border-[rgba(184,150,74,0.35)] bg-[#1f2e85]/[0.04] p-3">
                                <SacosInput
                                    ref={secMaxInputRef}
                                    label={t('ofrenda.sacos.secuenciaMax')}
                                    color="blue"
                                    value={secMax}
                                    min={1}
                                    max={99}
                                    maxDigits={2}
                                    onChange={setSecMax}
                                    testId="ofrenda-sacos-secuencia-max"
                                />
                                <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
                                    {t('ofrenda.sacos.secuenciaMaxHint')}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleApply}
                                    disabled={isLoading}
                                    className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
                                    data-testid="ofrenda-sacos-apply"
                                >
                                    {isLoading ? (
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-3.5 w-3.5" />
                                    )}
                                    {t('ofrenda.sacos.apply')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setJ(plan.sacos_jueves)
                                        setD(plan.sacos_domingo)
                                        setDt(plan.sacos_domingo_tarde)
                                        setSecMax(plan.secuencia_maximo ?? 20)
                                        setOpen(false)
                                    }}
                                    className="min-h-[44px] px-2 text-xs text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
                                >
                                    {t('common.cancel')}
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
    ref: inputRef,
    label,
    color,
    value,
    min,
    max,
    maxDigits,
    onChange,
    testId,
}: Readonly<{
    ref?: Ref<HTMLInputElement>
    label: string
    color: 'emerald' | 'blue' | 'violet'
    value: number
    min: number
    max: number
    maxDigits: number
    onChange: (v: number) => void
    testId: string
}>) {
    const inputId = useId()
    const [draft, setDraft] = useState(() => String(value))

    useEffect(() => {
        setDraft(String(value))
    }, [value])

    const styles = {
        emerald: {
            label: 'text-emerald-800 dark:text-emerald-200',
            ring: 'focus:ring-emerald-500/35 focus:border-emerald-500/50',
            border: 'border-emerald-500/25',
            bg: 'bg-emerald-500/5',
        },
        blue: {
            label: 'text-blue-800 dark:text-blue-200',
            ring: 'focus:ring-blue-500/35 focus:border-blue-500/50',
            border: 'border-blue-500/25',
            bg: 'bg-blue-500/5',
        },
        violet: {
            label: 'text-violet-800 dark:text-violet-200',
            ring: 'focus:ring-violet-500/35 focus:border-violet-500/50',
            border: 'border-violet-500/25',
            bg: 'bg-violet-500/5',
        },
    }[color]

    const commitDraft = () => {
        const next = commitSacosDraft(draft, min, max)
        setDraft(String(next))
        onChange(next)
    }

    return (
        <label
            htmlFor={inputId}
            className={`block cursor-text rounded-xl border p-3 touch-manipulation ${styles.border} ${styles.bg}`}
            data-testid={testId}
        >
            <span
                className={`mb-2 block text-center text-[11px] font-bold uppercase tracking-wide ${styles.label}`}
            >
                {label}
            </span>
            <input
                ref={inputRef}
                id={inputId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="done"
                value={draft}
                onChange={(e) => {
                    const raw = e.target.value
                    if (!isSacosDraftAllowed(raw, maxDigits)) return
                    setDraft(raw)
                }}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault()
                        commitDraft()
                        ;(e.target as HTMLInputElement).blur()
                    }
                }}
                className={`w-full rounded-lg border border-border/60 bg-background px-2 py-2.5 text-center text-lg font-black font-mono text-foreground outline-none focus:ring-2 min-h-[48px] ${SACOS_INPUT_SPINNER_HIDE} ${styles.ring}`}
                aria-label={label}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
            />
        </label>
    )
}
