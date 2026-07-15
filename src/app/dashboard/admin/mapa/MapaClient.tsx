'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { MapPin, Building2, CircleDot, Clock, Users, CalendarCheck, ExternalLink, AlertCircle } from 'lucide-react'
import PageHero from '@/components/PageHero'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { SedeMapa } from './actions'

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false })

const DIA_KEY = {
    0: 'day.sunday',
    1: 'day.monday',
    2: 'day.tuesday',
    3: 'day.wednesday',
    4: 'day.thursday',
    5: 'day.friday',
    6: 'day.saturday',
} as const

const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0] as const

export default function MapaClient({ initialSedes }: Readonly<{ initialSedes: SedeMapa[] }>) {
    const { t } = useI18n()
    const [selectedId, setSelectedId] = useState<string | null>(
        initialSedes.find(s => s.es_principal)?.id ?? initialSedes[0]?.id ?? null,
    )

    const selected = useMemo(
        () => initialSedes.find(s => s.id === selectedId) ?? null,
        [initialSedes, selectedId],
    )
    const sinCoords = initialSedes.filter(s => s.lat == null || s.lng == null)

    const horariosPorDia = useMemo(() => {
        const map = new Map<number, SedeMapa['horarios']>()
        if (!selected) return map
        for (const h of selected.horarios) {
            const list = map.get(h.day_of_week) ?? []
            list.push(h)
            map.set(h.day_of_week, list)
        }
        return map
    }, [selected])

    return (
        <div className="ofrenda-liquid-scope space-y-6 animate-in fade-in duration-500" data-page="admin-mapa">
            <PageHero
                title={t('admin.mapa.title')}
                subtitle={t('admin.mapa.desc')}
                icon={MapPin}
                animate={false}
                data-testid="mapa-hero"
            />

            {/* Chips de sedes */}
            <div className="flex flex-wrap items-center gap-2" data-testid="mapa-sede-selector">
                {initialSedes.map(sede => (
                    <button
                        key={sede.id}
                        type="button"
                        onClick={() => setSelectedId(sede.id)}
                        data-testid={`mapa-sede-${sede.slug}`}
                        className={sede.id === selectedId
                            ? 'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border-2 border-[#b8964a] shadow-[0_3px_12px_rgba(31,46,133,0.3)] transition-all'
                            : 'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold bg-white text-slate-600 border-[1.5px] border-[rgba(184,150,74,0.32)] hover:border-[#b8964a] hover:text-[#1f2e85] transition-all'}
                    >
                        <span className={`w-2 h-2 rounded-full ${sede.activo ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        {sede.nombre}
                    </button>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                {/* Mapa */}
                <div className="ofrenda-liquid-card rounded-3xl p-2 min-h-[440px] overflow-hidden">
                    <LeafletMap sedes={initialSedes} selectedId={selectedId} onSelect={setSelectedId} />
                </div>

                {/* Ficha de la sede seleccionada */}
                <div className="ofrenda-liquid-card rounded-3xl p-6 space-y-4" data-testid="mapa-ficha">
                    {selected ? (
                        <>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 w-11 h-11 rounded-2xl bg-[#f8f3e8] border border-[rgba(184,150,74,0.4)] flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-[#1f2e85]" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-lg text-slate-900 truncate">{selected.nombre}</h3>
                                        <p className="text-xs text-slate-500 truncate">
                                            {[selected.direccion, selected.ciudad].filter(Boolean).join(' · ') || selected.slug}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    data-testid="mapa-ficha-estado"
                                    className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                                        selected.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'
                                    }`}
                                >
                                    <CircleDot className="w-3 h-3" />
                                    <span suppressHydrationWarning>
                                        {selected.activo ? t('admin.control.sedeActiva') : t('admin.sedes.inactiva')}
                                    </span>
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-3 flex items-center gap-2.5">
                                    <Users className="w-4 h-4 text-[#b68f2f] shrink-0" />
                                    <div>
                                        <p className="text-lg font-black text-[#1f2e85] leading-none">{selected.usuarios}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-500" suppressHydrationWarning>
                                            {t('admin.sedes.usuarios')}
                                        </p>
                                    </div>
                                </div>
                                <div className="rounded-2xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-3 flex items-center gap-2.5">
                                    <CalendarCheck className="w-4 h-4 text-[#b68f2f] shrink-0" />
                                    <div>
                                        <p className="text-lg font-black text-[#1f2e85] leading-none">{selected.cultosFuturos}</p>
                                        <p className="text-[10px] uppercase font-bold text-slate-500" suppressHydrationWarning>
                                            {t('admin.mapa.cultosFuturos')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[11px] uppercase font-black text-slate-500 tracking-wide flex items-center gap-1.5 mb-2">
                                    <Clock className="w-3.5 h-3.5 text-[#b68f2f]" />
                                    <span suppressHydrationWarning>{t('admin.mapa.horarioSemanal')}</span>
                                </h4>
                                <div className="space-y-1.5" data-testid="mapa-ficha-horario">
                                    {DIAS_ORDEN.map(day => {
                                        const items = horariosPorDia.get(day) ?? []
                                        return (
                                            <div key={day} className="flex items-start gap-2 text-sm">
                                                <span className="w-20 shrink-0 font-bold text-slate-600" suppressHydrationWarning>
                                                    {t(DIA_KEY[day as keyof typeof DIA_KEY])}
                                                </span>
                                                {items.length === 0 ? (
                                                    <span className="text-slate-300">—</span>
                                                ) : (
                                                    <span className="flex flex-wrap gap-1.5">
                                                        {items.map(h => (
                                                            <span
                                                                key={`${day}-${h.default_time}`}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#f8f3e8] border border-[rgba(184,150,74,0.3)] text-xs font-bold text-[#1f2e85]"
                                                                title={h.tipo_nombre}
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.tipo_color }} />
                                                                {h.default_time}
                                                            </span>
                                                        ))}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {selected.lat != null && selected.lng != null ? (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid="mapa-ficha-gmaps"
                                    className="inline-flex items-center gap-2 text-sm font-bold text-[#1f2e85] hover:text-[#b8964a] transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span suppressHydrationWarning>{t('admin.mapa.abrirGoogleMaps')}</span>
                                </a>
                            ) : (
                                <p className="flex items-center gap-2 text-xs text-amber-600">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span suppressHydrationWarning>{t('admin.mapa.sinCoordenadas')}</span>
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-slate-400 italic" suppressHydrationWarning>{t('admin.control.sinDatos')}</p>
                    )}
                </div>
            </div>

            {/* Sedes sin ubicación */}
            {sinCoords.length > 0 && (
                <div className="ofrenda-liquid-card rounded-3xl p-5 flex items-start gap-3" data-testid="mapa-sin-coords">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-600">
                        <span suppressHydrationWarning>
                            {t('admin.mapa.sinCoordsLista').replace('{names}', sinCoords.map(s => s.nombre).join(', '))}
                        </span>{' '}
                        <Link href="/dashboard/admin/sedes" className="font-bold text-[#1f2e85] hover:text-[#b8964a] transition-colors">
                            <span suppressHydrationWarning>{t('admin.mapa.irASedes')}</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
