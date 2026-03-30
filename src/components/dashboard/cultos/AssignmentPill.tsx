import type { ReactNode } from 'react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { Profile } from '@/types/database'
import { Clock, BookOpen, Music, Users, BookMarked } from 'lucide-react'
import { UserAvatar } from './UserAvatar'

export function AssignmentPill({ label, usuario, lectura, himnario, tipoCulto, action, footerAction, temaIntroduccionAlabanza }: { label: string, usuario: Partial<Profile> | null | undefined, lectura?: any, himnario?: any[], tipoCulto?: string, action?: ReactNode, footerAction?: ReactNode, temaIntroduccionAlabanza?: string | null }) {
    const { t } = useI18n()
    if (!usuario && !lectura && (!himnario || himnario.length === 0) && footerAction == null && !temaIntroduccionAlabanza) return null

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

    const hasExtraContent = lectura || (himnario && himnario.length > 0) || !!temaIntroduccionAlabanza
    const hasFooter = footerAction != null

    const nombreCompleto = usuario ? `${usuario.nombre ?? ''} ${(usuario.apellidos ?? '').split(' ')[0] ?? ''}`.trim() : ''

    return (
        <div className={`flex p-3 sm:p-4 bg-white/50 dark:bg-black/20 rounded-3xl border border-black/5 dark:border-white/5 backdrop-blur-sm transition-all shadow-sm relative ${hasExtraContent || hasFooter ? 'flex-col gap-3' : 'flex-row items-center gap-2 sm:gap-3'} ${hasExtraContent ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30' : ''}`}>
            {usuario ? (
                <div className={`flex items-center gap-2 sm:gap-3 w-full min-w-0 ${hasExtraContent ? 'border-b border-black/5 dark:border-white/5 pb-2.5' : ''}`}>
                    <UserAvatar usuario={usuario} size="md" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-[10px] text-blue-600 dark:text-blue-300 font-black uppercase tracking-wider mb-0.5">{label}</p>
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
                        <p className="text-[10px] text-blue-600 dark:text-blue-300 font-black uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="font-bold text-sm text-slate-400 italic line-clamp-2 wrap-break-word leading-tight">
                            {t('dashboard.himnario.unassigned')}
                        </p>
                    </div>
                    {action != null && <div className="shrink-0 self-center">{action}</div>}
                </div>
            )}

            {/* Tema introducción Alabanza */}
            {temaIntroduccionAlabanza && (
                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-blue-50/80 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/40 w-full min-w-0">
                    <BookMarked className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <p className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 leading-tight line-clamp-2">
                        {t(temaIntroduccionAlabanza)}
                    </p>
                </div>
            )}

            {/* Lectura integrada */}
            {lectura && (
                <div className="flex items-center gap-3 p-3.5 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/60 dark:border-white/10 shadow-sm relative group w-full min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 text-white border border-white/20">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <div className="flex items-center flex-wrap gap-1.5 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">{t('dashboard.himnario.reading')}</span>
                            <div className="w-1 h-1 rounded-full bg-blue-300 hidden xs:block" />
                            <div className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{t('dashboard.himnario.registered')}</span>
                            </div>
                        </div>
                        <p className="font-black text-[13px] sm:text-sm text-slate-800 dark:text-slate-100 leading-tight truncate">
                            {lectura.libro} {lectura.capitulo_inicio}:{lectura.versiculo_inicio}
                            {(lectura.capitulo_fin !== lectura.capitulo_inicio || lectura.versiculo_fin !== lectura.versiculo_inicio) && (
                                <>
                                    {' - '}
                                    {lectura.capitulo_fin === lectura.capitulo_inicio
                                        ? lectura.versiculo_fin
                                        : `${lectura.capitulo_fin}:${lectura.versiculo_fin}`}
                                </>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Himnario integrado */}
            {himnario && himnario.length > 0 && (
                <div className={`flex flex-col gap-4 p-4 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/60 dark:border-white/10 shadow-sm relative w-full ${lectura ? 'mt-1' : ''}`}>
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

                    <div className="space-y-2">
                        {(himnarioOrdenado ?? himnario ?? []).map((item, idx) => {
                            const details = item.tipo === 'himno' ? item.himno : item.coro
                            if (!details) return null
                            return (
                                <div key={idx} className="flex flex-col gap-2 group/item p-2 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl transition-all">
                                    <div className="flex items-center gap-3 min-w-0 w-full">
                                        {/* Número redondo y limpio */}
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shadow-sm ${item.tipo === 'himno' ? 'bg-indigo-500 text-white' : 'bg-purple-500 text-white'}`}>
                                            {details.numero}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${item.tipo === 'himno' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/30' : 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800/30'}`}>
                                                    {item.tipo}
                                                </span>
                                            </div>
                                            <p className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-tight group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                                                {details.titulo}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Duración debajo del título */}
                                    <div className="flex items-center gap-1.5 ml-11 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-black/5 dark:border-white/10 shadow-sm w-fit">
                                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                        <span className="font-mono text-[11px] font-black text-slate-600 dark:text-slate-300">
                                            {formatDuration(details.duracion_segundos)}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Total de tiempo: fondo más visible, alineado con el bloque himnario (indigo) */}
                    <div className="flex items-center justify-center mt-3 pt-4 border-t border-indigo-200/50 dark:border-indigo-500/25">
                        <div
                            className="px-4 py-3 sm:px-5 sm:py-3.5 w-full max-w-sm rounded-2xl flex items-center gap-3 cursor-default
                            border border-indigo-200/90 dark:border-indigo-400/35
                            bg-linear-to-br from-indigo-50 via-white to-blue-50/90 dark:from-indigo-950/70 dark:via-zinc-900/85 dark:to-slate-950/90
                            shadow-md shadow-indigo-500/10 dark:shadow-indigo-950/40
                            ring-1 ring-indigo-500/20 dark:ring-indigo-400/25"
                        >
                            <div className="w-9 h-9 rounded-xl bg-indigo-600/15 dark:bg-indigo-400/20 flex items-center justify-center shrink-0 border border-indigo-300/50 dark:border-indigo-500/40 shadow-inner">
                                <Clock className="w-[18px] h-[18px] text-indigo-700 dark:text-indigo-300" />
                            </div>
                            <div className="flex flex-col items-start leading-none min-w-0">
                                <span className="text-xs sm:text-sm font-black uppercase tracking-wide mb-1 text-indigo-800/90 dark:text-indigo-200">
                                    {t('dashboard.himnario.timeTotal')}
                                </span>
                                <span className="text-indigo-950 dark:text-white font-mono text-base font-black tracking-tighter tabular-nums">
                                    {formatDuration(totalSeconds)}{' '}
                                    <span className="text-[9px] font-sans font-bold text-indigo-600/80 dark:text-indigo-300/90">min</span>
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
