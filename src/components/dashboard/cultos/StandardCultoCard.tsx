import { Card, CardContent } from '@/components/ui/Card'
import { Clock, Plus } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { AssignmentPill } from './AssignmentPill'
import { computeCultoDetails } from '@/lib/utils/computeCultoDetails'
import Link from 'next/link'
import { Culto } from '@/types/database'

export function StandardCultoCard({ culto, esHoy }: { culto: Culto, esHoy: boolean }) {
    const { t } = useI18n()
    const { observacionesData, lecturaData } = computeCultoDetails(culto)

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

                        {/* Hora Simple */}
                        <div className="flex items-center gap-2 text-slate-500 font-bold mb-4">
                            <Clock className="w-5 h-5 text-blue-500" />
                            <span className="text-lg">{(culto.hora_inicio || '').slice(0, 5)}</span>
                        </div>
                    </div>

                    {/* Observaciones (Universal) */}
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
                                    himnario={(culto as any).plan_himnos_coros}
                                    tipoCulto={culto.tipo_culto?.nombre}
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

                    {/* Botón de Acción */}
                    {lecturaData?.showAddButton ? (
                        <Link href={`/dashboard/cultos/${culto.id}`} className="block w-full">
                            <button className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <Plus className="w-4 h-4" />
                                <span>{t('dashboard.addReading')}</span>
                            </button>
                        </Link>
                    ) : (
                        <Link href={`/dashboard/cultos/${culto.id}`} className="block w-full">
                            <button className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-lg">
                                {t('dashboard.viewFullDetails')}
                            </button>
                        </Link>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
