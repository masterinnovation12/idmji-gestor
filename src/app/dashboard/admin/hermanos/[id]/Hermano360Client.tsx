'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import NextImage from 'next/image'
import { ArrowLeft, Mic2, BookOpen, HandHeart, Mail, Phone, Building2, CalendarCheck } from 'lucide-react'
import PageHero from '@/components/PageHero'
import { useI18n } from '@/lib/i18n/I18nProvider'
import type { Hermano360 } from './actions'

const ROL_KEY: Record<string, string> = {
    introduccion: 'admin.stats.intro',
    ensenanza: 'admin.stats.teaching',
    testimonios: 'admin.stats.testimonies',
    finalizacion: 'admin.stats.final',
}

export default function Hermano360Client({ hermano }: Readonly<{ hermano: Hermano360 }>) {
    const { t } = useI18n()

    const iniciales = useMemo(
        () => `${hermano.nombre[0] ?? ''}${hermano.apellidos[0] ?? ''}`.toUpperCase(),
        [hermano.nombre, hermano.apellidos],
    )

    const maxAnio = Math.max(1, ...hermano.porAnio.map(a => a.total))

    const estadoLabel = (estado: string): string => {
        if (estado === 'realizado') return t('admin.control.estadoRealizado')
        if (estado === 'cancelado') return t('admin.control.estadoCancelado')
        return t('admin.control.estadoPlaneado')
    }

    const grupoLabel = (g: number): string => {
        if (g === 1) return t('admin.personas.grupo1')
        if (g === 2) return t('admin.personas.grupo2')
        return t('admin.personas.grupo3')
    }

    const breakdownCards = [
        { key: 'intro', label: t('admin.stats.intro'), value: hermano.breakdown.intro },
        { key: 'ensenanza', label: t('admin.stats.teaching'), value: hermano.breakdown.ensenanza },
        { key: 'testimonios', label: t('admin.stats.testimonies'), value: hermano.breakdown.testimonios },
        { key: 'finalizacion', label: t('admin.stats.final'), value: hermano.breakdown.finalizacion },
    ]

    return (
        <div className="ofrenda-liquid-scope space-y-6 animate-in fade-in duration-500" data-page="admin-hermano-360">
            <PageHero
                title={`${hermano.nombre} ${hermano.apellidos}`.trim()}
                subtitle={t('admin.hermano.subtitle')}
                icon={Mic2}
                animate={false}
                data-testid="hermano-hero"
                actions={
                    <Link
                        href="/dashboard/admin/control"
                        data-testid="hermano-volver"
                        className="inline-flex items-center gap-2 rounded-xl font-bold border-2 border-[#b8964a] bg-white text-[#1f2e85] hover:bg-[#f8f3e8] shadow-lg px-4 py-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span suppressHydrationWarning>{t('admin.hermano.volver')}</span>
                    </Link>
                }
            />

            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
                {/* Ficha de contacto */}
                <div className="ofrenda-liquid-card rounded-3xl p-6 space-y-4" data-testid="hermano-ficha">
                    <div className="flex items-center gap-4">
                        {hermano.avatarUrl ? (
                            <NextImage
                                src={hermano.avatarUrl}
                                alt={`${hermano.nombre} ${hermano.apellidos}`}
                                width={64}
                                height={64}
                                className="w-16 h-16 rounded-2xl object-cover border border-[rgba(184,150,74,0.4)]"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-2xl bg-[#1f2e85]/10 flex items-center justify-center font-black text-xl text-[#1f2e85] shrink-0">
                                {iniciales}
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="font-black text-lg text-slate-900 truncate">{hermano.nombre} {hermano.apellidos}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#1f2e85]/10 text-[#1f2e85]">
                                    {hermano.rol}
                                </span>
                                {hermano.pulpito && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700">
                                        <span suppressHydrationWarning>{t('admin.personas.badgePulpito')}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm">
                        {hermano.sede && (
                            <p className="flex items-center gap-2 text-slate-600">
                                <Building2 className="w-4 h-4 text-[#b68f2f] shrink-0" />
                                {hermano.sede}
                            </p>
                        )}
                        {(hermano.emailContacto || hermano.email) && (
                            <p className="flex items-center gap-2 text-slate-600 truncate">
                                <Mail className="w-4 h-4 text-[#b68f2f] shrink-0" />
                                <span className="truncate">{hermano.emailContacto || hermano.email}</span>
                            </p>
                        )}
                        {hermano.telefono && (
                            <p className="flex items-center gap-2 text-slate-600">
                                <Phone className="w-4 h-4 text-[#b68f2f] shrink-0" />
                                {hermano.telefono}
                            </p>
                        )}
                        {hermano.laborGrupos.length > 0 && (
                            <div className="flex items-start gap-2 text-slate-600">
                                <HandHeart className="w-4 h-4 text-[#b68f2f] shrink-0 mt-0.5" />
                                <span className="flex flex-wrap gap-1">
                                    {hermano.laborGrupos.map(g => (
                                        <span key={g} className="px-2 py-0.5 rounded-lg bg-[#f8f3e8] border border-[rgba(184,150,74,0.3)] text-xs font-bold text-[#1f2e85]" suppressHydrationWarning>
                                            {grupoLabel(g)}
                                        </span>
                                    ))}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="rounded-2xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-3 text-center">
                            <p className="text-2xl font-black text-[#1f2e85] leading-none">{hermano.totalHistorico}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mt-1" suppressHydrationWarning>
                                {t('admin.hermano.totalHistorico')}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-3 text-center">
                            <p className="text-2xl font-black text-[#1f2e85] leading-none">{hermano.lecturas}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mt-1" suppressHydrationWarning>
                                {t('admin.control.kpiLecturas')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Desglose por rol + por año */}
                <div className="space-y-4">
                    <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="hermano-breakdown">
                        <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                            <Mic2 className="w-4 h-4 text-[#b68f2f]" />
                            <span suppressHydrationWarning>{t('admin.hermano.desglose')}</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {breakdownCards.map(card => (
                                <div key={card.key} className="rounded-2xl bg-[#f8f3e8]/70 border border-[rgba(184,150,74,0.25)] p-3 text-center">
                                    <p className="text-xl font-black text-[#1f2e85] leading-none">{card.value}</p>
                                    <p className="text-[10px] uppercase font-bold text-slate-500 mt-1" suppressHydrationWarning>{card.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="hermano-por-anio">
                        <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                            <CalendarCheck className="w-4 h-4 text-[#b68f2f]" />
                            <span suppressHydrationWarning>{t('admin.hermano.porAnio')}</span>
                        </h3>
                        {hermano.porAnio.length === 0 ? (
                            <p className="text-sm text-slate-400 italic" suppressHydrationWarning>{t('admin.control.sinDatos')}</p>
                        ) : (
                            <div className="space-y-2">
                                {hermano.porAnio.map(a => (
                                    <div key={a.anio} className="flex items-center gap-3">
                                        <span className="w-12 shrink-0 font-bold text-slate-600 text-sm">{a.anio}</span>
                                        <div className="flex-1 h-5 rounded-lg bg-[#f8f3e8] overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#1f2e85] to-[#283593] rounded-lg"
                                                style={{ width: `${(a.total / maxAnio) * 100}%` }}
                                            />
                                        </div>
                                        <span className="w-8 shrink-0 text-right font-black text-[#1f2e85] text-sm">{a.total}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cultos recientes */}
            <div className="ofrenda-liquid-card rounded-3xl p-5" data-testid="hermano-recientes">
                <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#b68f2f]" />
                    <span suppressHydrationWarning>{t('admin.hermano.recientes')}</span>
                </h3>
                {hermano.recientes.length === 0 ? (
                    <p className="text-sm text-slate-400 italic" suppressHydrationWarning>{t('admin.control.sinDatos')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[560px]">
                            <thead>
                                <tr className="text-left text-[11px] uppercase font-black text-slate-500 border-b border-[rgba(184,150,74,0.25)]">
                                    <th className="py-2 pr-3" suppressHydrationWarning>{t('common.date')}</th>
                                    <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.control.colHora')}</th>
                                    <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.control.colTipo')}</th>
                                    <th className="py-2 pr-3" suppressHydrationWarning>{t('admin.control.colEstado')}</th>
                                    <th className="py-2" suppressHydrationWarning>{t('admin.hermano.rolesEnCulto')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hermano.recientes.map(c => (
                                    <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-[#f8f3e8]/50 transition-colors">
                                        <td className="py-2 pr-3 font-semibold text-slate-800 whitespace-nowrap">{c.fecha}</td>
                                        <td className="py-2 pr-3 font-black text-[#1f2e85]">{c.hora}</td>
                                        <td className="py-2 pr-3">
                                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.tipoColor }} />
                                                {c.tipoNombre}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                c.estado === 'realizado' ? 'bg-emerald-100 text-emerald-700'
                                                    : c.estado === 'cancelado' ? 'bg-red-100 text-red-600'
                                                        : 'bg-blue-100 text-blue-700'
                                            }`} suppressHydrationWarning>
                                                {estadoLabel(c.estado)}
                                            </span>
                                        </td>
                                        <td className="py-2">
                                            <span className="flex flex-wrap gap-1">
                                                {c.roles.map(r => (
                                                    <span key={r} className="px-2 py-0.5 rounded-lg bg-[#1f2e85]/10 text-[10px] font-bold text-[#1f2e85]" suppressHydrationWarning>
                                                        {t((ROL_KEY[r] ?? r) as Parameters<typeof t>[0])}
                                                    </span>
                                                ))}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
