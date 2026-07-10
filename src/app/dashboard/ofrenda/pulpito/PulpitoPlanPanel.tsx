'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Info, UserPlus, CheckCircle2, ListChecks } from 'lucide-react'
import type { Profile } from '@/types/database'
import UserSelector from '@/components/UserSelector'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useOfrendaToast } from '../ofrendaFeedback'
import { updateAsignacionPulpito, type PulpitoCulto } from './actions'
import { ROL_TO_AVAILABILITY_KEY, type PulpitoRol } from '@/lib/utils/pulpitoAvailability'

const ROLE_DOT: Record<PulpitoRol, string> = {
    introduccion: 'bg-emerald-500',
    ensenanza: 'bg-blue-600',
    testimonios: 'bg-violet-500',
    finalizacion: 'bg-amber-500',
}

interface Props {
    cultos: PulpitoCulto[]
    canEdit: boolean
    diaLabel: (fecha: string) => string
    rolLabel: (rol: PulpitoRol) => string
    onChanged: () => void
}

export function PulpitoPlanPanel({ cultos, canEdit, diaLabel, rolLabel, onChanged }: Readonly<Props>) {
    const { t } = useI18n()

    const conRoles = cultos.filter(c => c.roles.length > 0)

    if (conRoles.length === 0) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-[rgba(184,150,74,0.3)] p-8 text-center text-sm text-slate-500">
                {t('ofrenda.pulpito.plan.empty')}
            </div>
        )
    }

    return (
        <div className="space-y-3" data-testid="pulpito-plan">
            <h3 className="text-base font-bold flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-blue-600" />
                <span suppressHydrationWarning>{t('ofrenda.pulpito.plan.title')}</span>
            </h3>
            {canEdit && (
                <div className="flex items-start gap-2 rounded-xl border border-[rgba(184,150,74,0.28)] bg-[#f8f3e8]/60 px-3 py-2.5 text-xs text-[#7a5f1f]">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{t('ofrenda.pulpito.plan.manualHint')}</span>
                </div>
            )}
            {conRoles.map(culto => (
                <div
                    key={culto.id}
                    className="ofrenda-liquid-card overflow-hidden"
                    data-testid={`pulpito-culto-${culto.id}`}
                >
                    <div
                        className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[rgba(184,150,74,0.2)]"
                        style={{ borderLeft: `4px solid ${culto.tipo_color}` }}
                    >
                        <span className="text-sm font-bold text-[#1f2e85] dark:text-blue-200">{diaLabel(culto.fecha)}</span>
                        <span className="text-xs font-semibold text-muted-foreground">{culto.tipo_nombre}</span>
                    </div>
                    <div className="divide-y divide-border/40">
                        {culto.roles.map(rol => (
                            <AssignmentRow
                                key={rol}
                                culto={culto}
                                rol={rol}
                                canEdit={canEdit}
                                rolLabel={rolLabel}
                                onChanged={onChanged}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

function AssignmentRow({
    culto,
    rol,
    canEdit,
    rolLabel,
    onChanged,
}: Readonly<{
    culto: PulpitoCulto
    rol: PulpitoRol
    canEdit: boolean
    rolLabel: (rol: PulpitoRol) => string
    onChanged: () => void
}>) {
    const { t } = useI18n()
    const feedback = useOfrendaToast()
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)

    const actual = culto.asignaciones[rol] ?? null

    const handleSelect = async (val: Profile | string | null) => {
        const userId = val === null ? null : typeof val === 'string' ? val : val.id
        setSaving(true)
        const result = await updateAsignacionPulpito(culto.id, rol, userId)
        setSaving(false)
        if (result.error) {
            feedback.quickError(result.error)
            return
        }
        setEditing(false)
        feedback.quickSuccess(t('ofrenda.plano.saved'))
        onChanged()
    }

    return (
        <div className="px-4 py-3" data-testid={`pulpito-row-${culto.id}-${rol}`}>
            <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <span className={`w-2 h-2 rounded-full ${ROLE_DOT[rol]}`} />
                    {rolLabel(rol)}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                    {!editing && (
                        <>
                            {actual ? (
                                <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    {actual.nombre}
                                </span>
                            ) : (
                                <span className="text-sm font-medium text-red-500/80 flex items-center gap-1.5">
                                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                                    {t('ofrenda.pulpito.sinAsignar')}
                                </span>
                            )}
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => setEditing(true)}
                                    aria-label={t('common.edit')}
                                    data-testid={`pulpito-edit-${culto.id}-${rol}`}
                                    className="p-1.5 rounded-lg text-[#b8964a] hover:bg-[#f8f3e8] hover:text-[#1f2e85] transition-colors shrink-0"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {editing && canEdit && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2"
                    >
                        <UserSelector
                            selectedUserId={actual?.id ?? null}
                            onSelect={val => void handleSelect(val)}
                            disabled={saving}
                            isEditing
                            onEditChange={v => setEditing(v)}
                            cultoDate={culto.fecha}
                            assignmentType={ROL_TO_AVAILABILITY_KEY[rol]}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
