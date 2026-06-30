'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { getDateFnsLocale } from '../ofrendaLocale'
import { useOfrendaToast } from '../ofrendaFeedback'
import type { PlanCompleto, OfrServicio } from '../actions'
import { PlanoServiceStrip } from './PlanoServiceStrip'
import { pickDefaultServicioId, todayIsoLocal } from './planoDefaultServicio'
import { getPlanoData } from './planoActions'
import { getPlanoVista } from './planoData'
import { exportPlanoPng } from './planoExportPng'
import { exportPlanoListaPng } from './planoExportListaPng'
import { listaLayoutReferenceRowCount } from './planoExportListaLayout'
import { invokePlanoAction } from './planoInvoke'
import { formatLaborOfrendaExportSubtitle } from './planoExportFormat'
import { resolverModo, sacosParaDia, type PlanoVista } from './planoTypes'

const ACCENT = {
    jueves: {
        on: 'bg-linear-to-br from-emerald-500 to-emerald-700 text-white border-transparent shadow-md shadow-emerald-600/35',
        off: 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500/60 hover:bg-emerald-500/10',
        dot: 'bg-emerald-500',
    },
    domingo: {
        on: 'bg-linear-to-br from-sky-500 to-sky-700 text-white border-transparent shadow-md shadow-sky-600/35',
        off: 'border-sky-500/30 text-sky-700 dark:text-sky-300 hover:border-sky-500/60 hover:bg-sky-500/10',
        dot: 'bg-sky-500',
    },
    domingo_tarde: {
        on: 'bg-linear-to-br from-violet-500 to-violet-700 text-white border-transparent shadow-md shadow-violet-600/35',
        off: 'border-violet-500/30 text-violet-700 dark:text-violet-300 hover:border-violet-500/60 hover:bg-violet-500/10',
        dot: 'bg-violet-500',
    },
} as const

type ExportFormat = 'plano' | 'lista'

interface Props {
    plan: PlanCompleto | null
    tituloMes: string
}

export function PlanoExportPanel({ plan, tituloMes }: Readonly<Props>) {
    const { t, language } = useI18n()
    const { quickSuccess, planError } = useOfrendaToast()
    const [formato, setFormato] = useState<ExportFormat>('plano')
    const [vista, setVista] = useState<PlanoVista>('3d')
    const [servicioId, setServicioId] = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)

    const servicios = plan?.servicios ?? []
    const servicio = servicios.find(s => s.id === servicioId) ?? servicios[0] ?? null

    useEffect(() => {
        if (!plan?.servicios.length) {
            setServicioId(null)
            return
        }
        setServicioId(prev => {
            if (prev && plan.servicios.some(s => s.id === prev)) return prev
            return pickDefaultServicioId(plan.servicios, todayIsoLocal())
        })
    }, [plan])

    const dateLocale = getDateFnsLocale(language)

    const diaLabel = useCallback(
        (s: OfrServicio) => {
            const d = new Date(`${s.fecha}T00:00:00`)
            const dia = s.dia_tipo === 'jueves' ? t('ofrenda.days.jueShort') : t('ofrenda.days.domShort')
            return `${dia} ${format(d, 'd MMM', { locale: dateLocale })}`
        },
        [t, dateLocale],
    )

    const headerSubtitle = useMemo(() => {
        if (!servicio) return tituloMes
        const d = new Date(`${servicio.fecha}T00:00:00`)
        return formatLaborOfrendaExportSubtitle(d, servicio.dia_tipo, {
            manana: t('ofrenda.days.manana'),
            tarde: t('ofrenda.days.tarde'),
        }, dateLocale)
    }, [servicio, tituloMes, t, dateLocale])

    const runExport = async () => {
        if (!plan || !servicio || exporting) return
        setExporting(true)
        try {
            const sacos = sacosParaDia(plan.plan, servicio.dia_tipo)
            const modo = resolverModo(sacos)
            if (!modo) throw new Error(t('ofrenda.plano.sinDisposicion').replace('{sacos}', '0'))
            const res = await invokePlanoAction(() => getPlanoData(servicio.id, vista, modo))
            const embedded = getPlanoVista(vista, modo)
            const data = res.data?.data ?? embedded
            const asignaciones = res.data?.asignaciones ?? []

            const header = {
                churchName: t('ofrenda.subtitle'),
                title: t('ofrenda.planoExport.headerTitle'),
                subtitle: headerSubtitle,
            }

            const turnoSlug =
                servicio.dia_tipo === 'jueves'
                    ? 'jueves'
                    : servicio.dia_tipo === 'domingo'
                      ? 'dom-manana'
                      : 'dom-tarde'

            if (formato === 'plano') {
                const filename = `labor-ofrenda-plano-${servicio.fecha}-${turnoSlug}-${vista}.png`
                await exportPlanoPng(
                    data,
                    {
                        ofrendario: t('ofrenda.plano.rol.ofrendario'),
                        apoyo: t('ofrenda.plano.rol.apoyo'),
                        nombrePlaceholder: t('ofrenda.plano.nombrePlaceholder'),
                    },
                    filename,
                    header,
                )
            } else {
                const byBloque = new Map<number, { ofrendario: string; apoyo: string }>()
                for (const a of asignaciones) {
                    const row = byBloque.get(a.bloque) ?? { ofrendario: '', apoyo: '' }
                    const nombre = a.nombre_snapshot?.trim() || t('ofrenda.plano.nombrePlaceholder')
                    if (a.rol === 'ofrendario') row.ofrendario = nombre
                    else row.apoyo = nombre
                    byBloque.set(a.bloque, row)
                }
                const rows = [...byBloque.entries()]
                    .sort(([a], [b]) => a - b)
                    .map(([bloque, r]) => ({ bloque, ...r }))

                const filename = `labor-ofrenda-lista-${servicio.fecha}-${turnoSlug}.png`
                await exportPlanoListaPng(
                    rows,
                    {
                        ...header,
                        colPuesto: t('ofrenda.planoExport.colPuesto'),
                        colResponsable: t('ofrenda.planoExport.colResponsable'),
                        colApoyo: t('ofrenda.planoExport.colApoyo'),
                        footer: t('ofrenda.planoExport.listaFooter'),
                    },
                    filename,
                    {
                        diaTipo:
                            servicio.dia_tipo === 'domingo_tarde'
                                ? 'domingo_tarde'
                                : servicio.dia_tipo === 'jueves'
                                  ? 'jueves'
                                  : 'domingo',
                        layoutReferenceRows: listaLayoutReferenceRowCount(sacos),
                    },
                )
            }
            quickSuccess(t('ofrenda.plano.toast.exported'))
        } catch (err) {
            planError(err instanceof Error ? err.message : t('ofrenda.plano.exportError'))
        } finally {
            setExporting(false)
        }
    }

    if (!plan) {
        return (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {t('ofrenda.planoGenerate.noPlan')}
            </div>
        )
    }

    return (
        <div className="space-y-4" data-testid="ofrenda-plano-export-panel">
            <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-600" />
                    {t('ofrenda.planoExport.title')}
                </h3>
            </div>

            <div className="inline-flex w-full sm:w-auto rounded-xl border border-border bg-muted/40 p-0.5" role="group">
                {(['plano', 'lista'] as const).map(f => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setFormato(f)}
                        className={`flex-1 sm:flex-none px-4 py-2 min-h-[44px] rounded-[10px] text-xs font-bold touch-manipulation ${
                            formato === f ? 'bg-amber-600 text-white shadow' : 'text-muted-foreground'
                        }`}
                    >
                        {t(f === 'plano' ? 'ofrenda.planoExport.format.plano' : 'ofrenda.planoExport.format.lista')}
                    </button>
                ))}
            </div>

            {formato === 'plano' && (
                <div className="inline-flex rounded-xl border border-border bg-muted/40 p-0.5" role="group">
                    {(['2d', '3d'] as const).map(v => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setVista(v)}
                            className={`px-4 py-2 min-h-[44px] rounded-[10px] text-xs font-bold touch-manipulation ${
                                vista === v ? 'bg-amber-600 text-white' : 'text-muted-foreground'
                            }`}
                        >
                            {t(v === '2d' ? 'ofrenda.plano.vista2d' : 'ofrenda.plano.vista3d')}
                        </button>
                    ))}
                </div>
            )}

            <PlanoServiceStrip
                servicios={servicios}
                activeId={servicio?.id ?? ''}
                accent={ACCENT}
                diaLabel={diaLabel}
                onSelect={setServicioId}
            />

            <button
                type="button"
                disabled={exporting || !servicio}
                onClick={() => void runExport()}
                className="flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-50 touch-manipulation"
                data-testid="ofrenda-plano-export-btn"
            >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {t('ofrenda.planoExport.exportBtn')}
            </button>
        </div>
    )
}
