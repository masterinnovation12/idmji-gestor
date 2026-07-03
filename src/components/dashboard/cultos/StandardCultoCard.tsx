'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Clock, Plus, Music, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { es, ca } from 'date-fns/locale'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { AssignmentPill } from './AssignmentPill'
import { computeCultoDetails } from '@/lib/utils/computeCultoDetails'
import { upsertReadingPreserveOrder } from '@/lib/utils/upsert-reading'
import Link from 'next/link'
import { Culto, LecturaBiblica, PlanHimnoCoro } from '@/types/database'
import { InstruccionesCultoModal } from '@/components/InstruccionesCultoModal'
import AddLecturaModal from '@/components/AddLecturaModal'
import type { RolInstruccionCulto } from '@/types/database'
import { CultoInstruccionesIconBtn, type InstrModalState } from './CultoInstruccionesIconBtn'
import { FormattedNote } from '@/components/ui/FormattedNote'

export function StandardCultoCard({ culto, esHoy, currentUserId }: Readonly<{ culto: Culto; esHoy: boolean; currentUserId: string }>) {
    const { t, language } = useI18n()
    const dateLocale = language === 'ca-ES' ? ca : es
    const { observacionesData, lecturaData, temaIntroduccionAlabanza, observacionesIntroduccion, observacionesFinalizacion, observacionesEnsenanza, observacionesTestimonios } = computeCultoDetails(culto)
    const [instrModal, setInstrModal] = useState<InstrModalState>(null)
    const [addLecturaModalOpen, setAddLecturaModalOpen] = useState(false)
    const [editingLectura, setEditingLectura] = useState<LecturaBiblica | null>(null)
    const [localLecturas, setLocalLecturas] = useState<LecturaBiblica[]>(((culto as unknown) as { lecturas?: LecturaBiblica[] }).lecturas || [])

    const introUserId = (culto.usuario_intro as { id?: string } | null)?.id ?? currentUserId

    const cultoTypeId = culto.tipo_culto?.id ?? culto.tipo_culto_id
    const cultoNombre = culto.tipo_culto?.nombre ?? ''
    const ensenanzaModo = ((culto.meta_data as { ensenanza_modo?: 'hermano' | 'video_hna_maria_luisa' } | undefined)?.ensenanza_modo ?? 'hermano')
    const ensenanzaEsVideo = ensenanzaModo === 'video_hna_maria_luisa'

    const getTranslatedCultoName = (name: string | undefined) => {
        if (!name) return ''
        const lower = name.toLowerCase()
        if (lower.includes('estudio')) return t('culto.estudio')
        if (lower.includes('alabanza')) return t('culto.alabanza')
        if (lower.includes('enseñanza') || lower.includes('ensenanza')) return t('culto.ensenanza')
        if (lower.includes('testimonios')) return t('culto.testimonios')
        return name
    }

    const openModal = (rol: RolInstruccionCulto) => setInstrModal({ open: true, rol })
    const closeModal = () => setInstrModal(null)

    const isEnsenanza = cultoNombre.toLowerCase().includes('enseñanza') || cultoNombre.toLowerCase().includes('ensenanza')
    const showAddHimnos = !!(culto.tipo_culto?.tiene_himnos_y_coros && (!culto.plan_himnos_coros || culto.plan_himnos_coros.length === 0))
    const addHimnosText = isEnsenanza ? t('dashboard.addCorosHimnosButton') : t('dashboard.addCorosButton')
    const canAddReading = !!culto.tipo_culto?.tiene_lectura_introduccion
    const lecturasIntro = localLecturas.filter((l) => l.tipo_lectura === 'introduccion')

    return (
        <>
            <div className="relative group">
                <div className="absolute inset-0 bg-[#b8964a]/20 blur-2xl rounded-[2.5rem] transform group-hover:scale-105 transition-transform duration-500 -z-10" />
                <Card className="ofrenda-liquid-card rounded-[2.5rem] shadow-2xl overflow-hidden">
                    <div className="h-2 w-full" style={{ backgroundColor: culto.tipo_culto?.color || '#3b82f6' }} />

                    <CardContent className="p-4 sm:p-5 md:p-8">
                        {/* Header compacto */}
                        <div className="mb-4 md:mb-6">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.18em] shadow-lg border ${esHoy ? 'bg-red-500 border-red-400 text-white shadow-red-500/30' : 'bg-gradient-to-br from-[#1f2e85] to-[#283593] border-[#b8964a] text-white shadow-[rgba(31,46,133,0.3)]'}`}>
                                    {esHoy ? t('dashboard.today') : getTranslatedCultoName(cultoNombre)}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                                    <Clock className="w-4 h-4 text-[#b8964a]" />
                                    <span className="text-sm text-[#1f2e85] font-black">{(culto.hora_inicio || '').slice(0, 5)}</span>
                                </div>
                            </div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight">
                                {getTranslatedCultoName(cultoNombre)}
                            </h2>
                            <div className="flex items-center gap-2 text-slate-500 font-bold mt-1.5">
                                <CalendarDays className="w-4 h-4 text-[#b8964a]" />
                                <span className="text-xs" suppressHydrationWarning>
                                    {(() => {
                                        const f = format(new Date(culto.fecha + 'T12:00:00'), 'PPPP', { locale: dateLocale })
                                        return f.charAt(0).toUpperCase() + f.slice(1)
                                    })()}
                                </span>
                            </div>
                        </div>

                        {/* Observaciones */}
                        {(() => {
                            const obsContent = observacionesData?.trim()
                            const hasObs = !!obsContent && obsContent.length > 0
                            return (
                                <div className={`mb-4 md:mb-6 rounded-xl border ${hasObs
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-[#f8f3e8]/50 border-[rgba(184,150,74,0.25)]'} ${hasObs ? 'p-3' : 'p-2'}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${hasObs ? 'mb-1' : 'mb-0'} ${hasObs
                                        ? 'text-amber-600'
                                        : 'text-[#b68f2f]/80'}`}>
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

                        {/* Distribución de Responsables.
                            @container: el reparto en 2 columnas depende del ancho REAL de la tarjeta, no del
                            viewport. En portátiles de 14" la sidebar reduce la tarjeta y, al partir por viewport,
                            la columna de introducción (que contiene el himnario) quedaba comprimida y los títulos
                            de himnos/coros se solapaban. Con @2xl (ancho de tarjeta ≥ 42rem) se mantienen las dos
                            columnas; por debajo se apila y el himnario ocupa todo el ancho disponible.
                            Umbral @xl (36rem): la tarjeta del dashboard está limitada a max-w-7xl, así que su
                            ancho real ronda ~481px en 14" (se apila) y ~667px en 18" (dos columnas). */}
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
                                        tipoCulto={cultoNombre}
                                        nota={observacionesIntroduccion}
                                        temaIntroduccionAlabanza={cultoNombre.toLowerCase().includes('alabanza') ? temaIntroduccionAlabanza : undefined}
                        action={cultoTypeId ? <CultoInstruccionesIconBtn rol="introduccion" onOpen={openModal} /> : undefined}
                        footerAction={(canAddReading || showAddHimnos) ? (
                            <div className="flex flex-col gap-2 w-full">
                                {canAddReading && (
                                    <button
                                        type="button"
                                        onClick={() => setAddLecturaModalOpen(true)}
                                        className="w-full py-2.5 sm:py-3 px-4 sm:px-5 border-[1.5px] border-dashed border-[rgba(184,150,74,0.5)] rounded-2xl flex items-center justify-center gap-2 sm:gap-2.5 bg-[#f8f3e8]/50 hover:bg-[#f8f3e8] hover:border-[#b8964a] active:scale-[0.98] transition-all cursor-pointer touch-manipulation text-[#1f2e85]"
                                    >
                                        <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                                            {t('dashboard.addReadingButton')}
                                        </span>
                                    </button>
                                )}
                                {showAddHimnos && (
                                    <Link
                                        href={`/dashboard/cultos/${culto.id}#himnos`}
                                        className="w-full py-2.5 sm:py-3 px-4 sm:px-5 border border-dashed border-indigo-400/30 rounded-2xl flex items-center justify-center gap-2 sm:gap-2.5 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-400/50 active:scale-[0.98] transition-all touch-manipulation text-indigo-600"
                                    >
                                        <Music className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                                            {addHimnosText}
                                        </span>
                                    </Link>
                                )}
                            </div>
                        ) : undefined}
                                    />
                                </div>
                            )}

                            <div className="flex-1 w-full space-y-4">
                                {culto.tipo_culto?.tiene_ensenanza && (
                                    <AssignmentPill
                                        label={t('cultos.ensenanza')}
                                        usuario={ensenanzaEsVideo ? { nombre: 'Video Hna. María Luisa', apellidos: 'Piraquive' } : culto.usuario_ensenanza}
                                        nota={observacionesEnsenanza}
                                        action={cultoTypeId ? <CultoInstruccionesIconBtn rol="ensenanza" onOpen={openModal} /> : undefined}
                                    />
                                )}
                                {culto.tipo_culto?.tiene_testimonios && (
                                    <AssignmentPill
                                        label={t('cultos.testimonios')}
                                        usuario={culto.usuario_testimonios}
                                        nota={observacionesTestimonios}
                                        action={cultoTypeId ? <CultoInstruccionesIconBtn rol="testimonios" onOpen={openModal} /> : undefined}
                                    />
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

                        {/* Botón de Acción: siempre Ver detalles */}
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
            </div>

            {/* Modal instrucciones */}
            {instrModal && (
                <InstruccionesCultoModal
                    isOpen={instrModal.open}
                    onClose={closeModal}
                    cultoTypeId={cultoTypeId ?? ''}
                    cultoTypeNombre={getTranslatedCultoName(cultoNombre)}
                    rol={instrModal.rol}
                />
            )}

            {/* Modal añadir lectura (acceso directo desde dashboard) */}
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
        </>
    )
}
