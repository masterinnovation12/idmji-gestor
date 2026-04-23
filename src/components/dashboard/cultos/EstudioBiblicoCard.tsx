'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Clock, Plus, Heart, Users, ArrowRight, HelpCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { AssignmentPill } from './AssignmentPill'
import { computeCultoDetails } from '@/lib/utils/computeCultoDetails'
import Link from 'next/link'
import { Culto } from '@/types/database'
import AddLecturaModal from '@/components/AddLecturaModal'

export function EstudioBiblicoCard({ culto, esHoy, currentUserId }: Readonly<{ culto: Culto; esHoy: boolean; currentUserId: string }>) {
    const { t } = useI18n()
    const router = useRouter()
    const { estudioBiblicoData, observacionesData, lecturaData } = computeCultoDetails(culto)
    const [addLecturaModalOpen, setAddLecturaModalOpen] = useState(false)

    const introUserId = (culto.usuario_intro as { id?: string } | null)?.id ?? currentUserId

    const getTranslatedCultoName = (name: string | undefined) => {
        if (!name) return ''
        const lower = name.toLowerCase()
        if (lower.includes('estudio')) return t('culto.estudio')
        if (lower.includes('alabanza')) return t('culto.alabanza')
        if (lower.includes('enseñanza') || lower.includes('ensenanza')) return t('culto.ensenanza')
        if (lower.includes('testimonios')) return t('culto.testimonios')
        return name
    }

    return (
        <div className="relative group">
            <div className="absolute inset-0 bg-blue-600/20 blur-2xl rounded-[2.5rem] transform group-hover:scale-105 transition-transform duration-500 -z-10" />
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
                {/* Banner Superior */}
                <div className="h-2 w-full" style={{ backgroundColor: culto.tipo_culto?.color || '#3b82f6' }} />

                <CardContent className="p-4 sm:p-5 md:p-8">
                    {/* Header compacto */}
                    <div className="mb-4 md:mb-6">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.18em] shadow-lg ${esHoy ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-blue-600 text-white shadow-blue-500/30'}`}>
                                {esHoy ? t('dashboard.today') : getTranslatedCultoName(culto.tipo_culto?.nombre)}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                                <Clock className="w-4 h-4 text-blue-500" />
                                <span className="text-sm">{(culto.hora_inicio || '').slice(0, 5)}</span>
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">
                            {getTranslatedCultoName(culto.tipo_culto?.nombre)}
                        </h2>

                        {/* Hora / Inicio anticipado - con estado Por definir */}
                        <div className="flex items-center gap-3 text-slate-500 font-bold mb-2">
                            <Clock className="w-5 h-5 text-blue-500 shrink-0" />
                            {!estudioBiblicoData?.inicioAnticipadoDefinido ? (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <span className="text-base text-slate-400 dark:text-slate-500 italic">
                                        {t('dashboard.inicioToDefine')}
                                    </span>
                                    <Link
                                        href={`/dashboard/cultos/${culto.id}`}
                                        className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 border border-primary/20 transition-colors touch-manipulation"
                                    >
                                        <span>{t('dashboard.defineInDetail')}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            ) : estudioBiblicoData?.inicioAnticipado ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-lg line-through opacity-50">{(culto.hora_inicio || '').slice(0, 5)}</span>
                                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                                        {estudioBiblicoData.inicioAnticipado.horaReal}
                                    </span>
                                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-xl text-[10px] font-black uppercase">
                                        {estudioBiblicoData.inicioAnticipado.minutos} {t('dashboard.minBefore')}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-lg">{(culto.hora_inicio || '').slice(0, 5)}</span>
                            )}
                        </div>
                    </div>

                    {/* Protocolo (oración + congregación) - Premium cards con estado Por definir */}
                    {estudioBiblicoData?.esEstudio && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                            {!estudioBiblicoData.protocoloDefinido ? (
                                <Link
                                    href={`/dashboard/cultos/${culto.id}`}
                                    className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-primary/30 hover:bg-primary/5 transition-all min-h-[72px] touch-manipulation"
                                >
                                    <div className="p-2.5 rounded-xl bg-slate-200/50 dark:bg-slate-700/50">
                                        <HelpCircle className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                                            {t('dashboard.protocolToDefine')}
                                        </p>
                                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                            {t('dashboard.toDefine')}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-primary shrink-0" />
                                </Link>
                            ) : (
                                <>
                                    <div className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all min-h-[72px] ${estudioBiblicoData.oracionInicio
                                        ? 'bg-emerald-500/10 border-emerald-500/20'
                                        : 'bg-slate-100/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                        }`}>
                                        <div className={`p-2.5 rounded-xl shrink-0 ${estudioBiblicoData.oracionInicio ? 'bg-emerald-500/20' : 'bg-slate-200/50 dark:bg-slate-700/50'}`}>
                                            <Heart className={`w-5 h-5 ${estudioBiblicoData.oracionInicio ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                                                {t('dashboard.oracion')}
                                            </p>
                                            <p className={`text-sm font-bold ${estudioBiblicoData.oracionInicio ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {estudioBiblicoData.oracionInicio ? t('dashboard.yes') : t('dashboard.no')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all min-h-[72px] ${estudioBiblicoData.congregacionPie
                                        ? 'bg-blue-500/10 border-blue-500/20'
                                        : 'bg-slate-100/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                        }`}>
                                        <div className={`p-2.5 rounded-xl shrink-0 ${estudioBiblicoData.congregacionPie ? 'bg-blue-500/20' : 'bg-slate-200/50 dark:bg-slate-700/50'}`}>
                                            <Users className={`w-5 h-5 ${estudioBiblicoData.congregacionPie ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                                                {t('culto.protocol.congregation')}
                                            </p>
                                            <p className={`text-sm font-bold ${estudioBiblicoData.congregacionPie ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {estudioBiblicoData.congregacionPie ? t('dashboard.standing') : t('dashboard.seated')}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Observaciones */}
                    {(() => {
                        const obsContent = observacionesData?.trim()
                        const hasObs = !!obsContent && obsContent.length > 0

                        return (
                            <div className={`mb-4 md:mb-6 rounded-xl border ${hasObs
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'} ${hasObs ? 'p-3' : 'p-2'}
                                `}>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${hasObs ? 'mb-1' : 'mb-0'} ${hasObs
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-400 dark:text-slate-500'
                                    }`}>
                                    📝 {t('dashboard.observaciones')}
                                </p>
                                {hasObs ? (
                                    <p className="text-sm font-medium leading-snug text-amber-800 dark:text-amber-200">
                                        {obsContent}
                                    </p>
                                ) : (
                                    <div className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-700/50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300 italic">
                                        {t('dashboard.noObservaciones')}
                                    </div>
                                )}
                            </div>
                        )
                    })()}

                    {/* Distribución de Responsables */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6 md:mb-8 items-start">
                        {culto.tipo_culto?.tiene_lectura_introduccion && (
                            <div className="w-full md:w-1/2 lg:w-[58%] shrink-0">
                                <AssignmentPill
                                    label={t('cultos.intro')}
                                    usuario={culto.usuario_intro}
                                    lectura={lecturaData?.lecturaIntro}
                                    himnario={culto.plan_himnos_coros}
                                    tipoCulto={culto.tipo_culto?.nombre}
                                    footerAction={lecturaData?.showAddButton ? (
                                        <button
                                            type="button"
                                            onClick={() => setAddLecturaModalOpen(true)}
                                            className="w-full py-2.5 sm:py-3 px-4 sm:px-5 border border-dashed border-primary/25 rounded-2xl flex items-center justify-center gap-2 sm:gap-2.5 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 active:scale-[0.98] transition-all cursor-pointer touch-manipulation text-primary"
                                        >
                                            <Plus className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" strokeWidth={2.5} />
                                            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                                                {t('dashboard.addReadingButton')}
                                            </span>
                                        </button>
                                    ) : undefined}
                                />
                            </div>
                        )}

                        <div className="flex-1 w-full space-y-4">
                            {culto.tipo_culto?.tiene_ensenanza && (
                                <AssignmentPill label={t('cultos.ensenanza')} usuario={culto.usuario_ensenanza} />
                            )}
                            {culto.tipo_culto?.tiene_testimonios && (
                                <AssignmentPill label={t('cultos.testimonios')} usuario={culto.usuario_testimonios} />
                            )}
                            {culto.tipo_culto?.tiene_lectura_finalizacion && (
                                <AssignmentPill
                                    label={t('cultos.finalizacion')}
                                    usuario={culto.usuario_finalizacion}
                                    lectura={lecturaData?.lecturaFinal}
                                />
                            )}
                        </div>
                    </div>

                    {/* Botón de Acción: siempre Ver detalles */}
                    <Link href={`/dashboard/cultos/${culto.id}`} className="block w-full">
                        <button
                            aria-label={t('dashboard.viewFullDetails')}
                            className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-lg"
                        >
                            <span className="sm:hidden">{t('dashboard.viewDetailsShort')}</span>
                            <span className="hidden sm:inline">{t('dashboard.viewFullDetails')}</span>
                        </button>
                    </Link>
                </CardContent>
            </Card>

            <AddLecturaModal
                isOpen={addLecturaModalOpen}
                onClose={() => setAddLecturaModalOpen(false)}
                cultoId={culto.id}
                userId={introUserId}
                tipo="introduccion"
                onSuccess={() => {
                    router.refresh()
                    setAddLecturaModalOpen(false)
                }}
            />
        </div>
    )
}
