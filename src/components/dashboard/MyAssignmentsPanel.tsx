'use client'

import { useState } from 'react'
import { Calendar, UserIcon, ChevronRight, ChevronLeft } from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Culto, Profile } from '@/types/database'
import { getUserAssignments } from '@/app/dashboard/cultos/actions'
import { toast } from 'sonner'
import { InstruccionesCultoModal } from '@/components/InstruccionesCultoModal'
import type { RolInstruccionCulto } from '@/types/database'

interface MyAssignmentsPanelProps {
    user: Profile & { id: string }
    initialAssignments: Culto[]
}

export function MyAssignmentsPanel({ user, initialAssignments }: MyAssignmentsPanelProps) {
    const { t, language } = useI18n()
    const locale = language === 'ca-ES' ? ca : es

    const [assignments, setAssignments] = useState<Culto[]>(initialAssignments)
    const [currentWeekDate, setCurrentWeekDate] = useState(new Date())
    const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)
    const [instruccionesModal, setInstruccionesModal] = useState<{ cultoTypeId: string; cultoTypeNombre: string; rol: RolInstruccionCulto } | null>(null)

    const getTranslatedCultoName = (name: string | undefined) => {
        if (!name) return ''
        const lower = name.toLowerCase()
        if (lower.includes('estudio')) return t('culto.estudio')
        if (lower.includes('alabanza')) return t('culto.alabanza')
        if (lower.includes('enseñanza') || lower.includes('ensenanza')) return t('culto.ensenanza')
        if (lower.includes('testimonios')) return t('culto.testimonios')
        return name
    }

    const changeWeek = async (direction: 'prev' | 'next') => {
        setIsLoadingAssignments(true)
        const newDate = direction === 'next' ? addWeeks(currentWeekDate, 1) : subWeeks(currentWeekDate, 1)
        setCurrentWeekDate(newDate)

        const start = startOfWeek(newDate, { weekStartsOn: 1 })
        const end = endOfWeek(newDate, { weekStartsOn: 1 })

        try {
            const { data } = await getUserAssignments(
                user.id,
                format(start, 'yyyy-MM-dd'),
                format(end, 'yyyy-MM-dd')
            )
            if (data) setAssignments(data)
        } catch {
            toast.error(t('dashboard.toast.loadError'))
        } finally {
            setIsLoadingAssignments(false)
        }
    }

    const weekLabel = `${format(startOfWeek(currentWeekDate, { weekStartsOn: 1 }), 'd MMM', { locale })} - ${format(endOfWeek(currentWeekDate, { weekStartsOn: 1 }), 'd MMM', { locale })}`

    return (
        <>
            <Card className="h-full rounded-[2.5rem] border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        {t('dashboard.myAssignments')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                    {/* Week Navigation */}
                    <div className="flex items-center justify-between mb-6 bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                        <button onClick={() => changeWeek('prev')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all shadow-sm">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider">{weekLabel}</span>
                        <button onClick={() => changeWeek('next')} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-all shadow-sm">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Assignments List */}
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {isLoadingAssignments ? (
                            <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-blue-500 rounded-full border-t-transparent" /></div>
                        ) : assignments.length > 0 ? (
                            assignments.map((asg) => {
                                const roles: string[] = []
                                const rolesKeys: RolInstruccionCulto[] = []
                                if (asg.id_usuario_intro === user.id) { roles.push(t('cultos.role.intro')); rolesKeys.push('introduccion') }
                                if (asg.id_usuario_ensenanza === user.id) { roles.push(t('cultos.role.teaching')); rolesKeys.push('ensenanza') }
                                if (asg.id_usuario_finalizacion === user.id) { roles.push(t('cultos.role.final')); rolesKeys.push('finalizacion') }
                                if (asg.id_usuario_testimonios === user.id) { roles.push(t('cultos.role.testimonies')); rolesKeys.push('testimonios') }
                                const firstRol = rolesKeys[0]

                                return (
                                    <div key={asg.id} className="flex flex-col gap-1">
                                        <Link href={`/dashboard/cultos/${asg.id}`}>
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-400 uppercase">{format(new Date(asg.fecha), 'EEE d', { locale })}</span>
                                                        <span className="font-black text-slate-800 dark:text-slate-100">{getTranslatedCultoName(asg.tipo_culto?.nombre)}</span>
                                                    </div>
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asg.tipo_culto?.color }} />
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {roles.map(r => (
                                                        <span key={r} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                            {r}
                                                        </span>
                                                    ))}
                                                </div>
                                                {asg.id_usuario_intro === user.id && asg.tipo_culto?.nombre?.toLowerCase().includes('alabanza') && (asg.meta_data as { tema_introduccion_alabanza?: string })?.tema_introduccion_alabanza && (
                                                    <p className="mt-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 leading-tight line-clamp-2">
                                                        {t((asg.meta_data as { tema_introduccion_alabanza: string }).tema_introduccion_alabanza as import('@/lib/i18n/types').TranslationKey)}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                        {firstRol && asg.tipo_culto_id && (
                                            <button
                                                type="button"
                                                onClick={() => setInstruccionesModal({ cultoTypeId: asg.tipo_culto_id, cultoTypeNombre: asg.tipo_culto?.nombre ?? '', rol: firstRol })}
                                                className="min-h-[44px] py-2.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:underline text-left px-4 touch-manipulation rounded-lg hover:bg-primary/5 active:bg-primary/10 transition-colors"
                                            >
                                                {t('culto.instrucciones.ver')}
                                            </button>
                                        )}
                                    </div>
                                )
                            })
                        ) : (
                            <div className="text-center py-8 opacity-50">
                                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-xs font-medium">{t('dashboard.noAssignmentsWeek')}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {instruccionesModal && (
                <InstruccionesCultoModal
                    isOpen
                    onClose={() => setInstruccionesModal(null)}
                    cultoTypeId={instruccionesModal.cultoTypeId}
                    cultoTypeNombre={instruccionesModal.cultoTypeNombre}
                    rol={instruccionesModal.rol}
                />
            )}
        </>
    )
}
