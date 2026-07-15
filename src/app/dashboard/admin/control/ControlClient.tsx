'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    LayoutDashboard, ChevronLeft, ChevronRight, RefreshCw, FileSpreadsheet, FileText,
    CalendarCheck, Users, BookOpen, Mic2, HandHeart, Building2, CircleDot,
    AlertTriangle, Info, CheckCircle2, ChevronDown, ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import {
    BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import PageHero from '@/components/PageHero'
import { Button } from '@/components/ui/Button'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { Sede } from '@/types/database'
import { getControlData, getDataHealth, getTendencias, updateAsistenciaCulto, type ControlData, type HealthAlert, type TendenciaMes } from './actions'
import { exportControlExcel, type ExcelLabels } from './excel'
import { buildControlPdf, type PdfLabels } from './pdfExport'

type SedeOption = Pick<Sede, 'id' | 'nombre' | 'slug' | 'activo'>

interface Props {
    readonly sedes: SedeOption[]
    readonly initialData: ControlData
    readonly initialAlerts: HealthAlert[]
    readonly initialTendencias: { meses: TendenciaMes[]; sedes: string[] } | null
    readonly initialYear: number
    readonly initialMonth: number
}

/** Colores de línea por sede (paleta de la app). */
const TREND_COLORS = ['#1f2e85', '#b8964a', '#8b5cf6', '#10b981', '#ef4444', '#0ea5e9']

const AUTO_REFRESH_MS = 60_000

export default function ControlClient({ sedes, initialData, initialAlerts, initialTendencias, initialYear, initialMonth }: Props) {
    const { t, language } = useI18n()
    const [sedeId, setSedeId] = useState<string | null>(null)
    const [year, setYear] = useState(initialYear)
    const [month, setMonth] = useState(initialMonth)
    const [data, setData] = useState<ControlData>(initialData)
    const [alerts, setAlerts] = useState<HealthAlert[]>(initialAlerts)
    const [expandedAlert, setExpandedAlert] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [isExportingPdf, setIsExportingPdf] = useState(false)
    const [tendencias, setTendencias] = useState<{ meses: TendenciaMes[]; sedes: string[] } | null>(initialTendencias)
    const [metricaTendencia, setMetricaTendencia] = useState<'participaciones' | 'cultos'>('participaciones')
    const [asistenciaEdit, setAsistenciaEdit] = useState<{ id: string; value: string } | null>(null)
    const isFirst = useRef(true)

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true)
        const [res, healthRes, tendenciasRes] = await Promise.all([
            getControlData(sedeId, year, month),
            getDataHealth(sedeId),
            getTendencias(sedeId),
        ])
        if (res.success && res.data) setData(res.data)
        else if (!silent) toast.error(res.error ?? t('common.error'))
        if (healthRes.success && healthRes.data) setAlerts(healthRes.data)
        if (tendenciasRes.success && tendenciasRes.data) setTendencias(tendenciasRes.data)
        if (!silent) setIsLoading(false)
    }, [sedeId, year, month, t])

    useEffect(() => {
        if (isFirst.current) {
            isFirst.current = false
            return
        }
        void loadData()
    }, [loadData])

    // Actualización en tiempo real (sondeo cada minuto)
    useEffect(() => {
        const id = setInterval(() => void loadData(true), AUTO_REFRESH_MS)
        return () => clearInterval(id)
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

    const estadoLabel = (estado: string): string => {
        if (estado === 'realizado') return t('admin.control.estadoRealizado')
        if (estado === 'cancelado') return t('admin.control.estadoCancelado')
        return t('admin.control.estadoPlaneado')
    }

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const labels: ExcelLabels = {
                titulo: t('admin.control.excelTitulo'),
                resumen: t('admin.control.excelResumen'),
                cultosSheet: t('admin.control.excelCultos'),
                participacionesSheet: t('admin.control.excelParticipaciones'),
                laboresSheet: t('admin.control.excelLabores'),
                sedesSheet: t('admin.control.excelSedes'),
                sedeTodas: t('admin.control.todasSedes'),
                mes: mesNombre,
                generado: t('admin.control.excelGenerado'),
                kpiCultos: t('admin.control.kpiCultos'),
                kpiRealizados: t('admin.control.estadoRealizado'),
                kpiPlaneados: t('admin.control.estadoPlaneado'),
                kpiParticipaciones: t('admin.control.kpiParticipaciones'),
                kpiHermanos: t('admin.control.kpiHermanos'),
                kpiLecturas: t('admin.control.kpiLecturas'),
                kpiUsuarios: t('admin.control.kpiUsuarios'),
                kpiMiembrosLabor: t('admin.control.kpiMiembrosLabor'),
                kpiPersonasPlano: t('admin.control.kpiPersonasPlano'),
                kpiServiciosLabores: t('admin.control.kpiServiciosLabores'),
                colFecha: t('common.date'),
                colHora: t('admin.control.colHora'),
                colSede: t('admin.control.colSede'),
                colTipo: t('admin.control.colTipo'),
                colEstado: t('admin.control.colEstado'),
                colIntro: t('admin.stats.intro'),
                colEnsenanza: t('admin.stats.teaching'),
                colTestimonios: t('admin.stats.testimonies'),
                colFinalizacion: t('admin.stats.final'),
                colLecturas: t('admin.control.kpiLecturas'),
                colAsistencia: t('admin.control.colAsistencia'),
                colHermano: t('admin.control.colHermano'),
                colTotal: t('common.total'),
                colTurno: t('admin.control.colTurno'),
                colSecuencia: t('admin.control.colSecuencia'),
                colCultos: t('admin.control.kpiCultos'),
                colUsuarios: t('admin.control.kpiUsuarios'),
                colActiva: t('admin.control.colActiva'),
                si: t('common.yes'),
                no: t('common.no'),
                estados: {
                    planeado: t('admin.control.estadoPlaneado'),
                    realizado: t('admin.control.estadoRealizado'),
                    cancelado: t('admin.control.estadoCancelado'),
                },
                turnos: {
                    jueves: t('day.thursday'),
                    domingo: t('day.sunday'),
                    domingo_tarde: t('admin.control.turnoDomingoTarde'),
                },
                roles: {
                    realiza: t('ofrenda.roles.realiza'),
                    apoyo: t('ofrenda.roles.apoyo'),
                    vigilancia: t('ofrenda.roles.vigilancia'),
                    primera_vez: t('ofrenda.roles.colaborador1vez'),
                    segunda_tercera_vez: t('ofrenda.roles.colaborador23vez'),
                    imposicion_manos: t('ofrenda.roles.imposicionManos'),
                    colaborador_1: `${t('ofrenda.roles.colaborador')} 1`,
                    colaborador_2: `${t('ofrenda.roles.colaborador')} 2`,
                    colaborador_3: `${t('ofrenda.roles.colaborador')} 3`,
                    testimonio_1: `${t('admin.stats.testimonies')} 1`,
                    testimonio_2: `${t('admin.stats.testimonies')} 2`,
                },
            }
            const res = await exportControlExcel(sedeId, year, month, mesNombre, labels)
            if (res.success && res.data) {
                const bytes = Uint8Array.from(atob(res.data.base64), c => c.charCodeAt(0))
                const blob = new Blob([bytes], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = res.data.filename
                a.click()
                URL.revokeObjectURL(url)
                toast.success(t('admin.control.excelListo'))
            } else {
                toast.error(res.error ?? t('common.error'))
            }
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportPdf = () => {
        setIsExportingPdf(true)
        try {
            const sedeLabel = sedeId
                ? sedes.find(s => s.id === sedeId)?.nombre ?? ''
                : t('admin.control.todasSedes')
            const pdfLabels: PdfLabels = {
                titulo: t('admin.control.excelTitulo'),
                subtituloSede: t('admin.control.colSede'),
                mes: mesNombre,
                generado: t('admin.control.excelGenerado'),
                kpis: t('admin.control.title'),
                resumenSedes: t('admin.control.excelSedes'),
                participaciones: t('admin.control.tablaHermanos'),
                salud: t('admin.control.health.titulo'),
                saludOk: t('admin.control.health.todoOk'),
                colSede: t('admin.control.colSede'),
                colActiva: t('admin.control.colActiva'),
                colCultos: t('admin.control.kpiCultos'),
                colParticipaciones: t('admin.control.kpiParticipaciones'),
                colLecturas: t('admin.control.kpiLecturas'),
                colUsuarios: t('admin.control.kpiUsuarios'),
                colHermano: t('admin.control.colHermano'),
                colIntro: t('admin.stats.introShort'),
                colEnsenanza: t('admin.stats.teachingShort'),
                colTestimonios: t('admin.stats.testimoniesShort'),
                colFinal: t('admin.stats.finalShort'),
                colTotal: t('common.total'),
                si: t('common.yes'),
                no: t('common.no'),
                kpiCultos: t('admin.control.kpiCultos'),
                kpiParticipaciones: t('admin.control.kpiParticipaciones'),
                kpiHermanos: t('admin.control.kpiHermanos'),
                kpiLecturas: t('admin.control.kpiLecturas'),
                kpiLabores: t('admin.control.kpiServiciosLabores'),
                pagina: t('admin.control.pagina'),
            }
            const alertRows = alerts.map(a => ({
                title: t(a.titleKey as Parameters<typeof t>[0]),
                count: a.count,
            }))
            const doc = buildControlPdf(data, alertRows, {
                sedeLabel,
                mesNombre,
                anio: year,
                labels: pdfLabels,
            })
            const slug = sedeId ? (sedes.find(s => s.id === sedeId)?.slug ?? 'sede') : 'todas'
            doc.save(`idmji-control-${slug}-${year}-${String(month).padStart(2, '0')}.pdf`)
            toast.success(t('admin.control.pdfListo'))
        } catch (e) {
            console.error('handleExportPdf:', e)
            toast.error(t('common.error'))
        } finally {
            setIsExportingPdf(false)
        }
    }

    const saveAsistencia = async () => {
        if (!asistenciaEdit) return
        const trimmed = asistenciaEdit.value.trim()
        const parsed = trimmed === '' ? null : Number.parseInt(trimmed, 10)
        if (parsed != null && (!Number.isInteger(parsed) || parsed < 0)) {
            toast.error(t('common.error'))
            return
        }
        const res = await updateAsistenciaCulto(asistenciaEdit.id, parsed)
        if (res.success) {
            setData(prev => ({
                ...prev,
                cultos: prev.cultos.map(c => (c.id === asistenciaEdit.id ? { ...c, asistencia: parsed } : c)),
            }))
            toast.success(t('admin.control.asistenciaGuardada'))
        } else {
            toast.error(res.error ?? t('common.error'))
        }
        setAsistenciaEdit(null)
    }

    const kpiCards = [
        { key: 'cultos', icon: CalendarCheck, label: t('admin.control.kpiCultos'), value: data.kpis.cultos, extra: `${data.kpis.cultosRealizados} ${t('admin.control.estadoRealizado').toLowerCase()} · ${data.kpis.cultosPlaneados} ${t('admin.control.estadoPlaneado').toLowerCase()}` },
        { key: 'participaciones', icon: Mic2, label: t('admin.control.kpiParticipaciones'), value: data.kpis.participaciones, extra: `${data.kpis.hermanosActivos} ${t('admin.control.kpiHermanos').toLowerCase()}` },
        { key: 'lecturas', icon: BookOpen, label: t('admin.control.kpiLecturas'), value: data.kpis.lecturas, extra: null },
        { key: 'labores', icon: HandHeart, label: t('admin.control.kpiServiciosLabores'), value: data.kpis.serviciosLabores, extra: `${data.kpis.miembrosLabor} ${t('admin.control.kpiMiembrosLabor').toLowerCase()}` },
        { key: 'usuarios', icon: Users, label: t('admin.control.kpiUsuarios'), value: data.kpis.usuarios, extra: `${data.kpis.personasPlano} ${t('admin.control.kpiPersonasPlano').toLowerCase()}` },
    ]

    const topHermanos = data.hermanos.filter(h => h.total > 0).slice(0, 10).map(h => ({
        nombre: h.nombre.split(' ')[0],
        total: h.total,
    }))

    const tiposChart: Array<{ [key: string]: string | number }> = data.tipos.map(tipo => ({ ...tipo }))

    const tendenciasChart = useMemo(() => {
        if (!tendencias) return []
        return tendencias.meses.map(m => {
            const row: Record<string, string | number> = { mes: m.mes }
            for (const sede of tendencias.sedes) {
                row[sede] = m.porSede[sede]?.[metricaTendencia] ?? 0
            }
            return row
        })
    }, [tendencias, metricaTendencia])

    return (
        <div className="ofrenda-liquid-scope space-y-6 animate-in fade-in duration-500" data-page="admin-control">
            <PageHero
                title={t('admin.control.title')}
                subtitle={t('admin.control.desc')}
                icon={LayoutDashboard}
                animate={false}
                data-testid="control-hero"
                actions={
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <Button
                            onClick={handleExportPdf}
                            disabled={isExportingPdf}
                            data-testid="control-export-pdf"
                            className="gap-2 rounded-xl font-bold border-2 border-[#b8964a] bg-white text-[#1f2e85] hover:bg-[#f8f3e8] shadow-lg"
                        >
                            <FileText className="w-5 h-5" />
                            <span suppressHydrationWarning>{isExportingPdf ? t('common.loading') : t('admin.control.exportarPdf')}</span>
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={isExporting}
                            data-testid="control-export-excel"
                            className="gap-2 rounded-xl font-bold border-2 border-[#b8964a] bg-white text-[#1f2e85] hover:bg-[#f8f3e8] shadow-lg"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            <span suppressHydrationWarning>{isExporting ? t('common.loading') : t('admin.control.exportarExcel')}</span>
                        </Button>
                    </div>
                }
            />

            {/* Filtros: sede + mes */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2" data-testid="control-sede-selector">
                    <button
                        type="button"
                        onClick={() => setSedeId(null)}
                        data-testid="control-sede-todas"
                        className={sedeId === null
                            ? 'px-4 py-2 rounded-xl font-bold bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border-2 border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)] transition-all'
                            : 'px-4 py-2 rounded-xl font-semibold bg-white text-slate-600 border-[1.5px] border-[rgba(184,150,74,0.32)] hover:border-[#b8964a] hover:text-[#1f2e85] transition-all'}
                    >
                        <span suppressHydrationWarning>{t('admin.control.todasSedes')}</span>
                    </button>
                    {sedes.map(sede => (
                        <button
                            key={sede.id}
                            type="button"
                            onClick={() => setSedeId(sede.id)}
                            data-testid={`control-sede-${sede.slug}`}
                            className={sede.id === sedeId
                                ? 'px-4 py-2 rounded-xl font-bold bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border-2 border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)] transition-all'
                                : `px-4 py-2 rounded-xl font-semibold bg-white text-slate-600 border-[1.5px] border-[rgba(184,150,74,0.32)] hover:border-[#b8964a] hover:text-[#1f2e85] transition-all ${!sede.activo ? 'opacity-50' : ''}`}
                        >
                            {sede.nombre}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => cambiarMes(-1)}
                        aria-label={t('common.previous')}
                        data-testid="control-mes-anterior"
                        className="w-9 h-9 rounded-xl bg-white border-[1.5px] border-[rgba(184,150,74,0.32)] flex items-center justify-center text-[#1f2e85] hover:border-[#b8964a] transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-black text-[#1f2e85] min-w-32 text-center" data-testid="control-mes-label" suppressHydrationWarning>
                        {mesNombre} {year}
                    </span>
                    <button
                        type="button"
                        onClick={() => cambiarMes(1)}
                        aria-label={t('common.next')}
                        data-testid="control-mes-siguiente"
                        className="w-9 h-9 rounded-xl bg-white border-[1.5px] border-[rgba(184,150,74,0.32)] flex items-center justify-center text-[#1f2e85] hover:border-[#b8964a] transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => void loadData()}
                        aria-label={t('admin.control.actualizar')}
                        data-testid="control-refresh"
                        className="w-9 h-9 rounded-xl bg-white border-[1.5px] border-[rgba(184,150,74,0.32)] flex items-center justify-center text-[#1f2e85] hover:border-[#b8964a] transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <p className="text-xs text-slate-400 -mt-2" data-testid="control-actualizado" suppressHydrationWarning>
                {t('admin.control.actualizadoA').replace('{time}', new Date(data.generadoEn).toLocaleTimeString(language))}
            </p>

            {/* KPIs */}
            <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-5 ${isLoading ? 'opacity-60' : ''}`}>
                {kpiCards.map((kpi, index) => {
                    const Icon = kpi.icon
                    return (
                        <motion.div
                            key={kpi.key}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            data-testid={`control-kpi-${kpi.key}`}
                            className="ofrenda-liquid-card rounded-3xl p-5"
                        >
                            <div className="flex items-center justify-between">
                                <div className="w-10 h-10 rounded-2xl bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] flex items-center justify-center">
                                    <Icon className="w-5 h-5 text-[#1f2e85]" />
                                </div>
                            </div>
                            <p className="mt-3 text-3xl font-black text-[#1f2e85] leading-none">{kpi.value}</p>
                            <p className="mt-1 text-xs uppercase font-bold text-slate-500 tracking-wide" suppressHydrationWarning>{kpi.label}</p>
                            {kpi.extra && <p className="mt-1 text-[11px] text-slate-400 truncate" suppressHydrationWarning>{kpi.extra}</p>}
                        </motion.div>
                    )
                })}
            </div>

            {/* Salud de datos / alertas accionables */}
            <div data-testid="control-salud">
                {alerts.length === 0 ? (
                    <div className="ofrenda-liquid-card rounded-3xl p-4 flex items-center gap-3" data-testid="control-salud-ok">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <p className="text-sm font-bold text-slate-700" suppressHydrationWarning>{t('admin.control.health.todoOk')}</p>
                    </div>
                ) : (
                    <div className="ofrenda-liquid-card rounded-3xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <h3 className="font-black text-slate-900" suppressHydrationWarning>{t('admin.control.health.titulo')}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
                                {alerts.reduce((n, a) => n + a.count, 0)}
                            </span>
                        </div>
                        <div className="grid gap-2">
                            {alerts.map(alert => {
                                const isOpen = expandedAlert === alert.key
                                const AlertIcon = alert.severity === 'warning' ? AlertTriangle : Info
                                return (
                                    <div
                                        key={alert.key}
                                        data-testid={`control-alerta-${alert.key}`}
                                        className={`rounded-2xl border p-3 ${
                                            alert.severity === 'warning'
                                                ? 'border-amber-200 bg-amber-50/60'
                                                : 'border-blue-200 bg-blue-50/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <AlertIcon className={`w-4 h-4 shrink-0 ${alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'}`} />
                                            <button
                                                type="button"
                                                onClick={() => setExpandedAlert(isOpen ? null : alert.key)}
                                                className="flex-1 min-w-0 text-left flex items-center gap-2"
                                            >
                                                <span className="font-bold text-sm text-slate-800" suppressHydrationWarning>
                                                    {t(alert.titleKey as Parameters<typeof t>[0])}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${alert.severity === 'warning' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'}`}>
                                                    {alert.count}
                                                </span>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            <Link
                                                href={alert.href}
                                                data-testid={`control-alerta-${alert.key}-ir`}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-[#1f2e85] hover:text-[#b8964a] transition-colors shrink-0"
                                            >
                                                <span suppressHydrationWarning>{t('admin.control.health.resolver')}</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                        {isOpen && (
                                            <ul className="mt-2 pl-7 space-y-0.5 text-xs text-slate-600" data-testid={`control-alerta-${alert.key}-detalle`}>
                                                {alert.detalles.map(d => (
                                                    <li key={d} className="truncate">• {d}</li>
                                                ))}
                                                {alert.count > alert.detalles.length && (
                                                    <li className="text-slate-400 italic" suppressHydrationWarning>
                                                        {t('admin.control.health.masItems').replace('{n}', String(alert.count - alert.detalles.length))}
                                                    </li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Resumen por sede (vista global) */}
            {sedeId === null && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="control-resumen-sedes">
                    {data.sedesResumen.map(s => (
                        <button
                            key={s.sedeId}
                            type="button"
                            onClick={() => setSedeId(s.sedeId)}
                            data-testid={`control-resumen-${s.slug}`}
                            className="ofrenda-liquid-card rounded-3xl p-5 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-[#1f2e85]/15 hover:-translate-y-1"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Building2 className="w-4 h-4 text-[#b68f2f] shrink-0" />
                                    <span className="font-black text-slate-900 truncate">{s.nombre}</span>
                                </div>
                                <span className={`flex items-center gap-1 text-[10px] font-black uppercase ${s.activo ? 'text-emerald-600' : 'text-zinc-400'}`}>
                                    <CircleDot className="w-3 h-3" />
                                    <span suppressHydrationWarning>{s.activo ? t('admin.control.sedeActiva') : t('admin.sedes.inactiva')}</span>
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                                {[
                                    [s.cultos, t('admin.control.kpiCultos')],
                                    [s.participaciones, t('admin.control.colParticipacionesShort')],
                                    [s.lecturas, t('admin.control.kpiLecturas')],
                                    [s.usuarios, t('admin.control.kpiUsuarios')],
                                ].map(([value, label]) => (
                                    <div key={String(label)} className="rounded-xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-2">
                                        <p className="font-black text-[#1f2e85] leading-none">{value}</p>
                                        <p className="text-[9px] uppercase font-bold text-slate-500 mt-1 truncate" suppressHydrationWarning>{label}</p>
                                    </div>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Gráficas */}
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="control-chart-hermanos">
                    <h3 className="font-black text-slate-900 mb-4" suppressHydrationWarning>{t('admin.control.chartHermanos')}</h3>
                    {topHermanos.length === 0 ? (
                        <p className="text-sm text-slate-400 italic" suppressHydrationWarning>{t('admin.control.sinDatos')}</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <ReBarChart data={topHermanos} margin={{ top: 4, right: 8, left: -24, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={56} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="total" fill="#1f2e85" radius={[6, 6, 0, 0]} />
                            </ReBarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="control-chart-tipos">
                    <h3 className="font-black text-slate-900 mb-4" suppressHydrationWarning>{t('admin.control.chartTipos')}</h3>
                    {data.tipos.length === 0 ? (
                        <p className="text-sm text-slate-400 italic" suppressHydrationWarning>{t('admin.control.sinDatos')}</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={tiposChart}
                                    dataKey="count"
                                    nameKey="nombre"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    label={({ name, value }) => `${name} (${value})`}
                                >
                                    {data.tipos.map(tipo => (
                                        <Cell key={tipo.nombre} fill={tipo.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Tendencias mes a mes */}
            <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="control-tendencias">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="font-black text-slate-900" suppressHydrationWarning>{t('admin.control.tendenciasTitulo')}</h3>
                    <div className="inline-flex gap-1 p-1 rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8]">
                        {(['participaciones', 'cultos'] as const).map(metrica => (
                            <button
                                key={metrica}
                                type="button"
                                onClick={() => setMetricaTendencia(metrica)}
                                data-testid={`control-tendencias-${metrica}`}
                                className={metricaTendencia === metrica
                                    ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] transition-all'
                                    : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-[#1f2e85] transition-all'}
                            >
                                <span suppressHydrationWarning>
                                    {metrica === 'participaciones' ? t('admin.control.kpiParticipaciones') : t('admin.control.kpiCultos')}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                {!tendencias || tendenciasChart.length === 0 ? (
                    <p className="text-sm text-slate-400 italic" suppressHydrationWarning>{t('admin.control.sinDatos')}</p>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={tendenciasChart} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            {tendencias.sedes.map((sede, i) => (
                                <Line
                                    key={sede}
                                    type="monotone"
                                    dataKey={sede}
                                    stroke={TREND_COLORS[i % TREND_COLORS.length]}
                                    strokeWidth={2.5}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                )}
                <p className="mt-2 text-xs text-slate-400" suppressHydrationWarning>{t('admin.control.tendenciasNota')}</p>
            </div>

            {/* Participaciones por hermano */}
            <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="control-tabla-hermanos">
                <h3 className="font-black text-slate-900 mb-4" suppressHydrationWarning>{t('admin.control.tablaHermanos')}</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead>
                            <tr className="text-left text-[11px] uppercase font-black text-slate-500 border-b border-[rgba(184,150,74,0.25)]">
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.control.colHermano')}</th>
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.control.colSede')}</th>
                                <th className="py-2 pr-3 text-center" suppressHydrationWarning>{t('admin.stats.introShort')}</th>
                                <th className="py-2 pr-3 text-center" suppressHydrationWarning>{t('admin.stats.teachingShort')}</th>
                                <th className="py-2 pr-3 text-center" suppressHydrationWarning>{t('admin.stats.testimoniesShort')}</th>
                                <th className="py-2 pr-3 text-center" suppressHydrationWarning>{t('admin.stats.finalShort')}</th>
                                <th className="py-2 text-center" suppressHydrationWarning>{t('common.total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.hermanos.map(h => (
                                <tr key={h.userId} className="border-b border-slate-100 last:border-0 hover:bg-[#f8f3e8]/50 transition-colors">
                                    <td className="py-2 pr-3 font-semibold text-slate-800">
                                        <Link
                                            href={`/dashboard/admin/hermanos/${h.userId}`}
                                            data-testid={`control-hermano-${h.userId}`}
                                            className="text-[#1f2e85] hover:text-[#b8964a] hover:underline transition-colors"
                                        >
                                            {h.nombre}
                                        </Link>
                                    </td>
                                    <td className="py-2 pr-3 text-slate-500">{h.sede}</td>
                                    <td className="py-2 pr-3 text-center text-slate-600">{h.intro}</td>
                                    <td className="py-2 pr-3 text-center text-slate-600">{h.ensenanza}</td>
                                    <td className="py-2 pr-3 text-center text-slate-600">{h.testimonios}</td>
                                    <td className="py-2 pr-3 text-center text-slate-600">{h.finalizacion}</td>
                                    <td className="py-2 text-center font-black text-[#1f2e85]">{h.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detalle de cultos */}
            <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="control-tabla-cultos">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h3 className="font-black text-slate-900" suppressHydrationWarning>{t('admin.control.tablaCultos')}</h3>
                    {data.kpis.asistenciaTotal > 0 && (
                        <span
                            data-testid="control-asistencia-resumen"
                            className="px-3 py-1 rounded-full text-xs font-bold bg-[#f8f3e8] border border-[rgba(184,150,74,0.35)] text-[#1f2e85]"
                            suppressHydrationWarning
                        >
                            {t('admin.control.asistenciaResumen')
                                .replace('{total}', String(data.kpis.asistenciaTotal))
                                .replace('{media}', String(data.kpis.asistenciaMedia))}
                        </span>
                    )}
                </div>
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-sm min-w-[880px]">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-left text-[11px] uppercase font-black text-slate-500 border-b border-[rgba(184,150,74,0.25)]">
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('common.date')}</th>
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.control.colHora')}</th>
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.control.colSede')}</th>
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.control.colTipo')}</th>
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.control.colEstado')}</th>
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.stats.intro')}</th>
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.stats.teaching')}</th>
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.stats.testimonies')}</th>
                                <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.stats.final')}</th>
                                <th className="py-2 pr-3 text-center" suppressHydrationWarning>{t('admin.control.colAsistencia')}</th>
                                <th className="py-2" suppressHydrationWarning>{t('admin.control.kpiLecturas')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.cultos.map(c => (
                                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-[#f8f3e8]/50 transition-colors align-top">
                                    <td className="py-2 pr-3 font-semibold text-slate-800 whitespace-nowrap">{c.fecha}</td>
                                    <td className="py-2 pr-3 font-black text-[#1f2e85]">{c.hora}</td>
                                    <td className="py-2 pr-3 text-slate-500">{c.sede}</td>
                                    <td className="py-2 pr-3">
                                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.tipoColor }} />
                                            {c.tipoNombre}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            c.estado === 'realizado'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : c.estado === 'cancelado'
                                                    ? 'bg-red-100 text-red-600'
                                                    : 'bg-blue-100 text-blue-700'
                                        }`} suppressHydrationWarning>
                                            {estadoLabel(c.estado)}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-3 text-slate-600">{c.intro ?? '—'}</td>
                                    <td className="py-2 pr-3 text-slate-600">{c.ensenanza ?? '—'}</td>
                                    <td className="py-2 pr-3 text-slate-600">{c.testimonios ?? '—'}</td>
                                    <td className="py-2 pr-3 text-slate-600">{c.finalizacion ?? '—'}</td>
                                    <td className="py-2 pr-3 text-center">
                                        {asistenciaEdit?.id === c.id ? (
                                            <input
                                                type="number"
                                                min={0}
                                                autoFocus
                                                value={asistenciaEdit.value}
                                                onChange={(e) => setAsistenciaEdit({ id: c.id, value: e.target.value })}
                                                onBlur={() => void saveAsistencia()}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') void saveAsistencia()
                                                    if (e.key === 'Escape') setAsistenciaEdit(null)
                                                }}
                                                aria-label={t('admin.control.colAsistencia')}
                                                data-testid={`control-asistencia-input-${c.id}`}
                                                className="w-16 px-1 py-0.5 rounded-lg border-[1.5px] border-[#b8964a] bg-white text-center text-sm font-bold text-[#1f2e85] outline-none"
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setAsistenciaEdit({ id: c.id, value: c.asistencia != null ? String(c.asistencia) : '' })}
                                                title={t('admin.control.asistenciaEditar')}
                                                data-testid={`control-asistencia-${c.id}`}
                                                className={`px-2 py-0.5 rounded-lg text-sm font-black transition-colors hover:bg-[#f8f3e8] ${
                                                    c.asistencia != null ? 'text-[#1f2e85]' : 'text-slate-300'
                                                }`}
                                            >
                                                {c.asistencia ?? '—'}
                                            </button>
                                        )}
                                    </td>
                                    <td className="py-2 text-slate-500 text-xs">{c.lecturas.join(' · ') || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
