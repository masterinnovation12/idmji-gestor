/**
 * PlanoPersonasManager — gestión del directorio de personas del plano.
 * Filas compactas expandibles (mismo patrón que Labores generales).
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search, Plus, Pencil, Trash2, Loader2, Users, X, Star, Heart,
    UserX, UserCheck, Info, ChevronDown, ChevronUp, HandHelping, Layers,
    SlidersHorizontal, Download,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { interpolate } from '../ofrendaLocale'
import { useOfrendaToast } from '../ofrendaFeedback'
import { OfrendaLiquidShell } from '../OfrendaLiquidShell'
import { invokePlanoAction } from './planoInvoke'
import { normalizePlanoPersonaNombre } from './planoPersonaNormalize'
import {
    defaultPlanoPersonasFilter,
    filterPlanoPersonas,
    countActivePlanoFilters,
    hasActivePlanoFilters,
    toggleInArray,
    ALL_DIAS,
    ALL_GENEROS,
    ALL_CAPACIDADES,
    type PlanoPersonasFilter,
    type PlanoFilterDia,
    type PlanoFilterGenero,
    type PlanoFilterCapacidad,
} from './planoPersonasFilter'
import {
    buildPersonasExportRows,
    buildPersonasFilterSubtitle,
    countPersonasPorDia,
    formatPersonasDayCountsLine,
} from './planoPersonasExportFormat'
import { exportPlanoPersonasPng } from './planoPersonasExportPng'
import {
    listPlanoPersonas,
    createPlanoPersona,
    renamePlanoPersona,
    deletePlanoPersona,
    setPlanoPersonaCapacidad,
    setPlanoPersonaTurnos,
    setPlanoPersonaPrioridad,
    setPlanoPersonaActivo,
    setPlanoPareja,
    removePlanoPareja,
    type PlanoPersonaFull,
} from './planoActions'
import { MemberTurnAvailability, TurnAvailabilityDots } from '../MemberTurnAvailability'
import { clasificarSeccionTurno, type PlanoTurnoSection } from './planoPersonaTurnos'
import type { PlanoCapacidad } from './planoTypes'

const CAPS: PlanoCapacidad[] = ['ofrendario', 'apoyo', 'ambos']

const CAP_ICON: Record<PlanoCapacidad, typeof Star> = {
    ofrendario: Star,
    apoyo: HandHelping,
    ambos: Layers,
}

const CAP_BADGE: Record<PlanoCapacidad, string> = {
    ofrendario: 'bg-blue-600/15 text-blue-700 dark:text-blue-300',
    apoyo: 'border border-blue-600/40 text-blue-600 dark:text-blue-400',
    ambos: 'bg-blue-600 text-white',
}

const SECTION_ORDER: PlanoTurnoSection[] = ['jueves', 'domingo_manana', 'domingo_tarde', 'sin_turno']

const SECTION_LABEL: Record<PlanoTurnoSection, 'ofrenda.plano.personas.sectionJueves' | 'ofrenda.plano.personas.sectionDomManana' | 'ofrenda.plano.personas.sectionDomTarde' | 'ofrenda.plano.personas.sectionSinTurno'> = {
    jueves: 'ofrenda.plano.personas.sectionJueves',
    domingo_manana: 'ofrenda.plano.personas.sectionDomManana',
    domingo_tarde: 'ofrenda.plano.personas.sectionDomTarde',
    sin_turno: 'ofrenda.plano.personas.sectionSinTurno',
}

const SECTION_STYLE: Record<PlanoTurnoSection, { header: string; dot: string }> = {
    jueves: { header: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    domingo_manana: { header: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
    domingo_tarde: { header: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
    sin_turno: { header: 'text-muted-foreground', dot: 'bg-muted-foreground/50' },
}

const TURN_LEGEND: PlanoTurnoSection[] = ['jueves', 'domingo_manana', 'domingo_tarde']

export function PlanoPersonasManager({ canEdit }: Readonly<{ canEdit: boolean }>) {
    const { t } = useI18n()
    const { quickSuccess, planError } = useOfrendaToast()

    const [personas, setPersonas] = useState<PlanoPersonaFull[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [adding, setAdding] = useState('')
    const [busy, setBusy] = useState(false)
    const [editing, setEditing] = useState<PlanoPersonaFull | null>(null)
    const [deleting, setDeleting] = useState<PlanoPersonaFull | null>(null)
    const [pairing, setPairing] = useState<PlanoPersonaFull | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [filter, setFilter] = useState<PlanoPersonasFilter>(defaultPlanoPersonasFilter)
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [exporting, setExporting] = useState(false)

    const errLabel = useCallback(
        (e?: string) => {
            if (e === 'no_auth') return t('ofrenda.plano.err.noAuth')
            if (e === 'no_permission') return t('ofrenda.plano.err.noPermission')
            return e ?? ''
        },
        [t],
    )

    const load = useCallback(async () => {
        setLoading(true)
        const res = await invokePlanoAction(() => listPlanoPersonas())
        setLoading(false)
        if (res.error) {
            planError(t('ofrenda.plano.personas.loadError'), errLabel(res.error))
            return
        }
        setPersonas(res.data ?? [])
    }, [planError, t, errLabel])

    const loadRef = useRef(load)
    loadRef.current = load
    useEffect(() => {
        void loadRef.current()
    }, [])

    const filtered = useMemo(() => {
        const q = normalizePlanoPersonaNombre(query)
        if (!q) return personas
        return personas.filter(p => normalizePlanoPersonaNombre(p.nombre).includes(q))
    }, [personas, query])

    const visible = useMemo(() => filterPlanoPersonas(filtered, filter), [filtered, filter])

    const dayCounts = useMemo(() => countPersonasPorDia(visible), [visible])

    const activeFilterCount = countActivePlanoFilters(filter)
    const filtersActive = hasActivePlanoFilters(filter)

    const grouped = useMemo(() => {
        const map = new Map<PlanoTurnoSection, PlanoPersonaFull[]>()
        for (const sec of SECTION_ORDER) map.set(sec, [])
        for (const p of visible) {
            const sec = clasificarSeccionTurno(p)
            map.get(sec)?.push(p)
        }
        return SECTION_ORDER.map(sec => ({ sec, items: map.get(sec) ?? [] })).filter(g => g.items.length > 0)
    }, [visible])

    const toggleDia = (d: PlanoFilterDia) => setFilter(f => ({ ...f, dias: toggleInArray(f.dias, d) }))
    const toggleGenero = (g: PlanoFilterGenero) => setFilter(f => ({ ...f, generos: toggleInArray(f.generos, g) }))
    const toggleCapacidad = (c: PlanoFilterCapacidad) => setFilter(f => ({ ...f, capacidades: toggleInArray(f.capacidades, c) }))
    const clearFilters = () => setFilter(defaultPlanoPersonasFilter())

    const handleExport = async () => {
        if (exporting) return
        if (visible.length === 0) {
            planError(t('ofrenda.plano.personas.export.empty'))
            return
        }
        setExporting(true)
        try {
            const rows = buildPersonasExportRows(visible)
            const subtitle = buildPersonasFilterSubtitle(filter, {
                jueves: t('ofrenda.plano.personas.sectionJueves'),
                domManana: t('ofrenda.plano.personas.sectionDomManana'),
                domTarde: t('ofrenda.plano.personas.sectionDomTarde'),
                hombres: t('ofrenda.plano.personas.filters.men'),
                mujeres: t('ofrenda.plano.personas.filters.women'),
                ofrendario: t('ofrenda.plano.cap.ofrendario'),
                apoyo: t('ofrenda.plano.cap.apoyo'),
                ambos: t('ofrenda.plano.cap.ambos'),
                estrella: t('ofrenda.plano.personas.export.starTag'),
                pareja: t('ofrenda.plano.personas.export.pairTag'),
                todas: t('ofrenda.plano.personas.export.all'),
            })
            const dayCountsLine = formatPersonasDayCountsLine(dayCounts, {
                jueves: t('ofrenda.plano.personas.sectionJueves'),
                domManana: t('ofrenda.plano.personas.sectionDomManana'),
                domTarde: t('ofrenda.plano.personas.sectionDomTarde'),
            })
            await exportPlanoPersonasPng(
                rows,
                {
                    churchName: t('ofrenda.subtitle'),
                    title: t('ofrenda.plano.personas.export.headerTitle'),
                    subtitle,
                    dayCountsLine,
                    colName: t('ofrenda.plano.personas.export.colName'),
                    colDays: t('ofrenda.plano.personas.export.colDays'),
                    colVeces: t('ofrenda.plano.personas.export.colVeces'),
                    colCapacity: t('ofrenda.plano.personas.export.colCapacity'),
                    capOfrendario: t('ofrenda.plano.cap.ofrendario'),
                    capApoyo: t('ofrenda.plano.cap.apoyo'),
                    capAmbos: t('ofrenda.plano.cap.ambos'),
                    dayJ: t('ofrenda.plano.personas.export.dayJ'),
                    dayM: t('ofrenda.plano.personas.export.dayM'),
                    dayT: t('ofrenda.plano.personas.export.dayT'),
                    roleCountsTemplate: t('ofrenda.plano.personas.roleCounts'),
                    roleLegend: t('ofrenda.plano.personas.export.roleLegend'),
                },
                `personas-labor-ofrenda-${new Date().toISOString().slice(0, 10)}.png`,
            )
            quickSuccess(t('ofrenda.plano.toast.exported'))
        } catch (err) {
            planError(err instanceof Error ? err.message : t('ofrenda.plano.exportError'))
        } finally {
            setExporting(false)
        }
    }

    const turnLabels = {
        jueves: t('ofrenda.plano.personas.sectionJueves'),
        domManana: t('ofrenda.plano.personas.sectionDomManana'),
        domTarde: t('ofrenda.plano.personas.sectionDomTarde'),
    }

    const handleAdd = async () => {
        const nombre = adding.trim()
        if (!nombre || busy) return
        setBusy(true)
        const res = await invokePlanoAction(() => createPlanoPersona(nombre))
        setBusy(false)
        if (res.errorCode) {
            planError(
                res.errorCode === 'too_short'
                    ? t('ofrenda.plano.combobox.tooShort')
                    : res.errorCode === 'too_long'
                      ? t('ofrenda.plano.combobox.tooLong')
                      : res.errorCode === 'no_permission'
                        ? t('ofrenda.plano.err.noPermission')
                        : t('ofrenda.plano.combobox.createError'),
            )
            return
        }
        setAdding('')
        quickSuccess(res.alreadyExisted ? t('ofrenda.plano.combobox.reused') : t('ofrenda.plano.personas.added'))
        void load()
    }

    const changeCapacidad = async (p: PlanoPersonaFull, capacidad: PlanoCapacidad) => {
        if (p.capacidad === capacidad) return
        setPersonas(prev => prev.map(x => (x.id === p.id ? { ...x, capacidad } : x)))
        const res = await invokePlanoAction(() => setPlanoPersonaCapacidad(p.id, capacidad))
        if (res.error) {
            planError(errLabel(res.error))
            void load()
            return
        }
        quickSuccess(t('ofrenda.plano.capacidad.updated'))
    }

    const changeTurnos = async (p: PlanoPersonaFull, turnos: typeof p) => {
        setPersonas(prev =>
            prev.map(x =>
                x.id === p.id
                    ? {
                          ...x,
                          puede_jueves: turnos.puede_jueves,
                          puede_domingo_manana: turnos.puede_domingo_manana,
                          puede_domingo_tarde: turnos.puede_domingo_tarde,
                      }
                    : x,
            ),
        )
        const res = await invokePlanoAction(() =>
            setPlanoPersonaTurnos(p.id, {
                puede_jueves: turnos.puede_jueves,
                puede_domingo_manana: turnos.puede_domingo_manana,
                puede_domingo_tarde: turnos.puede_domingo_tarde,
            }),
        )
        if (res.error) {
            planError(errLabel(res.error))
            void load()
        }
    }

    const toggleStar = async (p: PlanoPersonaFull) => {
        const next = !p.prioridad_ofrendario
        setPersonas(prev => prev.map(x => (x.id === p.id ? { ...x, prioridad_ofrendario: next } : x)))
        const res = await invokePlanoAction(() => setPlanoPersonaPrioridad(p.id, next))
        if (res.error) {
            planError(errLabel(res.error))
            void load()
            return
        }
        quickSuccess(next ? t('ofrenda.plano.personas.starOn') : t('ofrenda.plano.personas.starOff'))
    }

    const toggleActivo = async (p: PlanoPersonaFull) => {
        const next = !p.activo
        const res = await invokePlanoAction(() => setPlanoPersonaActivo(p.id, next))
        if (res.error) {
            planError(errLabel(res.error))
            return
        }
        quickSuccess(next ? t('ofrenda.plano.personas.activated') : t('ofrenda.plano.personas.deactivated'))
        void load()
    }

    const confirmDelete = async () => {
        if (!deleting) return
        const target = deleting
        setDeleting(null)
        const res = await invokePlanoAction(() => deletePlanoPersona(target.id))
        if (res.error) {
            planError(errLabel(res.error))
            return
        }
        setPersonas(prev => prev.filter(x => x.id !== target.id))
        quickSuccess(t('ofrenda.plano.personas.deleted'))
    }

    return (
        <div className="space-y-4" data-testid="plano-personas-manager">
            <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {t('ofrenda.plano.personas.title')}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">{t('ofrenda.plano.personas.desc')}</p>
            </div>

            <div className="flex gap-3 p-3.5 rounded-2xl border border-[#1f2e85]/15 bg-[#1f2e85]/5">
                <Info className="w-4 h-4 text-[#1f2e85] dark:text-[#e8d9a8] mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    {t('ofrenda.plano.personas.hint')}
                </p>
            </div>

            <div
                className="flex flex-wrap gap-3"
                data-testid="plano-personas-turn-legend"
                aria-label={t('ofrenda.plano.personas.dayCounts.aria')}
            >
                {TURN_LEGEND.map(sec => {
                    const style = SECTION_STYLE[sec]
                    const count =
                        sec === 'jueves'
                            ? dayCounts.jueves
                            : sec === 'domingo_manana'
                              ? dayCounts.domingo_manana
                              : dayCounts.domingo_tarde
                    return (
                        <div
                            key={sec}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                        >
                            <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} aria-hidden />
                            <span className={style.header}>{t(SECTION_LABEL[sec])}</span>
                            <span
                                className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-md bg-muted/70 text-foreground font-black tabular-nums"
                                data-testid={`plano-personas-day-count-${sec}`}
                            >
                                {count}
                            </span>
                        </div>
                    )
                })}
            </div>

            {canEdit && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={adding}
                        onChange={e => setAdding(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
                        placeholder={t('ofrenda.plano.personas.addPlaceholder')}
                        autoCapitalize="words"
                        className="ofrenda-liquid-search flex-1 min-w-0 px-4 py-2.5 min-h-[44px] rounded-xl text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => void handleAdd()}
                        disabled={busy || adding.trim().length < 2}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white text-sm font-bold shadow-[0_3px_12px_rgba(31,46,133,0.3)] hover:shadow-[0_5px_18px_rgba(31,46,133,0.42)] transition-shadow disabled:opacity-50 touch-manipulation shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('common.add')}</span>
                    </button>
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={t('common.search')}
                    className="ofrenda-liquid-search w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl text-sm"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setFiltersOpen(o => !o)}
                    aria-expanded={filtersOpen}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border text-xs font-bold touch-manipulation transition-colors ${
                        filtersActive
                            ? 'border-[#b8964a] bg-[#1f2e85]/10 text-[#1f2e85]'
                            : 'border-[rgba(184,150,74,0.32)] text-slate-500 hover:bg-[#f8f3e8] hover:text-[#1f2e85]'
                    }`}
                    data-testid="plano-personas-filters-toggle"
                >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {t('ofrenda.plano.personas.filters.title')}
                    {activeFilterCount > 0 && (
                        <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-black">
                            {activeFilterCount}
                        </span>
                    )}
                    {filtersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                    type="button"
                    onClick={() => void handleExport()}
                    disabled={exporting || visible.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white text-xs font-bold shadow-[0_3px_12px_rgba(31,46,133,0.3)] hover:shadow-[0_5px_18px_rgba(31,46,133,0.42)] transition-shadow disabled:opacity-50 touch-manipulation"
                    data-testid="plano-personas-export-btn"
                >
                    {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {exporting ? t('ofrenda.plano.personas.export.exporting') : t('ofrenda.plano.personas.export.btn')}
                </button>

                <span
                    className="ml-auto text-xs font-semibold text-muted-foreground"
                    data-testid="plano-personas-count"
                >
                    {interpolate(t('ofrenda.plano.personas.filters.results'), {
                        shown: String(visible.length),
                        total: String(personas.length),
                    })}
                </span>
            </div>

            {filtersOpen && (
                <div
                    className="ofrenda-liquid-card p-3 space-y-3"
                    data-testid="plano-personas-filters"
                >
                    <FilterRow label={t('ofrenda.plano.personas.filters.day')}>
                        {ALL_DIAS.map(d => (
                            <FilterChip
                                key={d}
                                active={filter.dias.includes(d)}
                                onClick={() => toggleDia(d)}
                                testId={`plano-personas-filter-dia-${d}`}
                            >
                                {d === 'jueves'
                                    ? turnLabels.jueves
                                    : d === 'domingo_manana'
                                      ? turnLabels.domManana
                                      : turnLabels.domTarde}
                            </FilterChip>
                        ))}
                    </FilterRow>

                    <FilterRow label={t('ofrenda.plano.personas.filters.gender')}>
                        {ALL_GENEROS.map(g => (
                            <FilterChip
                                key={g}
                                active={filter.generos.includes(g)}
                                onClick={() => toggleGenero(g)}
                                testId={`plano-personas-filter-genero-${g}`}
                            >
                                {g === 'hombre'
                                    ? t('ofrenda.plano.personas.filters.men')
                                    : t('ofrenda.plano.personas.filters.women')}
                            </FilterChip>
                        ))}
                    </FilterRow>

                    <FilterRow label={t('ofrenda.plano.personas.filters.capacity')}>
                        {ALL_CAPACIDADES.map(c => (
                            <FilterChip
                                key={c}
                                active={filter.capacidades.includes(c)}
                                onClick={() => toggleCapacidad(c)}
                                testId={`plano-personas-filter-cap-${c}`}
                            >
                                {t(`ofrenda.plano.cap.${c}` as const)}
                            </FilterChip>
                        ))}
                    </FilterRow>

                    <div className="flex flex-wrap items-center gap-2">
                        <FilterChip
                            active={filter.soloEstrella}
                            onClick={() => setFilter(f => ({ ...f, soloEstrella: !f.soloEstrella }))}
                            testId="plano-personas-filter-estrella"
                        >
                            <Star className={`w-3.5 h-3.5 ${filter.soloEstrella ? 'fill-current' : ''}`} />
                            {t('ofrenda.plano.personas.filters.onlyStar')}
                        </FilterChip>
                        <FilterChip
                            active={filter.soloPareja}
                            onClick={() => setFilter(f => ({ ...f, soloPareja: !f.soloPareja }))}
                            testId="plano-personas-filter-pareja"
                        >
                            <Heart className={`w-3.5 h-3.5 ${filter.soloPareja ? 'fill-current' : ''}`} />
                            {t('ofrenda.plano.personas.filters.onlyPair')}
                        </FilterChip>

                        {filtersActive && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="ml-auto inline-flex items-center gap-1 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-manipulation"
                                data-testid="plano-personas-filters-clear"
                            >
                                <X className="w-3.5 h-3.5" />
                                {t('ofrenda.plano.personas.filters.clear')}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-600" aria-label={t('common.loading')} />
                </div>
            ) : personas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{t('ofrenda.plano.personas.empty')}</p>
            ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{t('ofrenda.plano.personas.noResults')}</p>
            ) : visible.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center" data-testid="plano-personas-empty-filters">
                    {t('ofrenda.plano.personas.filters.emptyResults')}
                </p>
            ) : (
                <div className="space-y-6">
                    {grouped.map(({ sec, items }) => {
                        const secStyle = SECTION_STYLE[sec]
                        return (
                            <section key={sec} data-testid={`plano-personas-section-${sec}`}>
                                <h4 className={`text-xs font-black uppercase tracking-wide mb-2 flex items-center gap-1.5 ${secStyle.header}`}>
                                    <span className={`h-2 w-2 rounded-full shrink-0 ${secStyle.dot}`} aria-hidden />
                                    {t(SECTION_LABEL[sec])}
                                </h4>
                                <ul className="space-y-2" data-testid="plano-personas-list">
                                    {items.map(p => (
                                        <PersonaRow
                                            key={p.id}
                                            persona={p}
                                            canEdit={canEdit}
                                            t={t}
                                            turnLabels={turnLabels}
                                            expanded={expandedId === p.id}
                                            onToggleExpand={() =>
                                                setExpandedId(prev => (prev === p.id ? null : p.id))
                                            }
                                            onCapacidad={changeCapacidad}
                                            onTurnos={changeTurnos}
                                            onStar={() => void toggleStar(p)}
                                            onActivo={() => void toggleActivo(p)}
                                            onEdit={() => setEditing(p)}
                                            onDelete={() => setDeleting(p)}
                                            onPair={() => setPairing(p)}
                                            onUnpair={async () => {
                                                const res = await invokePlanoAction(() => removePlanoPareja(p.id))
                                                if (res.error) planError(errLabel(res.error))
                                                else void load()
                                            }}
                                        />
                                    ))}
                                </ul>
                            </section>
                        )
                    })}
                </div>
            )}

            {editing && (
                <RenameDialog
                    persona={editing}
                    onClose={() => setEditing(null)}
                    onSaved={updated => {
                        setPersonas(prev => prev.map(x => (x.id === updated.id ? { ...x, nombre: updated.nombre } : x)))
                        setEditing(null)
                    }}
                />
            )}

            {pairing && (
                <ParejaDialog
                    persona={pairing}
                    candidatos={personas.filter(
                        x =>
                            x.id !== pairing.id &&
                            x.activo &&
                            x.genero &&
                            pairing.genero &&
                            x.genero !== pairing.genero &&
                            !x.parejaId,
                    )}
                    onClose={() => setPairing(null)}
                    onSaved={() => {
                        setPairing(null)
                        void load()
                    }}
                />
            )}

            {deleting && (
                <OfrendaLiquidShell
                    open
                    onClose={() => setDeleting(null)}
                    ariaLabel={t('ofrenda.plano.personas.deleteTitle')}
                    title={t('ofrenda.plano.personas.deleteTitle')}
                    headline={t('ofrenda.plano.personas.deleteTitle')}
                    accent="navy"
                    testIdPrefix="plano-personas-delete"
                    unstyledBody
                >
                    <div className="px-4 pb-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {interpolate(t('ofrenda.plano.personas.deleteDesc'), { nombre: deleting.nombre })}
                            {deleting.asignaciones > 0 && (
                                <span className="block mt-2 font-semibold text-blue-700 dark:text-blue-300">
                                    {interpolate(t('ofrenda.plano.personas.deleteAssignedWarn'), {
                                        n: String(deleting.asignaciones),
                                    })}
                                </span>
                            )}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleting(null)}
                                className="flex-1 py-3 min-h-[48px] rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] text-[#1f2e85] font-semibold hover:bg-[#f8f3e8] touch-manipulation"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmDelete()}
                                className="flex-1 py-3 min-h-[48px] rounded-xl bg-red-600 text-white font-bold touch-manipulation"
                            >
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </OfrendaLiquidShell>
            )}
        </div>
    )
}

function FilterRow({
    label,
    children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wide text-muted-foreground w-full sm:w-20 shrink-0">
                {label}
            </span>
            <div className="flex flex-wrap gap-1.5">{children}</div>
        </div>
    )
}

function FilterChip({
    active,
    onClick,
    children,
    testId,
}: Readonly<{ active: boolean; onClick: () => void; children: React.ReactNode; testId: string }>) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            data-testid={testId}
            className={`inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-full text-xs font-bold border touch-manipulation transition-colors ${
                active
                    ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border-[#b8964a]'
                    : 'bg-white border-[rgba(184,150,74,0.3)] text-slate-500 hover:bg-[#f8f3e8]'
            }`}
        >
            {children}
        </button>
    )
}

function PersonaRow({
    persona: p,
    canEdit,
    t,
    turnLabels,
    expanded,
    onToggleExpand,
    onCapacidad,
    onTurnos,
    onStar,
    onActivo,
    onEdit,
    onDelete,
    onPair,
    onUnpair,
}: Readonly<{
    persona: PlanoPersonaFull
    canEdit: boolean
    t: (k: import('@/lib/i18n/types').TranslationKey) => string
    turnLabels: { jueves: string; domManana: string; domTarde: string }
    expanded: boolean
    onToggleExpand: () => void
    onCapacidad: (p: PlanoPersonaFull, cap: PlanoCapacidad) => void
    onTurnos: (p: PlanoPersonaFull, turnos: PlanoPersonaFull) => void
    onStar: () => void
    onActivo: () => void
    onEdit: () => void
    onDelete: () => void
    onPair: () => void
    onUnpair: () => void
}>) {
    const showTurnSummary = p.activo
    const canExpand = canEdit && showTurnSummary
    const roleTotal = p.asignacionesOfrendario + p.asignacionesApoyo

    return (
        <li
            data-testid={`plano-persona-row-${p.id}`}
            className={`rounded-xl border px-2 py-2 sm:px-2.5 flex flex-col transition-all ${
                p.activo ? 'border-[rgba(184,150,74,0.3)] bg-white shadow-[0_1px_4px_rgba(31,46,133,0.05)]' : 'border-dashed border-[rgba(184,150,74,0.25)] bg-[#f8f3e8]/40 opacity-70'
            }`}
        >
            <div className="flex items-center gap-1 min-w-0">
                <p
                    className={`flex-1 min-w-0 text-sm font-semibold leading-tight line-clamp-2 sm:line-clamp-1 ${
                        p.activo ? 'text-foreground' : 'line-through text-muted-foreground'
                    }`}
                    title={p.nombre}
                >
                    {p.nombre}
                </p>

                {p.prioridad_ofrendario && (
                    <Star
                        className="w-3.5 h-3.5 shrink-0 fill-amber-500 text-amber-500"
                        aria-label={t('ofrenda.plano.personas.starOfrendario')}
                    />
                )}

                <span
                    className={`hidden min-[400px]:inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${CAP_BADGE[p.capacidad]}`}
                    data-testid={`plano-persona-cap-badge-${p.id}`}
                >
                    {t(`ofrenda.plano.cap.${p.capacidad}` as const)}
                </span>

                {p.parejaNombre && (
                    <Heart className="w-3.5 h-3.5 shrink-0 text-red-500" aria-label={t('ofrenda.plano.personas.pareja')} />
                )}

                <span
                    className={`hidden sm:inline text-[10px] font-semibold shrink-0 whitespace-nowrap tabular-nums ${
                        roleTotal > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground/60'
                    }`}
                    data-testid={`plano-persona-assignments-${p.id}`}
                    aria-label={
                        roleTotal > 0
                            ? interpolate(t('ofrenda.plano.personas.roleCountsAria'), {
                                  o: String(p.asignacionesOfrendario),
                                  a: String(p.asignacionesApoyo),
                              })
                            : t('ofrenda.plano.personas.notAssigned')
                    }
                >
                    {roleTotal > 0
                        ? interpolate(t('ofrenda.plano.personas.roleCounts'), {
                              o: String(p.asignacionesOfrendario),
                              a: String(p.asignacionesApoyo),
                          })
                        : t('ofrenda.plano.personas.notAssigned')}
                </span>

                {showTurnSummary && (
                    <TurnAvailabilityDots
                        value={p}
                        color="blue"
                        compact
                        testIdPrefix={`plano-turns-${p.id}`}
                    />
                )}

                {canExpand && (
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground touch-manipulation min-w-[30px] min-h-[30px] flex items-center justify-center"
                        aria-expanded={expanded}
                        aria-label={
                            expanded
                                ? interpolate(t('ofrenda.plano.personas.collapse'), { name: p.nombre })
                                : interpolate(t('ofrenda.plano.personas.expand'), { name: p.nombre })
                        }
                        data-testid={`plano-persona-expand-${p.id}`}
                    >
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                )}

                {canEdit && (
                    <div className="flex items-center shrink-0">
                        <button
                            type="button"
                            onClick={onStar}
                            aria-pressed={p.prioridad_ofrendario}
                            aria-label={t('ofrenda.plano.personas.starOfrendario')}
                            title={t('ofrenda.plano.personas.starOfrendarioHelp')}
                            className={`p-1 rounded-md touch-manipulation min-w-[30px] min-h-[30px] flex items-center justify-center transition-colors ${
                                p.prioridad_ofrendario
                                    ? 'text-amber-500 hover:bg-amber-500/10'
                                    : 'text-muted-foreground hover:bg-muted/60'
                            }`}
                        >
                            <Star className={`w-3.5 h-3.5 ${p.prioridad_ofrendario ? 'fill-current' : ''}`} />
                        </button>
                        <button
                            type="button"
                            onClick={onActivo}
                            data-testid={`plano-persona-toggle-${p.id}`}
                            aria-label={p.activo ? t('ofrenda.plano.personas.deactivated') : t('ofrenda.plano.personas.activated')}
                            title={p.activo ? t('ofrenda.plano.personas.deactivated') : t('ofrenda.plano.personas.activated')}
                            className={`p-1 rounded-md touch-manipulation min-w-[30px] min-h-[30px] flex items-center justify-center transition-colors ${
                                p.activo
                                    ? 'hover:bg-amber-500/10 text-amber-500'
                                    : 'hover:bg-blue-500/10 text-blue-600'
                            }`}
                        >
                            {p.activo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                        <button
                            type="button"
                            onClick={onDelete}
                            aria-label={t('common.delete')}
                            className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 touch-manipulation min-w-[30px] min-h-[30px] flex items-center justify-center"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence initial={false}>
                {expanded && showTurnSummary && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border/30 mt-1.5 pt-1.5 space-y-2"
                        data-testid={`plano-persona-expanded-${p.id}`}
                    >
                        <MemberTurnAvailability
                            value={p}
                            onChange={next => onTurnos(p, { ...p, ...next })}
                            disabled={!canEdit}
                            color="blue"
                            labels={turnLabels}
                            testIdPrefix={`plano-turns-${p.id}`}
                        />

                        <div className="flex items-center gap-2 flex-wrap">
                            <div
                                className="inline-flex rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] bg-gradient-to-br from-[#eef1fb] to-[#f8f3e8] p-0.5"
                                role="group"
                                aria-label={t('ofrenda.plano.cap.label')}
                            >
                                {CAPS.map(cap => {
                                    const Icon = CAP_ICON[cap]
                                    const active = p.capacidad === cap
                                    return (
                                        <button
                                            key={cap}
                                            type="button"
                                            disabled={!canEdit}
                                            aria-pressed={active}
                                            onClick={() => onCapacidad(p, cap)}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-[10px] text-xs font-bold touch-manipulation transition-colors ${
                                                active
                                                    ? 'bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white border border-[#b8964a] shadow'
                                                    : 'text-slate-500 hover:text-[#1f2e85]'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                            {t(`ofrenda.plano.cap.${cap}` as const)}
                                        </button>
                                    )
                                })}
                            </div>

                            {canEdit && p.genero && (
                                p.parejaId ? (
                                    <button
                                        type="button"
                                        onClick={onUnpair}
                                        className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] text-[#1f2e85] hover:bg-[#f8f3e8] text-xs font-bold touch-manipulation"
                                    >
                                        <Heart className="w-3.5 h-3.5 text-red-500" />
                                        {t('ofrenda.plano.personas.quitarPareja')}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onPair}
                                        className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] rounded-xl border border-blue-500/40 text-xs font-bold text-blue-700 dark:text-blue-300 touch-manipulation"
                                    >
                                        <Heart className="w-3.5 h-3.5" />
                                        {t('ofrenda.plano.personas.asignarPareja')}
                                    </button>
                                )
                            )}

                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={onEdit}
                                    aria-label={t('common.edit')}
                                    data-testid={`plano-persona-edit-${p.id}`}
                                    className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] text-[#1f2e85] hover:bg-[#f8f3e8] hover:border-[#b8964a] text-xs font-bold touch-manipulation"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    {t('common.edit')}
                                </button>
                            )}
                        </div>

                        {p.parejaNombre && (
                            <p className="text-[11px] text-muted-foreground">
                                {t('ofrenda.plano.personas.pareja')}: {p.parejaNombre}
                            </p>
                        )}

                        <p className="text-[10px] text-muted-foreground sm:hidden tabular-nums">
                            {roleTotal > 0
                                ? interpolate(t('ofrenda.plano.personas.roleCounts'), {
                                      o: String(p.asignacionesOfrendario),
                                      a: String(p.asignacionesApoyo),
                                  })
                                : t('ofrenda.plano.personas.notAssigned')}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </li>
    )
}

function ParejaDialog({
    persona,
    candidatos,
    onClose,
    onSaved,
}: Readonly<{
    persona: PlanoPersonaFull
    candidatos: PlanoPersonaFull[]
    onClose: () => void
    onSaved: () => void
}>) {
    const { t } = useI18n()
    const { quickSuccess, planError } = useOfrendaToast()
    const [selected, setSelected] = useState('')
    const [busy, setBusy] = useState(false)

    const save = async () => {
        if (!selected || busy) return
        setBusy(true)
        const mujerId = persona.genero === 'mujer' ? persona.id : selected
        const hombreId = persona.genero === 'hombre' ? persona.id : selected
        const res = await invokePlanoAction(() => setPlanoPareja(mujerId, hombreId))
        setBusy(false)
        if (res.error) {
            planError(res.error)
            return
        }
        quickSuccess(t('ofrenda.plano.personas.pareja'))
        onSaved()
    }

    return (
        <OfrendaLiquidShell
            open
            onClose={onClose}
            ariaLabel={t('ofrenda.plano.personas.asignarPareja')}
            title={t('ofrenda.plano.personas.pareja')}
            headline={t('ofrenda.plano.personas.asignarPareja')}
            accent="navy"
            testIdPrefix="plano-personas-pareja"
            unstyledBody
        >
            <div className="px-4 pb-4 space-y-3">
                <p className="text-sm text-muted-foreground">{persona.nombre}</p>
                <select
                    value={selected}
                    onChange={e => setSelected(e.target.value)}
                    className="ofrenda-liquid-search w-full px-4 py-3 min-h-[48px] rounded-xl text-sm"
                >
                    <option value="">{t('ofrenda.plano.personas.asignarPareja')}</option>
                    {candidatos.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 py-3 min-h-[48px] rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] text-[#1f2e85] font-semibold hover:bg-[#f8f3e8] touch-manipulation">
                        {t('common.cancel')}
                    </button>
                    <button type="button" disabled={busy || !selected} onClick={() => void save()} className="flex-1 py-3 min-h-[48px] rounded-xl border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white font-bold shadow-[0_3px_12px_rgba(31,46,133,0.3)] disabled:opacity-50 touch-manipulation">
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </OfrendaLiquidShell>
    )
}

function RenameDialog({
    persona,
    onClose,
    onSaved,
}: Readonly<{
    persona: PlanoPersonaFull
    onClose: () => void
    onSaved: (p: { id: string; nombre: string }) => void
}>) {
    const { t } = useI18n()
    const { quickSuccess, planError } = useOfrendaToast()
    const [value, setValue] = useState(persona.nombre)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const save = async () => {
        const nombre = value.trim()
        if (!nombre || busy) return
        setBusy(true)
        setError(null)
        const res = await invokePlanoAction(() => renamePlanoPersona(persona.id, nombre))
        setBusy(false)
        if (res.errorCode) {
            setError(
                res.errorCode === 'too_short'
                    ? t('ofrenda.plano.combobox.tooShort')
                    : res.errorCode === 'too_long'
                      ? t('ofrenda.plano.combobox.tooLong')
                      : t('ofrenda.plano.personas.duplicate'),
            )
            return
        }
        if (res.error) {
            planError(res.error === 'no_permission' ? t('ofrenda.plano.err.noPermission') : res.error)
            return
        }
        quickSuccess(t('ofrenda.plano.personas.renamed'))
        onSaved({ id: persona.id, nombre: nombre.replace(/\s+/g, ' ') })
    }

    return (
        <OfrendaLiquidShell
            open
            onClose={onClose}
            ariaLabel={t('ofrenda.plano.personas.renameTitle')}
            title={t('ofrenda.plano.personas.renameTitle')}
            headline={t('ofrenda.plano.personas.renameTitle')}
            accent="navy"
            testIdPrefix="plano-personas-rename"
            unstyledBody
        >
            <div className="px-4 pb-4 space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={value}
                        autoFocus
                        autoCapitalize="words"
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') void save() }}
                        className="ofrenda-liquid-search w-full px-4 py-3 min-h-[48px] rounded-xl text-base"
                    />
                    {value && (
                        <button
                            type="button"
                            onClick={() => setValue('')}
                            aria-label={t('common.clearSearch')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    )}
                </div>
                {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 min-h-[48px] rounded-xl border-[1.5px] border-[rgba(184,150,74,0.32)] text-[#1f2e85] font-semibold hover:bg-[#f8f3e8] touch-manipulation"
                    >
                        {t('common.cancel')}
                    </button>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => void save()}
                        disabled={busy || value.trim().length < 2}
                        className="flex-1 py-3 min-h-[48px] rounded-xl border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white font-bold shadow-[0_3px_12px_rgba(31,46,133,0.3)] disabled:opacity-50 touch-manipulation"
                    >
                        {t('common.save')}
                    </motion.button>
                </div>
            </div>
        </OfrendaLiquidShell>
    )
}

export default PlanoPersonasManager
