'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Clock, Plus, Heart, Users, ArrowRight, HelpCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { AssignmentPill } from './AssignmentPill'
import { computeCultoDetails } from '@/lib/utils/computeCultoDetails'
import { upsertReadingPreserveOrder } from '@/lib/utils/upsert-reading'
import Link from 'next/link'
import { Culto, LecturaBiblica, PlanHimnoCoro } from '@/types/database'
import type { RolInstruccionCulto } from '@/types/database'
import AddLecturaModal from '@/components/AddLecturaModal'
import { InstruccionesCultoModal } from '@/components/InstruccionesCultoModal'
import { CultoInstruccionesIconBtn, type InstrModalState } from './CultoInstruccionesIconBtn'
import { FormattedNote } from '@/components/ui/FormattedNote'

export function EstudioBiblicoCard({ culto, esHoy, currentUserId }: Readonly<{ culto: Culto; esHoy: boolean; currentUserId: string }>) {
    const { t } = useI18n()
    const { estudioBiblicoData, observacionesData, lecturaData, observacionesIntroduccion, observacionesFinalizacion } = computeCultoDetails(culto)
    const [instrModal, setInstrModal] = useState<InstrModalState>(null)
    const [addLecturaModalOpen, setAddLecturaModalOpen] = useState(false)
    const [editingLectura, setEditingLectura] = useState<LecturaBiblica | null>(null)
    const [localLecturas, setLocalLecturas] = useState<LecturaBiblica[]>((culto as Culto & { lecturas?: LecturaBiblica[] }).lecturas || [])
    const canAddReading = !!culto.tipo_culto?.tiene_lectura_introduccion
    const lecturasIntro = localLecturas.filter((l) => l.tipo_lectura === 'introduccion')

    const introUserId = (culto.usuario_intro as { id?: string } | null)?.id ?? currentUserId
    const cultoTypeId = culto.tipo_culto?.id ?? culto.tipo_culto_id
    const cultoNombre = culto.tipo_culto?.nombre ?? ''

    const openModal = (rol: RolInstruccionCulto) => setInstrModal({ open: true, rol })
    const closeModal = () => setInstrModal(null)

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
        <>
        <div className="relative group">
            <div className="absolute inset-0 bg-[#b8964a]/20 blur-2xl rounded-[2.5rem] transform group-hover:scale-105 transition-transform duration-500 -z-10" />
            <Card className="ofrenda-liquid-card rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="h-2 w-full" style={{ backgroundColor: culto.tipo_culto?.color || '#3b82f6' }} />

                <CardContent className="p-4 sm:p-5 md:p-8">
                    <div className="mb-4 md:mb-6">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.18em] shadow-lg ${esHoy ? 'bg-red-500 border border-red-400 text-white shadow-red-500/30' : 'bg-gradient-to-br from-[#1f2e85] to-[#283593] border border-[#b8964a] text-white shadow-[rgba(31,46,133,0.3)]'}`}>
                                {esHoy ? t('dashboard.today') : getTranslatedCultoName(culto.tipo_culto?.nombre)}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                                <Clock className="w-4 h-4 text-[#b8964a]" />
                                <span className="text-sm text-[#1f2e85] font-black">{(culto.hora_inicio || '').slice(0, 5)}</span>
                            </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">
                            {getTranslatedCultoName(culto.tipo_culto?.nombre)}
                        </h2>

                        <div className="flex items-center gap-3 text-slate-500 font-bold mb-2">
                            <Clock className="w-5 h-5 text-[#b8964a] shrink-0" />
                            {estudioBiblicoData?.configuracionDefinida ? (
                                estudioBiblicoData.inicioAnticipado ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-lg line-through opacity-50">{(culto.hora_inicio || '').slice(0, 5)}</span>
                                        <span className="text-lg font-black text-amber-600">
                                            {estudioBiblicoData.inicioAnticipado.horaReal}
                                        </span>
                                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-700 rounded-xl text-[10px] font-black uppercase">
                                            {estudioBiblicoData.inicioAnticipado.minutos} {t('dashboard.minBefore')}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-lg">{(culto.hora_inicio || '').slice(0, 5)}</span>
                                )
                            ) : (
                                <span className="text-lg text-slate-400 italic">
                                    {(culto.hora_inicio || '').slice(0, 5)}
                                </span>
                            )}
                        </div>
                    </div>

                    {estudioBiblicoData?.esEstudio && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                            {!estudioBiblicoData.configuracionDefinida ? (
                                <Link
                                    href={`/dashboard/cultos/${culto.id}`}
                                    className="sm:col-span-2 flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-dashed border-[rgba(184,150,74,0.35)] bg-[#f8f3e8]/40 hover:border-[#b8964a] hover:bg-[#f8f3e8] transition-all min-h-[72px] touch-manipulation"
                                >
                                    <div className="p-2.5 rounded-xl bg-slate-200/50">
                                        <HelpCircle className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-0.5">
                                            {t('dashboard.configToDefine')}
                                        </p>
                                        <p className="text-sm font-semibold text-slate-600">
                                            {t('dashboard.toDefine')}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-[#1f2e85] shrink-0" />
                                </Link>
                            ) : (
                                <>
                                    <div className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all min-h-[72px] ${estudioBiblicoData.oracionInicio
                                        ? 'bg-emerald-500/10 border-emerald-500/20'
                                        : 'bg-slate-100/80 border-slate-200'
                                        }`}>
                                        <div className={`p-2.5 rounded-xl shrink-0 ${estudioBiblicoData.oracionInicio ? 'bg-emerald-500/20' : 'bg-slate-200/50'}`}>
                                            <Heart className={`w-5 h-5 ${estudioBiblicoData.oracionInicio ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                                                {t('dashboard.oracion')}
                                            </p>
                                            <p className={`text-sm font-bold ${estudioBiblicoData.oracionInicio ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                {estudioBiblicoData.oracionInicio ? t('dashboard.yes') : t('dashboard.no')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all min-h-[72px] ${estudioBiblicoData.congregacionPie
                                        ? 'bg-blue-500/10 border-blue-500/20'
                                        : 'bg-slate-100/80 border-slate-200'
                                        }`}>
                                        <div className={`p-2.5 rounded-xl shrink-0 ${estudioBiblicoData.congregacionPie ? 'bg-blue-500/20' : 'bg-slate-200/50'}`}>
                                            <Users className={`w-5 h-5 ${estudioBiblicoData.congregacionPie ? 'text-blue-600' : 'text-slate-400'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                                                {t('culto.protocol.congregation')}
                                            </p>
                                            <p className={`text-sm font-bold ${estudioBiblicoData.congregacionPie ? 'text-blue-700' : 'text-slate-500'}`}>
                                                {estudioBiblicoData.congregacionPie ? t('dashboard.standing') : t('dashboard.seated')}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {(() => {
                        const obsContent = observacionesData?.trim()
                        const hasObs = !!obsContent && obsContent.length > 0

                        return (
                            <div className={`mb-4 md:mb-6 rounded-xl border ${hasObs
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-[#f8f3e8]/50 border-[rgba(184,150,74,0.25)]'} ${hasObs ? 'p-3' : 'p-2'}
                                `}>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${hasObs ? 'mb-1' : 'mb-0'} ${hasObs
                                    ? 'text-amber-600'
                                    : 'text-slate-400'
                                    }`}>
                                    📝 {t('dashboard.observaciones')}
                                </p>
                                {hasObs ? (
                                    <FormattedNote
                                        text={obsContent}
                                        className="text-sm font-medium leading-snug text-amber-800"
                                    />
                                ) : (
                                    <div className="inline-flex items-center rounded-full border border-[rgba(184,150,74,0.3)] bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-500 italic">
                                        {t('dashboard.noObservaciones')}
                                    </div>
                                )}
                            </div>
                        )
                    })()}

                    {/* @container: el reparto en 2 columnas depende del ancho REAL de la tarjeta, no del
                        viewport (en portátiles de 14" la sidebar reduce la tarjeta y el himnario quedaba
                        comprimido). Con @2xl se mantienen 2 columnas; por debajo se apila a ancho completo. */}
                    <div className="@container mb-6 md:mb-8">
                    <div className="flex flex-col @xl:flex-row gap-4 @xl:gap-6 items-start">
                        {culto.tipo_culto?.tiene_lectura_introduccion && (
                            <div className="w-full @xl:w-[58%] shrink-0">
                                <AssignmentPill
                                    label={t('cultos.intro')}
                                    usuario={culto.usuario_intro}
                                    lecturas={lecturasIntro}
                                    onEditReading={(reading) => {
                                        setEditingLectura(reading)
                                        setAddLecturaModalOpen(true)
                                    }}
                                    himnario={culto.plan_himnos_coros as PlanHimnoCoro[] | undefined}
                                    tipoCulto={culto.tipo_culto?.nombre}
                                    nota={observacionesIntroduccion}
                                    action={cultoTypeId ? <CultoInstruccionesIconBtn rol="introduccion" onOpen={openModal} /> : undefined}
                                    footerAction={canAddReading ? (
                                        <button
                                            type="button"
                                            onClick={() => setAddLecturaModalOpen(true)}
                                            className="w-full py-2.5 sm:py-3 px-4 sm:px-5 border-[1.5px] border-dashed border-[rgba(184,150,74,0.5)] rounded-2xl flex items-center justify-center gap-2 sm:gap-2.5 bg-[#f8f3e8]/50 hover:bg-[#f8f3e8] hover:border-[#b8964a] active:scale-[0.98] transition-all cursor-pointer touch-manipulation text-[#1f2e85]"
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
                                    lectura={lecturaData?.lecturaFinal ?? undefined}
                                    nota={observacionesFinalizacion}
                                    action={cultoTypeId ? <CultoInstruccionesIconBtn rol="finalizacion" onOpen={openModal} /> : undefined}
                                />
                            )}
                        </div>
                    </div>
                    </div>

                    <Link href={`/dashboard/cultos/${culto.id}`} className="block w-full">
                        <button
                            aria-label={t('dashboard.viewFullDetails')}
                            className="w-full py-4 border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_6px_22px_rgba(31,46,133,0.35)] hover:shadow-[0_8px_28px_rgba(31,46,133,0.45)] active:scale-95 transition-all"
                        >
                            <span className="sm:hidden">{t('dashboard.viewDetailsShort')}</span>
                            <span className="hidden sm:inline">{t('dashboard.viewFullDetails')}</span>
                        </button>
                    </Link>
                </CardContent>
            </Card>

            <AddLecturaModal
                isOpen={addLecturaModalOpen}
                onClose={() => {
                    setAddLecturaModalOpen(false)
                    setEditingLectura(null)
                }}
                cultoId={culto.id}
                userId={introUserId}
                tipo="introduccion"
                lecturaId={editingLectura?.id}
                isEdit={!!editingLectura}
                initialReading={editingLectura}
                onSuccess={(savedReading) => {
                    if (savedReading) {
                        setLocalLecturas((prev) => upsertReadingPreserveOrder(prev, savedReading as LecturaBiblica))
                    }
                    setAddLecturaModalOpen(false)
                    setEditingLectura(null)
                }}
                onDeleteSuccess={(deletedId) => {
                    setLocalLecturas((prev) => prev.filter((l) => l.id !== deletedId))
                    setAddLecturaModalOpen(false)
                    setEditingLectura(null)
                }}
            />
        </div>

            {instrModal && (
                <InstruccionesCultoModal
                    isOpen={instrModal.open}
                    onClose={closeModal}
                    cultoTypeId={cultoTypeId ?? ''}
                    cultoTypeNombre={getTranslatedCultoName(cultoNombre)}
                    rol={instrModal.rol}
                />
            )}
        </>
    )
}
