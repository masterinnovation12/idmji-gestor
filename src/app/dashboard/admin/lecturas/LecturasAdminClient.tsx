'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpenText, Trophy, RefreshCw, Layers, BookMarked } from 'lucide-react'
import { toast } from 'sonner'
import PageHero from '@/components/PageHero'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { Sede } from '@/types/database'
import { getLecturasPorSede, type LecturasPorSedeData, type LibroCount } from './actions'

type SedeOption = Pick<Sede, 'id' | 'nombre' | 'slug' | 'activo'>

interface Props {
    readonly sedes: SedeOption[]
    readonly initialData: LecturasPorSedeData
}

const TODAS = '__todas__'
const TODOS_ANIOS = '__todos__'

export default function LecturasAdminClient({ sedes, initialData }: Props) {
    const { t } = useI18n()
    const [sedeId, setSedeId] = useState<string>(TODAS)
    const [year, setYear] = useState<string>(TODOS_ANIOS)
    const [data, setData] = useState<LecturasPorSedeData>(initialData)
    const [isLoading, setIsLoading] = useState(false)
    const isFirst = useRef(true)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        const res = await getLecturasPorSede(
            sedeId === TODAS ? null : sedeId,
            year === TODOS_ANIOS ? null : Number(year),
        )
        if (res.success && res.data) setData(res.data)
        else toast.error(res.error ?? t('common.error'))
        setIsLoading(false)
    }, [sedeId, year, t])

    useEffect(() => {
        if (isFirst.current) { isFirst.current = false; return }
        void loadData()
    }, [loadData])

    const verTodas = sedeId === TODAS && data.porSede.length > 1
    const maxGlobal = data.global.topLibros[0]?.count ?? 0

    const lecturasLabel = useCallback(
        (n: number) => t('admin.lecturasSede.lecturasCount').replace('{n}', String(n)),
        [t],
    )

    const years = useMemo(() => data.years, [data.years])

    return (
        <div className="ofrenda-liquid-scope space-y-6 animate-in fade-in duration-500" data-page="admin-lecturas-sede">
            <PageHero
                title={t('admin.lecturasSede.title')}
                subtitle={t('admin.lecturasSede.desc')}
                icon={BookOpenText}
                animate={false}
                data-testid="lecturas-sede-hero"
            />

            {/* Controles: sede + año + refrescar */}
            <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-slate-600" suppressHydrationWarning>{t('admin.lecturasSede.sede')}</span>
                    <select
                        value={sedeId}
                        onChange={(e) => setSedeId(e.target.value)}
                        data-testid="lecturas-sede-selector"
                        className="rounded-xl bg-white border-[1.5px] border-[rgba(184,150,74,0.32)] px-3 py-2 font-bold text-[#1f2e85] focus:border-[#b8964a] focus:outline-none"
                    >
                        <option value={TODAS}>{t('admin.lecturasSede.todasSedes')}</option>
                        {sedes.map((s) => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                    </select>
                </label>

                <label className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-slate-600" suppressHydrationWarning>{t('admin.lecturasSede.anio')}</span>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        data-testid="lecturas-sede-year"
                        className="rounded-xl bg-white border-[1.5px] border-[rgba(184,150,74,0.32)] px-3 py-2 font-bold text-[#1f2e85] focus:border-[#b8964a] focus:outline-none"
                    >
                        <option value={TODOS_ANIOS}>{t('admin.lecturasSede.todosAnios')}</option>
                        {years.map((y) => (
                            <option key={y} value={String(y)}>{y}</option>
                        ))}
                    </select>
                </label>

                <button
                    type="button"
                    onClick={() => void loadData()}
                    aria-label={t('admin.lecturasSede.actualizar')}
                    data-testid="lecturas-sede-refresh"
                    className="w-9 h-9 rounded-xl bg-white border-[1.5px] border-[rgba(184,150,74,0.32)] flex items-center justify-center text-[#1f2e85] hover:border-[#b8964a] transition-all"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* KPIs globales del ámbito */}
            <div className={`grid gap-4 sm:grid-cols-3 ${isLoading ? 'opacity-60' : ''}`} data-testid="lecturas-sede-global">
                <div className="ofrenda-liquid-card rounded-3xl p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Layers className="w-4 h-4 text-[#b8964a]" />
                        <p className="text-[11px] uppercase font-black tracking-wide" suppressHydrationWarning>{t('admin.lecturasSede.totalLecturas')}</p>
                    </div>
                    <p className="mt-2 text-3xl font-black text-[#1f2e85]" data-testid="lecturas-sede-total">{data.global.totalLecturas}</p>
                </div>
                <div className="ofrenda-liquid-card rounded-3xl p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                        <BookMarked className="w-4 h-4 text-[#b8964a]" />
                        <p className="text-[11px] uppercase font-black tracking-wide" suppressHydrationWarning>{t('admin.lecturasSede.librosDistintos')}</p>
                    </div>
                    <p className="mt-2 text-3xl font-black text-[#1f2e85]">{data.global.librosDistintos}</p>
                </div>
                <div className="ofrenda-liquid-card rounded-3xl p-5">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Trophy className="w-4 h-4 text-[#b8964a]" />
                        <p className="text-[11px] uppercase font-black tracking-wide" suppressHydrationWarning>{t('admin.lecturasSede.libroMasLeido')}</p>
                    </div>
                    {data.global.topLibros[0] ? (
                        <div className="mt-2 flex items-baseline gap-2">
                            <p className="text-2xl font-black text-[#1f2e85] truncate">{data.global.topLibros[0].libro}</p>
                            <span className="text-sm font-bold text-slate-500 shrink-0">· {lecturasLabel(data.global.topLibros[0].count)}</span>
                        </div>
                    ) : (
                        <p className="mt-2 text-sm text-slate-400 italic" suppressHydrationWarning>{t('admin.lecturasSede.sinDatos')}</p>
                    )}
                </div>
            </div>

            {/* Ranking de libros del ámbito */}
            <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="lecturas-sede-ranking">
                <h3 className="font-black text-slate-900 mb-4" suppressHydrationWarning>{t('admin.lecturasSede.rankingTitulo')}</h3>
                {data.global.topLibros.length === 0 ? (
                    <p className="text-sm text-slate-400 italic" suppressHydrationWarning>{t('admin.lecturasSede.sinDatos')}</p>
                ) : (
                    <ol className="space-y-2">
                        {data.global.topLibros.map((l, i) => (
                            <LibroBar key={l.libro} libro={l} rank={i + 1} max={maxGlobal} label={lecturasLabel(l.count)} />
                        ))}
                    </ol>
                )}
            </div>

            {/* Desglose por sede (solo cuando el ámbito es "todas") */}
            {verTodas && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="lecturas-sede-cards">
                    {data.porSede.map((s, index) => {
                        const max = s.topLibros[0]?.count ?? 0
                        return (
                            <motion.div
                                key={s.sedeId}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                data-testid={`lecturas-sede-card-${s.slug}`}
                                className="ofrenda-liquid-card rounded-3xl p-5 space-y-3"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-black text-slate-900 truncate">{s.nombre}</h3>
                                    <span className="text-xs font-bold text-slate-500 shrink-0" suppressHydrationWarning>
                                        {lecturasLabel(s.totalLecturas)}
                                    </span>
                                </div>
                                {s.topLibro ? (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Trophy className="w-3.5 h-3.5 text-[#b8964a] shrink-0" />
                                        <span className="font-bold text-slate-700 truncate">{s.topLibro.libro}</span>
                                        <span className="ml-auto font-black text-[#1f2e85] shrink-0">{s.topLibro.count}</span>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic" suppressHydrationWarning>{t('admin.lecturasSede.sinDatos')}</p>
                                )}
                                {s.topLibros.length > 0 && (
                                    <ol className="space-y-1.5 pt-1">
                                        {s.topLibros.slice(0, 5).map((l, i) => (
                                            <LibroBar key={l.libro} libro={l} rank={i + 1} max={max} label={String(l.count)} compact />
                                        ))}
                                    </ol>
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            )}

            <p className="text-xs text-slate-400" suppressHydrationWarning>{t('admin.lecturasSede.nota')}</p>
        </div>
    )
}

function LibroBar({
    libro,
    rank,
    max,
    label,
    compact = false,
}: {
    libro: LibroCount
    rank: number
    max: number
    label: string
    compact?: boolean
}) {
    const pct = max > 0 ? Math.round((libro.count / max) * 100) : 0
    return (
        <li className="flex items-center gap-3">
            <span className={`shrink-0 font-black text-[#b8964a] ${compact ? 'text-xs w-4' : 'text-sm w-5'}`}>{rank}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className={`font-bold text-slate-800 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{libro.libro}</span>
                    <span className={`shrink-0 font-black text-[#1f2e85] ${compact ? 'text-xs' : 'text-sm'}`}>{label}</span>
                </div>
                <div className={`mt-1 rounded-full bg-[#f8f3e8] overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}>
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#1f2e85] to-[#b8964a]"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                </div>
            </div>
        </li>
    )
}
