'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Clock, Plus } from 'lucide-react'
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

                <CardContent className="p-6 md:p-8">
                    {/* Badge de Estado */}
                    <div className="flex justify-between items-start mb-6">
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${esHoy ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-blue-600 text-white shadow-blue-500/30'}`}>
                            {esHoy ? t('dashboard.today') : getTranslatedCultoName(culto.tipo_culto?.nombre)}
                        </div>
                    </div>

                    {/* Info Principal */}
                    <div className="mb-8">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">
                            {getTranslatedCultoName(culto.tipo_culto?.nombre)}
                        </h2>

                        {/* Hora - con inicio anticipado */}
                        <div className="flex items-center gap-2 text-slate-500 font-bold mb-4">
                            <Clock className="w-5 h-5 text-blue-500" />
                            <div className="flex items-center gap-2 flex-wrap">
                                {estudioBiblicoData?.inicioAnticipado ? (
                                    <>
                                        <span className="text-lg line-through opacity-50">{(culto.hora_inicio || '').slice(0, 5)}</span>
                                        <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                                            {estudioBiblicoData.inicioAnticipado.horaReal}
                                        </span>
                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-black uppercase">
                                            {estudioBiblicoData.inicioAnticipado.minutos} {t('dashboard.minBefore')}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-lg">{(culto.hora_inicio || '').slice(0, 5)}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Protocol Badges - Solo Estudio Bíblico */}
                    {estudioBiblicoData?.esEstudio && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${estudioBiblicoData.oracionInicio
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                }`}>
                                <span>🙏</span>
                                <span>{t('dashboard.oracion')}: {estudioBiblicoData.oracionInicio ? t('dashboard.yes') : t('dashboard.no')}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${estudioBiblicoData.congregacionPie
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                }`}>
                                <span>🪑</span>
                                <span>{estudioBiblicoData.congregacionPie ? t('dashboard.standing') : t('dashboard.seated')}</span>
                            </div>
                        </div>
                    )}

                    {/* Observaciones */}
                    {(() => {
                        const obsContent = observacionesData?.trim()
                        const hasObs = !!obsContent && obsContent.length > 0

                        return (
                            <div className={`mb-8 p-3 rounded-xl border ${hasObs
                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'
                                }`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${hasObs
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-slate-400 dark:text-slate-500'
                                    }`}>
                                    📝 {t('dashboard.observaciones')}
                                </p>
                                <p className={`text-sm font-medium leading-snug ${hasObs
                                    ? 'text-amber-800 dark:text-amber-200'
                                    : 'text-slate-400 dark:text-slate-500 italic'
                                    }`}>
                                    {hasObs ? obsContent : t('dashboard.noObservaciones')}
                                </p>
                            </div>
                        )
                    })()}

                    {/* Distribución de Responsables */}
                    <div className="flex flex-col md:flex-row gap-6 mb-10 items-start">
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
                        <button className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-lg">
                            {t('dashboard.viewFullDetails')}
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
