'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GitCompareArrows, ChevronLeft, ChevronRight, RefreshCw, Trophy, ShieldCheck, ShieldAlert } from 'lucide-react'
import {
    BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'
import PageHero from '@/components/PageHero'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { Sede } from '@/types/database'
import { getControlData, type ControlData } from '../control/actions'

type SedeOption = Pick<Sede, 'id' | 'nombre' | 'slug' | 'activo'>

interface Props {
    readonly sedes: SedeOption[]
    readonly initialData: ControlData
    readonly initialYear: number
    readonly initialMonth: number
}

interface SedeMetrica {
    sedeId: string
    nombre: string
    slug: string
    activo: boolean
    cultos: number
    realizados: number
    participaciones: number
    lecturas: number
    coberturaPct: number
    hermanosActivos: number
    topHermano: { nombre: string; total: number } | null
    intro: number
    ensenanza: number
    testimonios: number
    finalizacion: number
}

export default function ComparadorClient({ sedes, initialData, initialYear, initialMonth }: Props) {
    const { t, language } = useI18n()
    const [year, setYear] = useState(initialYear)
    const [month, setMonth] = useState(initialMonth)
    const [data, setData] = useState<ControlData>(initialData)
    const [isLoading, setIsLoading] = useState(false)
    const isFirst = useRef(true)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        const res = await getControlData(null, year, month)
        if (res.success && res.data) setData(res.data)
        else toast.error(res.error ?? t('common.error'))
        setIsLoading(false)
    }, [year, month, t])

    useEffect(() => {
        if (isFirst.current) { isFirst.current = false; return }
        void loadData()
    }, [loadData])

    const mesNombre = useMemo(() => {
        const nombre = new Date(year, month - 1, 1).toLocaleDateString(language, { month: 'long' })
        return nombre.charAt(0).toUpperCase() + nombre.slice(1)
    }, [year, month, language])

    const cambiarMes = (delta: number) => {
        const d = new Date(year, month - 1 + delta, 1)
        setYear(d.getFullYear())
        setMonth(d.getMonth() + 1)
    }

    // Métricas por sede derivadas de getControlData (DRY, sin nueva query).
    const metricas = useMemo<SedeMetrica[]>(() => {
        const byNombre = new Map<string, SedeMetrica>()
        for (const s of data.sedesResumen) {
            byNombre.set(s.nombre, {
                sedeId: s.sedeId,
                nombre: s.nombre,
                slug: s.slug,
                activo: s.activo,
                cultos: s.cultos,
                realizados: 0,
                participaciones: s.participaciones,
                lecturas: s.lecturas,
                coberturaPct: 0,
                hermanosActivos: 0,
                topHermano: null,
                intro: 0,
                ensenanza: 0,
                testimonios: 0,
                finalizacion: 0,
            })
        }
        // Cobertura de púlpito (% cultos con introducción) y desglose por rol
        const conIntro = new Map<string, number>()
        for (const c of data.cultos) {
            const m = byNombre.get(c.sede)
            if (!m) continue
            if (c.estado === 'realizado') m.realizados++
            if (c.intro) { m.intro++; conIntro.set(c.sede, (conIntro.get(c.sede) ?? 0) + 1) }
            if (c.ensenanza) m.ensenanza++
            if (c.testimonios) m.testimonios++
            if (c.finalizacion) m.finalizacion++
        }
        // Top hermano + hermanos activos por sede
        for (const h of data.hermanos) {
            if (h.total <= 0) continue
            const m = byNombre.get(h.sede)
            if (!m) continue
            m.hermanosActivos++
            if (!m.topHermano || h.total > m.topHermano.total) m.topHermano = { nombre: h.nombre, total: h.total }
        }
        for (const m of byNombre.values()) {
            m.coberturaPct = m.cultos > 0 ? Math.round(((conIntro.get(m.nombre) ?? 0) / m.cultos) * 100) : 0
        }
        return [...byNombre.values()].sort((a, b) => b.participaciones - a.participaciones)
    }, [data])

    const chartData = useMemo(
        () => metricas.map(m => ({
            nombre: m.nombre,
            [t('admin.stats.introShort')]: m.intro,
            [t('admin.stats.teachingShort')]: m.ensenanza,
            [t('admin.stats.testimoniesShort')]: m.testimonios,
            [t('admin.stats.finalShort')]: m.finalizacion,
        })),
        [metricas, t],
    )

    const coberturaClass = (pct: number): string => {
        if (pct >= 90) return 'text-emerald-600'
        if (pct >= 60) return 'text-amber-600'
        return 'text-red-600'
    }

    return (
        <div className="ofrenda-liquid-scope space-y-6 animate-in fade-in duration-500" data-page="admin-comparador">
            <PageHero
                title={t('admin.comparador.title')}
                subtitle={t('admin.comparador.desc')}
                icon={GitCompareArrows}
                animate={false}
                data-testid="comparador-hero"
            />

            {/* Navegación por mes */}
            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={() => cambiarMes(-1)}
                    aria-label={t('common.previous')}
                    data-testid="comparador-mes-anterior"
                    className="w-9 h-9 rounded-xl bg-white border-[1.5px] border-[rgba(184,150,74,0.32)] flex items-center justify-center text-[#1f2e85] hover:border-[#b8964a] transition-all"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-black text-[#1f2e85] min-w-32 text-center" data-testid="comparador-mes-label" suppressHydrationWarning>
                    {mesNombre} {year}
                </span>
                <button
                    type="button"
                    onClick={() => cambiarMes(1)}
                    aria-label={t('common.next')}
                    data-testid="comparador-mes-siguiente"
                    className="w-9 h-9 rounded-xl bg-white border-[1.5px] border-[rgba(184,150,74,0.32)] flex items-center justify-center text-[#1f2e85] hover:border-[#b8964a] transition-all"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => void loadData()}
                    aria-label={t('admin.control.actualizar')}
                    data-testid="comparador-refresh"
                    className="w-9 h-9 rounded-xl bg-white border-[1.5px] border-[rgba(184,150,74,0.32)] flex items-center justify-center text-[#1f2e85] hover:border-[#b8964a] transition-all"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Tarjetas comparativas */}
            <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${isLoading ? 'opacity-60' : ''}`} data-testid="comparador-cards">
                {metricas.map((m, index) => (
                    <motion.div
                        key={m.sedeId}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        data-testid={`comparador-card-${m.slug}`}
                        className="ofrenda-liquid-card rounded-3xl p-5 space-y-3"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="font-black text-slate-900 truncate">{m.nombre}</h3>
                            <span className={`flex items-center gap-1 text-[10px] font-black uppercase ${coberturaClass(m.coberturaPct)}`}>
                                {m.coberturaPct >= 90 ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                                {m.coberturaPct}%
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                [m.cultos, t('admin.control.kpiCultos')],
                                [m.participaciones, t('admin.control.colParticipacionesShort')],
                                [m.lecturas, t('admin.control.kpiLecturas')],
                                [m.hermanosActivos, t('admin.control.kpiHermanos')],
                            ].map(([value, label]) => (
                                <div key={String(label)} className="rounded-xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-2 text-center">
                                    <p className="font-black text-[#1f2e85] leading-none">{value}</p>
                                    <p className="text-[9px] uppercase font-bold text-slate-500 mt-1 truncate" suppressHydrationWarning>{label}</p>
                                </div>
                            ))}
                        </div>
                        {m.topHermano && (
                            <div className="flex items-center gap-2 pt-1 text-xs">
                                <Trophy className="w-3.5 h-3.5 text-[#b8964a] shrink-0" />
                                <span className="font-bold text-slate-700 truncate">{m.topHermano.nombre}</span>
                                <span className="ml-auto font-black text-[#1f2e85]">{m.topHermano.total}</span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Gráfica comparativa de participaciones por rol */}
            <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="comparador-chart">
                <h3 className="font-black text-slate-900 mb-4" suppressHydrationWarning>{t('admin.comparador.chartTitulo')}</h3>
                {chartData.length === 0 ? (
                    <p className="text-sm text-slate-400 italic" suppressHydrationWarning>{t('admin.control.sinDatos')}</p>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <ReBarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey={t('admin.stats.introShort')} stackId="a" fill="#1f2e85" />
                            <Bar dataKey={t('admin.stats.teachingShort')} stackId="a" fill="#8b5cf6" />
                            <Bar dataKey={t('admin.stats.testimoniesShort')} stackId="a" fill="#f59e0b" />
                            <Bar dataKey={t('admin.stats.finalShort')} stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </ReBarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Tabla comparativa */}
            <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="comparador-tabla">
                <h3 className="font-black text-slate-900 mb-4" suppressHydrationWarning>{t('admin.comparador.tablaTitulo')}</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                        <thead>
                            <tr className="text-left text-[11px] uppercase font-black text-slate-500 border-b border-[rgba(184,150,74,0.25)]">
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.control.colSede')}</th>
                                <th className="py-2 pr-3 text-center" suppressHydrationWarning>{t('admin.control.kpiCultos')}</th>
                                <th className="py-2 pr-3 text-center" suppressHydrationWarning>{t('admin.control.estadoRealizado')}</th>
                                <th className="py-2 pr-3 text-center" suppressHydrationWarning>{t('admin.control.kpiParticipaciones')}</th>
                                <th className="py-2 pr-3 text-center" suppressHydrationWarning>{t('admin.comparador.cobertura')}</th>
                                <th className="py-2 pr-3 text-center" suppressHydrationWarning>{t('admin.control.kpiLecturas')}</th>
                                <th className="py-2 text-center" suppressHydrationWarning>{t('admin.control.kpiHermanos')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metricas.map(m => (
                                <tr key={m.sedeId} className="border-b border-slate-100 last:border-0 hover:bg-[#f8f3e8]/50 transition-colors">
                                    <td className="py-2 pr-3 font-bold text-slate-800">
                                        <Link href={`/dashboard/admin/control`} className="hover:text-[#1f2e85]">{m.nombre}</Link>
                                    </td>
                                    <td className="py-2 pr-3 text-center text-slate-600">{m.cultos}</td>
                                    <td className="py-2 pr-3 text-center text-slate-600">{m.realizados}</td>
                                    <td className="py-2 pr-3 text-center font-black text-[#1f2e85]">{m.participaciones}</td>
                                    <td className={`py-2 pr-3 text-center font-black ${coberturaClass(m.coberturaPct)}`}>{m.coberturaPct}%</td>
                                    <td className="py-2 pr-3 text-center text-slate-600">{m.lecturas}</td>
                                    <td className="py-2 text-center text-slate-600">{m.hermanosActivos}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-xs text-slate-400" suppressHydrationWarning>{t('admin.comparador.coberturaNota')}</p>
            </div>
        </div>
    )
}
