'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Clock, Plus, Info, Music } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { AssignmentPill } from './AssignmentPill'
import { computeCultoDetails } from '@/lib/utils/computeCultoDetails'
import { upsertReadingPreserveOrder } from '@/lib/utils/upsert-reading'
import Link from 'next/link'
import { Culto } from '@/types/database'
import { InstruccionesCultoModal } from '@/components/InstruccionesCultoModal'
import AddLecturaModal from '@/components/AddLecturaModal'
import type { RolInstruccionCulto } from '@/types/database'

type InstrModal = { open: boolean; rol: RolInstruccionCulto } | null

interface InstrIconBtnProps {
    readonly rol: RolInstruccionCulto
    readonly onOpen: (rol: RolInstruccionCulto) => void
}

/** Icono "i" de instrucciones dentro de la tarjeta: visible, accesible y responsive (zona táctil ≥36px). */
function InstrIconBtn({ rol, onOpen }: InstrIconBtnProps) {
    return (
        <button
            type="button"
            onClick={() => onOpen(rol)}
            aria-label="Ver instrucciones"
            className="flex items-center justify-center w-9 h-9 min-w-9 min-h-9 rounded-full
                bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400
                hover:bg-blue-200 dark:hover:bg-blue-800/50 border border-blue-200 dark:border-blue-700/50
                active:scale-95 transition-all shadow-sm touch-manipulation"
        >
            <Info className="w-4 h-4 shrink-0" strokeWidth={2.5} />
        </button>
    )
}

export function StandardCultoCard({ culto, esHoy, currentUserId }: Readonly<{ culto: Culto; esHoy: boolean; currentUserId: string }>) {
    const { t } = useI18n()
    const { observacionesData, lecturaData, temaIntroduccionAlabanza } = computeCultoDetails(culto)
    const [instrModal, setInstrModal] = useState<InstrModal>(null)
    const [addLecturaModalOpen, setAddLecturaModalOpen] = useState(false)
    const [editingLectura, setEditingLectura] = useState<any | null>(null)
    const [localLecturas, setLocalLecturas] = useState<any[]>((culto as any).lecturas || [])

    const introUserId = (culto.usuario_intro as { id?: string } | null)?.id ?? currentUserId

    const cultoTypeId = culto.tipo_culto?.id ?? culto.tipo_culto_id
    const cultoNombre = culto.tipo_culto?.nombre ?? ''

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
    const lecturasIntro = localLecturas.filter((l: any) => l.tipo_lectura === 'introduccion')

    return (
        <>
            <div className="relative group">
                <div className="absolute inset-0 bg-blue-600/20 blur-2xl rounded-[2.5rem] transform group-hover:scale-105 transition-transform duration-500 -z-10" />
                <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
                    <div className="h-2 w-full" style={{ backgroundColor: culto.tipo_culto?.color || '#3b82f6' }} />

                    <CardContent className="p-4 sm:p-5 md:p-8">
                        {/* Header compacto */}
                        <div className="mb-4 md:mb-6">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.18em] shadow-lg ${esHoy ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-blue-600 text-white shadow-blue-500/30'}`}>
                                    {esHoy ? t('dashboard.today') : getTranslatedCultoName(cultoNombre)}
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm">{(culto.hora_inicio || '').slice(0, 5)}</span>
                                </div>
                            </div>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-tight">
                                {getTranslatedCultoName(cultoNombre)}
                            </h2>
                            <div className="flex items-center gap-2 text-slate-500 font-bold mt-1.5">
                                <Clock className="w-5 h-5 text-blue-500" />
                                <span className="text-xs uppercase tracking-widest">Fecha</span>
                                <span className="text-xs">{new Date(culto.fecha).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Observaciones */}
                        {(() => {
                            const obsContent = observacionesData?.trim()
                            const hasObs = !!obsContent && obsContent.length > 0
                            return (
                                <div className={`mb-4 md:mb-6 rounded-xl border ${hasObs
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'} ${hasObs ? 'p-3' : 'p-2'}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${hasObs ? 'mb-1' : 'mb-0'} ${hasObs
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-slate-400 dark:text-slate-500'}`}>
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
                                        lecturas={lecturasIntro}
                                        onEditReading={(reading) => {
                                            setEditingLectura(reading)
                                            setAddLecturaModalOpen(true)
                                        }}
                                        himnario={culto.plan_himnos_coros}
                                        tipoCulto={cultoNombre}
                                        temaIntroduccionAlabanza={cultoNombre.toLowerCase().includes('alabanza') ? temaIntroduccionAlabanza : undefined}
                        action={cultoTypeId ? <InstrIconBtn rol="introduccion" onOpen={openModal} /> : undefined}
                        footerAction={(canAddReading || showAddHimnos) ? (
                            <div className="flex flex-col gap-2 w-full">
                                {canAddReading && (
                                    <button
                                        type="button"
                                        onClick={() => setAddLecturaModalOpen(true)}
                                        className="w-full py-2.5 sm:py-3 px-4 sm:px-5 border border-dashed border-primary/25 rounded-2xl flex items-center justify-center gap-2 sm:gap-2.5 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 active:scale-[0.98] transition-all cursor-pointer touch-manipulation text-primary"
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
                                        className="w-full py-2.5 sm:py-3 px-4 sm:px-5 border border-dashed border-indigo-400/30 rounded-2xl flex items-center justify-center gap-2 sm:gap-2.5 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-400/50 active:scale-[0.98] transition-all touch-manipulation text-indigo-600 dark:text-indigo-400"
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
                                        usuario={culto.usuario_ensenanza}
                                        action={cultoTypeId ? <InstrIconBtn rol="ensenanza" onOpen={openModal} /> : undefined}
                                    />
                                )}
                                {culto.tipo_culto?.tiene_testimonios && (
                                    <AssignmentPill
                                        label={t('cultos.testimonios')}
                                        usuario={culto.usuario_testimonios}
                                        action={cultoTypeId ? <InstrIconBtn rol="testimonios" onOpen={openModal} /> : undefined}
                                    />
                                )}
                                {culto.tipo_culto?.tiene_lectura_finalizacion && (
                                    <AssignmentPill
                                        label={t('cultos.finalizacion')}
                                        usuario={culto.usuario_finalizacion}
                                        lectura={lecturaData?.lecturaFinal}
                                        action={cultoTypeId ? <InstrIconBtn rol="finalizacion" onOpen={openModal} /> : undefined}
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
                        setLocalLecturas((prev) => upsertReadingPreserveOrder(prev, savedReading as any))
                    }
                    setAddLecturaModalOpen(false)
                    setEditingLectura(null)
                }}
                onDeleteSuccess={(deletedId) => {
                    setLocalLecturas((prev) => prev.filter((l: any) => l.id !== deletedId))
                    setAddLecturaModalOpen(false)
                    setEditingLectura(null)
                }}
            />
        </>
    )
}
