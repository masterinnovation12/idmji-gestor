import type { ReactNode } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { formatTemaAlabanzaLabel } from '@/lib/constants/temasAlabanza'
import { Profile, LecturaBiblica, PlanHimnoCoro } from '@/types/database'
import { Clock, BookOpen, Music, Users, BookMarked, Pencil } from 'lucide-react'
import { UserAvatar } from './UserAvatar'
import { FormattedNote } from '@/components/ui/FormattedNote'

interface AssignmentPillProps {
    label: string
    usuario: Partial<Profile> | null | undefined
    lectura?: LecturaBiblica
    lecturas?: LecturaBiblica[]
    himnario?: PlanHimnoCoro[]
    tipoCulto?: string
    action?: ReactNode
    footerAction?: ReactNode
    temaIntroduccionAlabanza?: string | null
    /** Nota específica para este rol (texto plano con **negrita** y saltos de línea). */
    nota?: string
    onEditReading?: (reading: LecturaBiblica) => void
}

export function AssignmentPill({ label, usuario, lectura, lecturas, himnario, tipoCulto, action, footerAction, temaIntroduccionAlabanza, nota, onEditReading }: AssignmentPillProps) {
    const { t } = useI18n()
    const notaTrim = nota?.trim()
    if (!usuario && !lectura && (!lecturas || lecturas.length === 0) && (!himnario || himnario.length === 0) && footerAction == null && !temaIntroduccionAlabanza && !notaTrim) return null

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const totalSeconds = himnario?.reduce((acc, item) => acc + (item.himno?.duracion_segundos || item.coro?.duracion_segundos || 0), 0) || 0

    const himnarioTitle = tipoCulto?.toLowerCase().includes('enseñanza') || tipoCulto?.toLowerCase().includes('ensenanza')
        ? t('dashboard.himnario.timeEnsenanza')
        : t('dashboard.himnario.timeAlabanza')

    // En Enseñanza: 3 himnos primero (ordenados), luego 3 coros (ordenados)
    const himnarioOrdenado = himnario && (tipoCulto?.toLowerCase().includes('enseñanza') || tipoCulto?.toLowerCase().includes('ensenanza'))
        ? [...himnario].sort((a, b) => {
            if (a.tipo !== b.tipo) return a.tipo === 'himno' ? -1 : 1
            return (a.orden ?? 0) - (b.orden ?? 0)
        })
        : himnario

    const lecturasRegistradas = (lecturas && lecturas.length > 0) ? lecturas : (lectura ? [lectura] : [])
    const hasExtraContent = lecturasRegistradas.length > 0 || (himnario && himnario.length > 0) || !!temaIntroduccionAlabanza || !!notaTrim
    const hasFooter = footerAction != null
    const allCoros = (himnarioOrdenado ?? himnario ?? []).length > 0 && (himnarioOrdenado ?? himnario ?? []).every((item) => item.tipo === 'coro')

    const nombreCompleto = usuario ? `${usuario.nombre ?? ''} ${(usuario.apellidos ?? '').split(' ')[0] ?? ''}`.trim() : ''

    return (
        <div className={`flex p-3 sm:p-4 bg-white/70 rounded-3xl border border-[rgba(184,150,74,0.18)] transition-all shadow-sm relative ${hasExtraContent || hasFooter ? 'flex-col gap-3' : 'flex-row items-center gap-2 sm:gap-3'} ${hasExtraContent ? 'bg-[#f8f3e8]/40 border-[rgba(184,150,74,0.28)]' : ''}`}>
            {usuario ? (
                <div className={`flex items-center gap-2 sm:gap-3 w-full min-w-0 ${hasExtraContent ? 'border-b border-black/5 dark:border-white/5 pb-2.5' : ''}`}>
                    <UserAvatar usuario={usuario} size="md" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-[10px] text-[#1f2e85] font-black uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-2 wrap-break-word leading-tight">
                            {nombreCompleto || usuario.nombre}
                        </p>
                    </div>
                    {action != null && <div className="shrink-0 self-center">{action}</div>}
                </div>
            ) : (
                <div className={`flex items-center gap-2 sm:gap-3 w-full min-w-0 ${hasExtraContent ? 'border-b border-black/5 dark:border-white/5 pb-2.5' : ''}`}>
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold border-2 border-dashed border-slate-300 dark:border-slate-700 shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-[10px] text-[#1f2e85] font-black uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="font-bold text-sm text-slate-400 italic line-clamp-2 wrap-break-word leading-tight">
                            {t('dashboard.himnario.unassigned')}
                        </p>
                    </div>
                    {action != null && <div className="shrink-0 self-center">{action}</div>}
                </div>
            )}

            {/* Nota específica del rol (intro / finalización) */}
            {notaTrim && (
                <div className="flex gap-2.5 p-3 bg-amber-50/80 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/40 w-full min-w-0">
                    <span className="text-base shrink-0 leading-none mt-0.5" aria-hidden>📝</span>
                    <FormattedNote
                        text={notaTrim}
                        className="text-[13px] sm:text-sm font-medium leading-snug text-amber-800 dark:text-amber-200 min-w-0"
                    />
                </div>
            )}

            {/* Tema introducción Alabanza */}
            {temaIntroduccionAlabanza && (
                <div className="flex items-center justify-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-blue-50/80 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/40 w-full min-w-0">
                    <BookMarked className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <p className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-300 leading-tight text-center line-clamp-2">
                        {formatTemaAlabanzaLabel(temaIntroduccionAlabanza, t)}
                    </p>
                </div>
            )}

            {/* Lectura integrada */}
            {lecturasRegistradas.length > 0 && (
                <div className="flex flex-col gap-2 p-3.5 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/60 dark:border-white/10 shadow-sm relative group w-full min-w-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1f2e85] to-[#283593] flex items-center justify-center shadow-lg shadow-[rgba(31,46,133,0.25)] shrink-0 text-white border border-[#b8964a]">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                            <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">{lecturasRegistradas.length > 1 ? t('dashboard.himnario.readings') : t('dashboard.himnario.reading')}</span>
                                <div className="w-1 h-1 rounded-full bg-blue-300 hidden xs:block" />
                                <div className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{t('dashboard.himnario.registered')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        {lecturasRegistradas.map((item, idx) => (
                            <div key={item.id ?? `${item.libro}-${item.capitulo_inicio}-${item.versiculo_inicio}-${idx}`} className="flex items-center justify-between gap-2">
                                <p className="font-black text-[13px] sm:text-sm text-slate-800 dark:text-slate-100 leading-tight">
                                    {item.libro} {item.capitulo_inicio}:{item.versiculo_inicio}
                                    {(item.capitulo_fin !== item.capitulo_inicio || item.versiculo_fin !== item.versiculo_inicio) && (
                                        <>
                                            {' - '}
                                            {item.capitulo_fin === item.capitulo_inicio
                                                ? item.versiculo_fin
                                                : `${item.capitulo_fin}:${item.versiculo_fin}`}
                                        </>
                                    )}
                                </p>
                                {onEditReading && (
                                    <button
                                        type="button"
                                        onClick={() => onEditReading(item)}
                                        className="shrink-0 w-7 h-7 rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors flex items-center justify-center"
                                        aria-label={t('dashboard.himnario.editReading')}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Himnario integrado */}
            {himnario && himnario.length > 0 && (
                <div className={`flex flex-col gap-3 p-3 sm:p-4 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/60 dark:border-white/10 shadow-sm relative w-full ${lectura ? 'mt-1' : ''}`}>
                    {/* Header del Himnario - Ahora más integrado */}
                    <div className="flex items-center gap-3 pb-3 border-b border-black/5 dark:border-white/5">
                        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 text-white">
                            <Music className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 leading-none">{himnarioTitle}</h3>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tight">{himnario.length} {t('dashboard.himnario.pieces')}</p>
                        </div>
                    </div>

                    {allCoros && (
                        <div className="flex items-center justify-start mb-1.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50">
                                Coros
                            </span>
                        </div>
                    )}
                    <div className="space-y-1.5 sm:space-y-2">
                        {(himnarioOrdenado ?? himnario ?? []).map((item, idx) => {
                            const details = item.tipo === 'himno' ? item.himno : item.coro
                            if (!details) return null
                            return (
                                <div key={idx} className="flex items-center gap-2 sm:gap-3 group/item p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl transition-all min-w-0 w-full">
                                        {/* Número redondo y limpio */}
                                        <div className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black shadow-sm ${item.tipo === 'himno' ? 'bg-indigo-500 text-white' : 'bg-purple-500 text-white'}`}>
                                            {details.numero}
                                        </div>

                                        <div className="min-w-0 flex-1 flex items-center gap-2">
                                            {!allCoros && (
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${item.tipo === 'himno' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/30' : 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800/30'}`}>
                                                        {item.tipo}
                                                    </span>
                                                </div>
                                            )}
                                            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight break-words group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                                                {details.titulo}
                                            </p>
                                        </div>

                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-black/5 dark:border-white/10 shadow-sm shrink-0">
                                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                        <span className="font-mono text-[11px] font-black text-slate-600 dark:text-slate-300">
                                            {formatDuration(details.duracion_segundos ?? 0)}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Total de tiempo: fondo más visible, alineado con el bloque himnario (indigo) */}
                    <div className="flex items-center justify-center mt-2 pt-3 border-t border-indigo-200/50 dark:border-indigo-500/25">
                        <div
                            className="px-3 py-2.5 sm:px-5 sm:py-3.5 w-fit max-w-full rounded-2xl flex items-center justify-center gap-2.5 sm:gap-3 cursor-default
                            border-[1.5px] border-[rgba(184,150,74,0.5)]
                            bg-gradient-to-br from-[#f8f3e8] via-white to-[#f8f3e8]
                            shadow-md shadow-[rgba(31,46,133,0.1)]
                            ring-1 ring-[rgba(184,150,74,0.25)]"
                        >
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1f2e85]/10 flex items-center justify-center shrink-0 border border-[rgba(184,150,74,0.35)] shadow-inner">
                                <Clock className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#1f2e85]" />
                            </div>
                            <div className="flex flex-col items-center text-center leading-none min-w-0">
                                <span className="text-[11px] sm:text-sm font-black uppercase tracking-wide mb-1 text-[#1f2e85]">
                                    {t('dashboard.himnario.timeTotal')}
                                </span>
                                <span className="text-[#1f2e85] font-mono text-sm sm:text-base font-black tracking-tighter tabular-nums">
                                    {formatDuration(totalSeconds)}{' '}
                                    <span className="text-[9px] font-sans font-bold text-[#b68f2f]">min</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {hasFooter && (
                <div className="w-full pt-3 border-t border-black/5 dark:border-white/5 flex justify-center">
                    {footerAction}
                </div>
            )}
        </div>
    )
}
