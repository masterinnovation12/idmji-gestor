'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Clock, Plus, Info } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { AssignmentPill } from './AssignmentPill'
import { computeCultoDetails } from '@/lib/utils/computeCultoDetails'
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
    const router = useRouter()
    const { observacionesData, lecturaData } = computeCultoDetails(culto)
    const [instrModal, setInstrModal] = useState<InstrModal>(null)
    const [addLecturaModalOpen, setAddLecturaModalOpen] = useState(false)

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

    return (
        <>
            <div className="relative group">
                <div className="absolute inset-0 bg-blue-600/20 blur-2xl rounded-[2.5rem] transform group-hover:scale-105 transition-transform duration-500 -z-10" />
                <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
                    <div className="h-2 w-full" style={{ backgroundColor: culto.tipo_culto?.color || '#3b82f6' }} />

                    <CardContent className="p-6 md:p-8">
                        {/* Badge */}
                        <div className="flex justify-between items-start mb-6">
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${esHoy ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-blue-600 text-white shadow-blue-500/30'}`}>
                                {esHoy ? t('dashboard.today') : getTranslatedCultoName(cultoNombre)}
                            </div>
                        </div>

                        {/* Info Principal */}
                        <div className="mb-8">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">
                                {getTranslatedCultoName(cultoNombre)}
                            </h2>
                            <div className="flex items-center gap-2 text-slate-500 font-bold mb-4">
                                <Clock className="w-5 h-5 text-blue-500" />
                                <span className="text-lg">{(culto.hora_inicio || '').slice(0, 5)}</span>
                            </div>
                        </div>

                        {/* Observaciones */}
                        {(() => {
                            const obsContent = observacionesData?.trim()
                            const hasObs = !!obsContent && obsContent.length > 0
                            return (
                                <div className={`mb-8 p-3 rounded-xl border ${hasObs
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${hasObs
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-slate-400 dark:text-slate-500'}`}>
                                        📝 {t('dashboard.observaciones')}
                                    </p>
                                    <p className={`text-sm font-medium leading-snug ${hasObs
                                        ? 'text-amber-800 dark:text-amber-200'
                                        : 'text-slate-400 dark:text-slate-500 italic'}`}>
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
                                        tipoCulto={cultoNombre}
                                        action={cultoTypeId ? <InstrIconBtn rol="introduccion" onOpen={openModal} /> : undefined}
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
                            <button className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-lg">
                                {t('dashboard.viewFullDetails')}
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
                onClose={() => setAddLecturaModalOpen(false)}
                cultoId={culto.id}
                userId={introUserId}
                tipo="introduccion"
                onSuccess={() => {
                    router.refresh()
                    setAddLecturaModalOpen(false)
                }}
            />
        </>
    )
}
