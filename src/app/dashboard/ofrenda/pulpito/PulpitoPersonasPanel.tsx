'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ChevronDown, CheckCircle2, CircleSlash, ShieldCheck, Loader2 } from 'lucide-react'
import { format, setDay } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useOfrendaToast } from '../ofrendaFeedback'
import { updateHermanoAvailability, type PulpitoHermano } from './actions'
import {
    tieneDisponibilidadConfigurada,
    ROL_TO_AVAILABILITY_KEY,
    type PulpitoRol,
    type PulpitoAvailability,
    type DisponibilidadRoles,
} from '@/lib/utils/pulpitoAvailability'

interface Props {
    hermanos: PulpitoHermano[]
    rolLabel: (rol: PulpitoRol) => string
    isAdmin: boolean
    onChanged: () => void
}

// Orden de días: lunes(1) … domingo(0)
const DIA_ORDEN = [1, 2, 3, 4, 5, 6, 0]

// Roles válidos por día (mismo criterio que el calendario de cultos):
//  - Lun-Mié, Vie-Sáb: estudio/alabanza → introducción + finalización.
//  - Jue y Dom: enseñanza → introducción + enseñanza + testimonios.
export const ROLES_POR_DIA: Record<number, PulpitoRol[]> = {
    1: ['introduccion', 'finalizacion'],
    2: ['introduccion', 'finalizacion'],
    3: ['introduccion', 'finalizacion'],
    4: ['introduccion', 'ensenanza', 'testimonios'],
    5: ['introduccion', 'finalizacion'],
    6: ['introduccion', 'finalizacion'],
    0: ['introduccion', 'ensenanza', 'testimonios'],
}

type TemplateMap = NonNullable<PulpitoAvailability['template']>

export function PulpitoPersonasPanel({ hermanos, rolLabel, isAdmin, onChanged }: Readonly<Props>) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es
    const [expanded, setExpanded] = useState<string | null>(null)

    // Copia local editable de los templates por hermano (edición optimista).
    const [templates, setTemplates] = useState<Record<string, TemplateMap>>({})
    useEffect(() => {
        const next: Record<string, TemplateMap> = {}
        for (const h of hermanos) next[h.id] = { ...(h.availability?.template ?? {}) }
        setTemplates(next)
    }, [hermanos])

    if (hermanos.length === 0) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-[rgba(184,150,74,0.3)] p-8 text-center text-sm text-slate-500">
                {t('ofrenda.pulpito.personas.empty')}
            </div>
        )
    }

    const diaNombre = (dow: number) => {
        const d = setDay(new Date(), dow, { weekStartsOn: 1 })
        const name = format(d, 'EEEE', { locale })
        return name.charAt(0).toUpperCase() + name.slice(1)
    }

    const puedeRol = (tpl: TemplateMap, dow: number, rol: PulpitoRol): boolean => {
        const dayTpl = tpl[String(dow)]
        return dayTpl?.[ROL_TO_AVAILABILITY_KEY[rol] as keyof DisponibilidadRoles] === true
    }

    return (
        <div className="space-y-3" data-testid="pulpito-personas">
            <div className="ofrenda-liquid-card p-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    {t('ofrenda.pulpito.personas.title')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('ofrenda.pulpito.personas.desc')}</p>
                {isAdmin && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-[rgba(184,150,74,0.28)] bg-[#f8f3e8]/60 px-3 py-2.5 text-xs text-[#7a5f1f]">
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{t('ofrenda.pulpito.personas.adminHint')}</span>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {hermanos.map(h => {
                    const tpl = templates[h.id] ?? {}
                    const configured = tieneDisponibilidadConfigurada({ template: tpl })
                    const isOpen = expanded === h.id
                    // Admin siempre puede expandir para editar; editor/usuario solo si hay datos.
                    const canExpand = isAdmin || configured
                    return (
                        <div
                            key={h.id}
                            className="ofrenda-liquid-card overflow-hidden border border-[rgba(184,150,74,0.3)]"
                            data-testid={`pulpito-persona-${h.id}`}
                        >
                            <button
                                type="button"
                                onClick={() => setExpanded(isOpen ? null : h.id)}
                                disabled={!canExpand}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left touch-manipulation disabled:cursor-default"
                            >
                                <span className="text-sm font-bold text-foreground truncate min-w-0">{h.nombre}</span>
                                <span className="flex items-center gap-2 shrink-0">
                                    {configured ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">{t('ofrenda.pulpito.personas.configured')}</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                            <CircleSlash className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">{t('ofrenda.pulpito.personas.notConfigured')}</span>
                                        </span>
                                    )}
                                    {canExpand && (
                                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    )}
                                </span>
                            </button>

                            <AnimatePresence>
                                {isOpen && canExpand && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="border-t border-[rgba(184,150,74,0.25)]"
                                    >
                                        <HermanoAvailabilityGrid
                                            hermanoId={h.id}
                                            template={tpl}
                                            isAdmin={isAdmin}
                                            diaNombre={diaNombre}
                                            rolLabel={rolLabel}
                                            puedeRol={puedeRol}
                                            onLocalChange={next =>
                                                setTemplates(prev => ({ ...prev, [h.id]: next }))
                                            }
                                            onChanged={onChanged}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function HermanoAvailabilityGrid({
    hermanoId,
    template,
    isAdmin,
    diaNombre,
    rolLabel,
    puedeRol,
    onLocalChange,
    onChanged,
}: Readonly<{
    hermanoId: string
    template: TemplateMap
    isAdmin: boolean
    diaNombre: (dow: number) => string
    rolLabel: (rol: PulpitoRol) => string
    puedeRol: (tpl: TemplateMap, dow: number, rol: PulpitoRol) => boolean
    onLocalChange: (next: TemplateMap) => void
    onChanged: () => void
}>) {
    const { t } = useI18n()
    const feedback = useOfrendaToast()
    const [saving, setSaving] = useState(false)

    const toggle = async (dow: number, rol: PulpitoRol) => {
        if (!isAdmin || saving) return
        const key = ROL_TO_AVAILABILITY_KEY[rol]
        const dayTpl = { ...(template[String(dow)] ?? {}) } as DisponibilidadRoles
        dayTpl[key as keyof DisponibilidadRoles] = !dayTpl[key as keyof DisponibilidadRoles]
        const next: TemplateMap = { ...template, [String(dow)]: dayTpl }
        onLocalChange(next)

        setSaving(true)
        const result = await updateHermanoAvailability(hermanoId, next)
        setSaving(false)
        if (result.error) {
            feedback.quickError(result.error)
            onChanged() // revertir al estado real
            return
        }
        feedback.quickSuccess(t('ofrenda.pulpito.personas.saved'))
    }

    return (
        <div className="p-3 space-y-2" data-testid={`pulpito-availability-${hermanoId}`}>
            {DIA_ORDEN.map(dow => {
                const roles = ROLES_POR_DIA[dow]
                return (
                    <div key={dow} className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-xs font-bold text-[#1f2e85] dark:text-blue-200">
                            {diaNombre(dow)}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {roles.map(rol => {
                                const on = puedeRol(template, dow, rol)
                                const base =
                                    'flex items-center justify-center gap-1 min-h-[36px] rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors touch-manipulation disabled:opacity-70'
                                const cls = on
                                    ? 'bg-[#1f2e85] text-white border-[#1f2e85]'
                                    : 'bg-white border-black/15 text-slate-500 hover:bg-[#f8f3e8]'
                                return (
                                    <button
                                        key={rol}
                                        type="button"
                                        disabled={!isAdmin || saving}
                                        aria-pressed={on}
                                        data-testid={`pulpito-avail-${hermanoId}-${dow}-${rol}`}
                                        onClick={() => void toggle(dow, rol)}
                                        className={`${base} ${cls} ${isAdmin ? '' : 'cursor-default'}`}
                                    >
                                        {on && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                                        {rolLabel(rol)}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
            {saving && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t('common.loading')}
                </div>
            )}
        </div>
    )
}
