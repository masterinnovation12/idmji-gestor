'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
    Plus, Trash2, GripVertical, UserCheck, UserX, UserPlus,
    Search, CheckCircle2, Info, Users, ChevronDown, ChevronUp,
    Calendar, Sun, Sunset, Star,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useOfrendaToast } from './ofrendaFeedback'
import { OfrendaLiquidShell } from './OfrendaLiquidShell'
import { interpolate } from './ofrendaLocale'
import type { TranslationKey } from '@/lib/i18n/types'

type OfrendaT = (key: TranslationKey) => string
import {
    upsertMiembro,
    deleteMiembro,
    reordenarMiembros,
    syncHermanos,
    getMiembros,
    setMiembroFijo,
} from './actions'
import type { OfrMiembro } from './actions'
import type { DiaTipo } from '@/lib/utils/ofrendaEngine'
import { MemberTurnAvailability, TurnAvailabilityDots } from './MemberTurnAvailability'
import type { MemberTurnAvailabilityProps } from './MemberTurnAvailability'
import { normalizeMiembroDisponibilidad, type MiembroDisponibilidadTurnos } from './ofrendaMemberAvailability'

// ─── Helpers de estilo inline ────────────────────────────────────────────────

const GROUP_ACCENT = {
    emerald: {
        sectionTitle: 'text-emerald-600 dark:text-emerald-400',
        posNum: 'text-emerald-600',
        addBtn: 'bg-emerald-600 hover:bg-emerald-700',
        legendBg: 'bg-emerald-500/5 border-emerald-500/20',
        legendTitle: 'text-emerald-700 dark:text-emerald-300',
        legendCount: 'text-emerald-600 dark:text-emerald-400',
    },
    blue: {
        sectionTitle: 'text-blue-600 dark:text-blue-400',
        posNum: 'text-blue-600',
        addBtn: 'bg-blue-600 hover:bg-blue-700',
        legendBg: 'bg-blue-500/5 border-blue-500/20',
        legendTitle: 'text-blue-700 dark:text-blue-300',
        legendCount: 'text-blue-600 dark:text-blue-400',
    },
} as const

type GroupColor = keyof typeof GROUP_ACCENT

function getRowClass(isPendingDelete: boolean, activo: boolean): string {
    if (isPendingDelete) return 'border-red-500/50 bg-red-500/5'
    if (activo) return 'border-[rgba(184,150,74,0.3)]'
    return 'border-dashed border-[rgba(184,150,74,0.25)] opacity-60'
}

function getCheckboxClass(yaEsta: boolean, isSel: boolean): string {
    if (yaEsta || isSel) return 'border-emerald-500 bg-emerald-500'
    return 'border-[rgba(184,150,74,0.4)] bg-white'
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
    initialMiembros: OfrMiembro[]
    canEdit: boolean
    onChange: (miembros: OfrMiembro[]) => void
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MiembrosManager({ initialMiembros, canEdit, onChange }: Readonly<Props>) {
    const { t } = useI18n()
    const feedback = useOfrendaToast()
    const [miembros, setMiembros]         = useState<OfrMiembro[]>(initialMiembros)

    useEffect(() => {
        setMiembros(initialMiembros)
    }, [initialMiembros])
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [addGrupo, setAddGrupo]         = useState<1 | 2>(1)
    const [syncModalOpen, setSyncModalOpen] = useState(false)
    // id del miembro esperando confirmación de borrado
    const [pendingDelete, setPendingDelete] = useState<string | null>(null)
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)

    const g1 = miembros.filter(m => m.grupo === 1).sort((a, b) => a.orden - b.orden)
    const g2 = miembros.filter(m => m.grupo === 2).sort((a, b) => a.orden - b.orden)

    /** Actualiza estado local y padre sin llamar onChange dentro de un updater de setState. */
    const syncMiembros = useCallback((updated: OfrMiembro[]) => {
        setMiembros(updated)
        onChange(updated)
    }, [onChange])

    // ── Actualizar lista desde BD ──────────────────────────────────────────────
    const refresh = useCallback(async () => {
        const result = await getMiembros()
        if (result.data) {
            syncMiembros(result.data)
        }
    }, [syncMiembros])

    // ── Añadir persona ─────────────────────────────────────────────────────────
    const handleAddClick = (grupo: 1 | 2) => {
        setAddGrupo(grupo)
        setAddModalOpen(true)
    }

    const handleAddSubmit = async (nombre: string) => {
        const orden = miembros.filter(m => m.grupo === addGrupo).length
        const result = await upsertMiembro({ nombre, grupo: addGrupo, orden })
        if (result.error) { feedback.quickError(result.error); return }
        feedback.quickSuccess(
            interpolate(t('ofrenda.toast.memberAdded'), { name: nombre }),
            interpolate(t('ofrenda.toast.memberAddedDesc'), { grupo: String(addGrupo) })
        )
        setAddModalOpen(false)
        await refresh()
    }

    // ── Eliminar (con confirmación inline) ────────────────────────────────────
    const handleDeleteConfirmed = async (id: string, nombre: string) => {
        setPendingDelete(null)
        const result = await deleteMiembro(id)
        if (result.error) { feedback.quickError(result.error); return }
        feedback.quickWarning(
            interpolate(t('ofrenda.toast.memberDeleted'), { name: nombre }),
            t('ofrenda.toast.memberDeletedDesc')
        )
        await refresh()
    }

    // ── Toggle activo / inactivo ──────────────────────────────────────────────
    const turnLabels = {
        jueves: t('ofrenda.people.turns.jueves'),
        domManana: t('ofrenda.people.turns.domManana'),
        domTarde: t('ofrenda.people.turns.domTarde'),
    }

    const handleDisponibilidadChange = async (m: OfrMiembro, next: MiembroDisponibilidadTurnos) => {
        const merged = { ...m, ...next }
        const optimistic = miembros.map(x => (x.id === m.id ? merged : x))
        syncMiembros(optimistic)

        const result = await upsertMiembro({
            id: m.id,
            nombre: m.nombre,
            grupo: m.grupo,
            orden: m.orden,
            activo: m.activo,
            profile_id: m.profile_id,
            puede_jueves: next.puede_jueves,
            puede_domingo_manana: next.puede_domingo_manana,
            puede_domingo_tarde: next.puede_domingo_tarde,
        })
        if (result.error) {
            feedback.quickError(result.error)
            await refresh()
            return
        }
        if (result.data) {
            syncMiembros(optimistic.map(x => (x.id === m.id ? result.data! : x)))
        }
    }

    const handleToggleActivo = async (m: OfrMiembro) => {
        const result = await upsertMiembro({ ...m, activo: !m.activo })
        if (result.error) { feedback.quickError(result.error); return }
        if (m.activo) {
            feedback.quickWarning(
                interpolate(t('ofrenda.toast.memberDeactivated'), { name: m.nombre }),
                t('ofrenda.toast.memberDeactivatedDesc')
            )
        } else {
            feedback.quickSuccess(
                interpolate(t('ofrenda.toast.memberActivated'), { name: m.nombre }),
                t('ofrenda.toast.memberActivatedDesc')
            )
        }
        await refresh()
    }

    // ── Puesto fijo (coordinador/apoyo siempre la misma persona ese día) ───────
    const handleFijoChange = async (
        m: OfrMiembro,
        dia: DiaTipo | null,
        rol: 'realiza' | 'apoyo' | null,
    ) => {
        const set = Boolean(dia && rol)
        const optimistic = miembros.map(x => {
            if (x.id === m.id) return { ...x, fijo_dia_tipo: dia, fijo_rol: rol }
            // Un (día, rol) solo puede tener un titular: liberar al anterior.
            if (set && x.fijo_dia_tipo === dia && x.fijo_rol === rol) {
                return { ...x, fijo_dia_tipo: null, fijo_rol: null }
            }
            return x
        })
        syncMiembros(optimistic)
        const result = await setMiembroFijo(m.id, dia, rol)
        if (result.error) { feedback.quickError(result.error); await refresh(); return }
        feedback.quickSuccess(t('ofrenda.people.fijo.saved'))
        await refresh()
    }

    // ── Reordenar (drag & drop) ────────────────────────────────────────────────
    const handleReorder = async (grupo: 1 | 2, nuevaLista: OfrMiembro[]) => {
        const otros   = miembros.filter(m => m.grupo !== grupo)
        const updated = nuevaLista.map((m, i) => ({ ...m, orden: i }))
        syncMiembros([...otros, ...updated])
        const result = await reordenarMiembros(updated.map(m => ({ id: m.id, orden: m.orden })))
        if (result.error) feedback.quickError(result.error)
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-3 p-3.5 rounded-2xl border border-[#1f2e85]/15 bg-[#1f2e85]/5">
                <Info className="w-4 h-4 text-[#1f2e85] dark:text-[#e8d9a8] mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    {t('ofrenda.people.turns.hint')}
                </p>
            </div>

            {/* ── Leyenda explicativa de grupos ─────────────────────── */}
            <div className="flex flex-wrap gap-3">
                <LegendCard
                    grupo={1}
                    label={t('ofrenda.people.g1.legend')}
                    description={t('ofrenda.people.g1.legendDesc')}
                    color="emerald"
                    count={g1.length}
                    active={g1.filter(m => m.activo).length}
                    t={t}
                />
                <LegendCard
                    grupo={2}
                    label={t('ofrenda.people.g2.legend')}
                    description={t('ofrenda.people.g2.legendDesc')}
                    color="blue"
                    count={g2.length}
                    active={g2.filter(m => m.activo).length}
                    t={t}
                />
            </div>

            {/* ── Grupos ───────────────────────────────────────────── */}
            {([
                { grupo: 1 as const, lista: g1, color: 'emerald' as const, label: t('ofrenda.people.g1.section') },
                { grupo: 2 as const, lista: g2, color: 'blue' as const,    label: t('ofrenda.people.g2.section') },
            ] as const).map(({ grupo, lista, color, label }) => {
                const accent = GROUP_ACCENT[color]
                return (
                <section key={grupo} aria-label={label}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className={`font-black text-sm uppercase tracking-wider ${accent.sectionTitle}`}>
                            {label}
                        </h2>
                        {canEdit && (
                            <div className="flex gap-2">
                                {/* Botón de importar desde directorio */}
                                <button
                                    onClick={() => { setSyncModalOpen(true); setAddGrupo(grupo) }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-[1.5px] border-[rgba(184,150,74,0.32)] bg-white text-[#1f2e85] rounded-xl hover:bg-[#f8f3e8] hover:border-[#b8964a] transition-colors touch-manipulation"
                                    title={t('ofrenda.people.import')}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{t('ofrenda.people.import')}</span>
                                    <span className="sm:hidden">{t('ofrenda.people.importShort')}</span>
                                </button>

                                <button
                                    onClick={() => handleAddClick(grupo)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border-2 border-[#b8964a] bg-gradient-to-br from-[#1f2e85] to-[#283593] text-white rounded-xl shadow-[0_3px_12px_rgba(31,46,133,0.3)] transition-shadow hover:shadow-[0_5px_18px_rgba(31,46,133,0.42)] touch-manipulation"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {t('ofrenda.people.add')}
                                </button>
                            </div>
                        )}
                    </div>

                    {lista.length === 0 && (
                        <div className="border-2 border-dashed border-[rgba(184,150,74,0.3)] rounded-2xl p-8 text-center text-sm text-muted-foreground">
                            {canEdit
                                ? t('ofrenda.people.emptyEdit')
                                : interpolate(t('ofrenda.people.emptyReadonly'), { section: label })}
                        </div>
                    )}
                    {lista.length > 0 && canEdit && (
                        <Reorder.Group
                            axis="y"
                            values={lista}
                            onReorder={(nueva) => handleReorder(grupo, nueva)}
                            className="space-y-2"
                        >
                            {lista.map((m, idx) => (
                                <MiembroRow
                                    key={m.id}
                                    miembro={m}
                                    posicion={idx + 1}
                                    color={color}
                                    canEdit={canEdit}
                                    isPendingDelete={pendingDelete === m.id}
                                    onDeleteRequest={() => setPendingDelete(m.id)}
                                    onDeleteCancel={() => setPendingDelete(null)}
                                    onDeleteConfirmed={() => handleDeleteConfirmed(m.id, m.nombre)}
                                    onToggleActivo={handleToggleActivo}
                                    onDisponibilidadChange={handleDisponibilidadChange}
                                    onFijoChange={handleFijoChange}
                                    turnLabels={turnLabels}
                                    expanded={expandedMemberId === m.id}
                                    onToggleExpand={() =>
                                        setExpandedMemberId(prev => (prev === m.id ? null : m.id))
                                    }
                                    isDraggable
                                    t={t}
                                />
                            ))}
                        </Reorder.Group>
                    )}
                    {lista.length > 0 && !canEdit && (
                        <div className="space-y-2">
                            {lista.map((m, idx) => (
                                <MiembroRow
                                    key={m.id}
                                    miembro={m}
                                    posicion={idx + 1}
                                    color={color}
                                    canEdit={false}
                                    isPendingDelete={false}
                                    onDeleteRequest={() => undefined}
                                    onDeleteCancel={() => undefined}
                                    onDeleteConfirmed={() => undefined}
                                    onToggleActivo={handleToggleActivo}
                                    onDisponibilidadChange={handleDisponibilidadChange}
                                    onFijoChange={handleFijoChange}
                                    turnLabels={turnLabels}
                                    expanded={expandedMemberId === m.id}
                                    onToggleExpand={() =>
                                        setExpandedMemberId(prev => (prev === m.id ? null : m.id))
                                    }
                                    isDraggable={false}
                                    t={t}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )})}

            {/* ── Modales ───────────────────────────────────────────── */}
            <AddPersonaModal
                isOpen={addModalOpen}
                grupo={addGrupo}
                onClose={() => setAddModalOpen(false)}
                onSubmit={handleAddSubmit}
                t={t}
            />

            <ImportDirectorioModal
                isOpen={syncModalOpen}
                grupo={addGrupo}
                miembrosExistentes={miembros}
                onClose={() => setSyncModalOpen(false)}
                onSync={refresh}
                t={t}
            />
        </div>
    )
}

// ─── Fila de miembro ──────────────────────────────────────────────────────────

interface MiembroRowProps {
    miembro: OfrMiembro
    posicion: number
    color: string
    canEdit: boolean
    isPendingDelete: boolean
    onDeleteRequest: () => void
    onDeleteCancel: () => void
    onDeleteConfirmed: () => void
    onToggleActivo: (m: OfrMiembro) => void
    onDisponibilidadChange: (m: OfrMiembro, next: MiembroDisponibilidadTurnos) => void
    onFijoChange: (m: OfrMiembro, dia: DiaTipo | null, rol: 'realiza' | 'apoyo' | null) => void
    turnLabels: MemberTurnAvailabilityProps['labels']
    expanded: boolean
    onToggleExpand: () => void
    isDraggable: boolean
    t: OfrendaT
}

function MiembroRow({
    miembro,
    posicion,
    color,
    canEdit,
    isPendingDelete,
    onDeleteRequest,
    onDeleteCancel,
    onDeleteConfirmed,
    onToggleActivo,
    onDisponibilidadChange,
    onFijoChange,
    turnLabels,
    expanded,
    onToggleExpand,
    isDraggable,
    t,
}: Readonly<MiembroRowProps>) {
    const Row = isDraggable ? Reorder.Item : motion.div
    const accentKey: GroupColor = color === 'emerald' ? 'emerald' : 'blue'
    const accent = GROUP_ACCENT[accentKey]
    const turnColor = accentKey
    const disp = normalizeMiembroDisponibilidad(miembro)
    const showTurnSummary = !isPendingDelete && miembro.activo
    const canExpandTurns = canEdit && showTurnSummary
    const esG1 = miembro.grupo === 1
    const tieneFijo = Boolean(miembro.fijo_dia_tipo && miembro.fijo_rol)
    const fijoDiaLabel = (d: DiaTipo) =>
        d === 'jueves' ? turnLabels.jueves : d === 'domingo' ? turnLabels.domManana : turnLabels.domTarde

    return (
        <Row
            value={isDraggable ? miembro : undefined}
            layout
            className={`group flex flex-col px-2 py-2 sm:px-2.5 bg-white border rounded-xl shadow-[0_1px_4px_rgba(31,46,133,0.05)] transition-all ${getRowClass(isPendingDelete, miembro.activo)}`}
            whileDrag={isDraggable ? { scale: 1.01, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' } : undefined}
            data-testid={`ofrenda-miembro-row-${miembro.id}`}
        >
            <div className="flex items-center gap-1 min-w-0">
                {isDraggable && (
                    <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 touch-manipulation shrink-0 -ml-0.5">
                        <GripVertical className="w-3.5 h-3.5" />
                    </div>
                )}

                <span className={`text-[10px] font-black w-3.5 text-center tabular-nums shrink-0 ${accent.posNum}`}>
                    {posicion}
                </span>

                <p
                    className={`flex-1 min-w-0 text-sm font-semibold leading-tight line-clamp-2 sm:line-clamp-1 ${miembro.activo ? 'text-slate-800' : 'line-through text-slate-400'}`}
                    title={miembro.nombre}
                    data-testid={`ofrenda-miembro-name-${miembro.id}`}
                >
                    {miembro.nombre}
                </p>

                {esG1 && tieneFijo && (
                    <span
                        className="hidden min-[480px]:inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 whitespace-nowrap"
                        title={t('ofrenda.people.fijo.title')}
                        data-testid={`ofrenda-miembro-fijo-badge-${miembro.id}`}
                    >
                        {t('ofrenda.people.fijo.badge')}: {fijoDiaLabel(miembro.fijo_dia_tipo as DiaTipo)} · {miembro.fijo_rol === 'realiza' ? t('ofrenda.roles.realiza') : t('ofrenda.roles.apoyo')}
                    </span>
                )}

                <AnimatePresence mode="wait">
                    {isPendingDelete ? (
                        <motion.div
                            key="delete"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-1 shrink-0"
                        >
                            <span className="hidden min-[400px]:inline text-[10px] font-semibold text-red-600 whitespace-nowrap">
                                {t('ofrenda.people.deleteConfirm')}
                            </span>
                            <button
                                type="button"
                                onClick={onDeleteConfirmed}
                                className="px-2 py-1 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg touch-manipulation whitespace-nowrap"
                            >
                                {t('ofrenda.people.deleteYes')}
                            </button>
                            <button
                                type="button"
                                onClick={onDeleteCancel}
                                className="px-2 py-1 text-[10px] font-medium border border-[rgba(184,150,74,0.35)] bg-white text-[#1f2e85] rounded-lg hover:bg-[#f8f3e8] touch-manipulation"
                            >
                                {t('ofrenda.people.cancel')}
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="actions"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-0 shrink-0"
                        >
                            {showTurnSummary && (
                                <TurnAvailabilityDots
                                    value={disp}
                                    color={turnColor}
                                    compact
                                    testIdPrefix={`ofrenda-member-turns-${miembro.id}`}
                                />
                            )}

                            {canExpandTurns && (
                                <button
                                    type="button"
                                    onClick={onToggleExpand}
                                    className="p-1 rounded-md hover:bg-[#f8f3e8] text-slate-500 touch-manipulation min-w-[30px] min-h-[30px] flex items-center justify-center"
                                    aria-expanded={expanded}
                                    aria-label={
                                        expanded
                                            ? interpolate(t('ofrenda.people.turns.collapse'), { name: miembro.nombre })
                                            : interpolate(t('ofrenda.people.turns.expand'), { name: miembro.nombre })
                                    }
                                    data-testid={`ofrenda-member-turns-toggle-${miembro.id}`}
                                >
                                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                            )}

                            {canEdit && (
                                <MiembroAcciones
                                    miembro={miembro}
                                    onToggleActivo={onToggleActivo}
                                    onDeleteRequest={onDeleteRequest}
                                    t={t}
                                    compact
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence initial={false}>
                {expanded && showTurnSummary && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-black/10 mt-1.5 pt-1.5"
                    >
                        <MemberTurnAvailability
                            value={disp}
                            onChange={next => onDisponibilidadChange(miembro, next)}
                            disabled={!canEdit}
                            color={turnColor}
                            labels={turnLabels}
                            testIdPrefix={`ofrenda-member-turns-${miembro.id}`}
                        />

                        {esG1 && canEdit && (
                            <FijoEditor
                                miembro={miembro}
                                onChange={(dia, rol) => onFijoChange(miembro, dia, rol)}
                                fijoDiaLabel={fijoDiaLabel}
                                t={t}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </Row>
    )
}

// ─── Editor de puesto fijo (G1) ───────────────────────────────────────────────

function FijoEditor({
    miembro,
    onChange,
    fijoDiaLabel,
    t,
}: Readonly<{
    miembro: OfrMiembro
    onChange: (dia: DiaTipo | null, rol: 'realiza' | 'apoyo' | null) => void
    fijoDiaLabel: (d: DiaTipo) => string
    t: OfrendaT
}>) {
    const [selDia, setSelDia] = useState<DiaTipo | null>(miembro.fijo_dia_tipo)
    const [selRol, setSelRol] = useState<'realiza' | 'apoyo' | null>(miembro.fijo_rol)

    // Re-sincronizar cuando el padre actualiza el miembro (tras guardar/refresh).
    useEffect(() => {
        setSelDia(miembro.fijo_dia_tipo)
        setSelRol(miembro.fijo_rol)
    }, [miembro.fijo_dia_tipo, miembro.fijo_rol])

    // Aplica la selección: guarda solo si día+rol completos; si se rompe un fijo previo, lo limpia.
    const apply = (d: DiaTipo | null, r: 'realiza' | 'apoyo' | null) => {
        setSelDia(d)
        setSelRol(r)
        if (d && r) onChange(d, r)
        else if (miembro.fijo_dia_tipo && miembro.fijo_rol) onChange(null, null)
    }

    const dias = [
        { key: 'jueves' as const, icon: Calendar },
        { key: 'domingo' as const, icon: Sun },
        { key: 'domingo_tarde' as const, icon: Sunset },
    ]
    const roles = [
        { key: 'realiza' as const, label: t('ofrenda.roles.realiza'), icon: Star },
        { key: 'apoyo' as const, label: t('ofrenda.roles.apoyo'), icon: Users },
    ]

    const chipBase =
        'flex items-center justify-center gap-1 min-h-[36px] rounded-lg border px-1.5 py-1 text-[10px] font-bold transition-colors touch-manipulation'
    const chipOn = 'bg-amber-600 text-white border-amber-600 shadow-sm'
    const chipOff = 'bg-white border-[rgba(184,150,74,0.3)] text-slate-500 hover:bg-[#f8f3e8] hover:border-[#b8964a]'

    return (
        <div className="mt-2 pt-2 border-t border-black/10" data-testid={`ofrenda-miembro-fijo-${miembro.id}`}>
            <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    {t('ofrenda.people.fijo.title')}
                </p>
                {(selDia || selRol) && (
                    <button
                        type="button"
                        onClick={() => apply(null, null)}
                        className="text-[10px] font-semibold text-slate-500 hover:text-[#1f2e85] underline-offset-2 hover:underline touch-manipulation"
                    >
                        {t('ofrenda.people.fijo.none')}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t('ofrenda.people.fijo.title')}>
                {dias.map(({ key, icon: Icon }) => {
                    const active = selDia === key
                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            data-testid={`ofrenda-miembro-fijo-dia-${miembro.id}-${key}`}
                            onClick={() => apply(active ? null : key, active ? null : selRol)}
                            className={`${chipBase} ${active ? chipOn : chipOff}`}
                        >
                            <Icon className="w-3 h-3 shrink-0 opacity-90" aria-hidden />
                            <span className="truncate">{fijoDiaLabel(key)}</span>
                        </button>
                    )
                })}
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-1.5" role="group">
                {roles.map(({ key, label, icon: Icon }) => {
                    const active = selRol === key
                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            data-testid={`ofrenda-miembro-fijo-rol-${miembro.id}-${key}`}
                            onClick={() => apply(selDia, active ? null : key)}
                            className={`${chipBase} ${active ? chipOn : chipOff}`}
                        >
                            <Icon className="w-3 h-3 shrink-0 opacity-90" aria-hidden />
                            <span className="truncate">{label}</span>
                        </button>
                    )
                })}
            </div>

            <p className="mt-1.5 text-[10px] text-slate-500 leading-snug">{t('ofrenda.people.fijo.help')}</p>
        </div>
    )
}

// ─── Botones de acción de fila ────────────────────────────────────────────────

function MiembroAcciones({
    miembro,
    onToggleActivo,
    onDeleteRequest,
    t,
    compact = false,
}: Readonly<{
    miembro: OfrMiembro
    onToggleActivo: (m: OfrMiembro) => void
    onDeleteRequest: () => void
    t: OfrendaT
    compact?: boolean
}>) {
    const btnClass = compact
        ? 'p-1 rounded-md touch-manipulation min-w-[30px] min-h-[30px] flex items-center justify-center'
        : 'p-1.5 rounded-lg touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center'
    const iconClass = compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
    const toggleClass = miembro.activo
        ? 'hover:bg-amber-500/10 text-amber-500 hover:text-amber-600'
        : 'hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600'
    const toggleLabel = miembro.activo
        ? interpolate(t('ofrenda.people.deactivateAria'), { name: miembro.nombre })
        : interpolate(t('ofrenda.people.activateAria'), { name: miembro.nombre })
    const toggleTitle = miembro.activo
        ? t('ofrenda.people.deactivateTitle')
        : t('ofrenda.people.activateTitle')

    return (
        <div className="flex items-center shrink-0">
            <button
                type="button"
                onClick={() => onToggleActivo(miembro)}
                className={`${btnClass} transition-colors ${toggleClass}`}
                aria-label={toggleLabel}
                title={toggleTitle}
                data-testid="ofrenda-member-toggle"
            >
                {miembro.activo ? <UserX className={iconClass} /> : <UserCheck className={iconClass} />}
            </button>
            <button
                type="button"
                onClick={onDeleteRequest}
                className={`${btnClass} hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors`}
                aria-label={interpolate(t('ofrenda.people.deleteAria'), { name: miembro.nombre })}
                title={t('ofrenda.people.deleteTitle')}
            >
                <Trash2 className={iconClass} />
            </button>
        </div>
    )
}

// ─── Modal: Añadir persona manualmente ───────────────────────────────────────

function AddPersonaModal({
    isOpen,
    grupo,
    onClose,
    onSubmit,
    t,
}: Readonly<{
    isOpen: boolean
    grupo: 1 | 2
    onClose: () => void
    onSubmit: (nombre: string) => Promise<void>
    t: OfrendaT
}>) {
    const [nombre, setNombre]     = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) { setNombre(''); setTimeout(() => inputRef.current?.focus(), 80) }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nombre.trim()) return
        setIsLoading(true)
        await onSubmit(nombre.trim())
        setIsLoading(false)
        setNombre('')
    }

    const sectionLabel = grupo === 1 ? t('ofrenda.people.g1.section') : t('ofrenda.people.g2.section')

    return (
        <OfrendaLiquidShell
            open={isOpen}
            onClose={onClose}
            ariaLabel={interpolate(t('ofrenda.people.addModal.title'), { grupo: String(grupo) })}
            title={interpolate(t('ofrenda.people.addModal.title'), { grupo: String(grupo) })}
            headline={sectionLabel}
            subtitle={grupo === 1 ? t('ofrenda.people.addModal.descG1') : t('ofrenda.people.addModal.descG2')}
            accent={grupo === 1 ? 'emerald' : 'blue'}
            panelSize="sm"
            testIdPrefix="ofrenda-add-miembro"
            closeLabel={t('common.close')}
            footer={
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="ofrenda-liquid-btn-secondary">
                        {t('ofrenda.people.cancel')}
                    </button>
                    <button
                        type="submit"
                        form="ofrenda-add-miembro-form"
                        disabled={isLoading || !nombre.trim()}
                        className="ofrenda-liquid-btn-primary"
                    >
                        {isLoading
                            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            : <Plus className="h-3.5 w-3.5" />}
                        {isLoading ? t('ofrenda.people.addModal.saving') : t('ofrenda.people.add')}
                    </button>
                </div>
            }
        >
            <form id="ofrenda-add-miembro-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="nombre-miembro" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#8a7340]">
                        {t('ofrenda.people.addModal.nameLabel')}
                    </label>
                    <input
                        id="nombre-miembro"
                        ref={inputRef}
                        type="text"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        placeholder={t('ofrenda.people.addModal.placeholder')}
                        required
                        className="ofrenda-liquid-search w-full rounded-2xl px-3 py-2.5 text-sm"
                    />
                </div>
            </form>
        </OfrendaLiquidShell>
    )
}

// ─── Modal: Importar del Directorio de Hermanos ──────────────────────────────

function ImportDirectorioModal({
    isOpen,
    grupo,
    miembrosExistentes,
    onClose,
    onSync,
    t,
}: Readonly<{
    isOpen: boolean
    grupo: 1 | 2
    miembrosExistentes: OfrMiembro[]
    onClose: () => void
    onSync: () => Promise<void>
    t: OfrendaT
}>) {
    const feedback = useOfrendaToast()
    const [hermanos, setHermanos] = useState<{ id: string; nombre: string; apellidos: string }[]>([])
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [search, setSearch]     = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(false)

    // IDs ya en la lista de ofrenda (para marcarlos)
    const yaEnOfrenda = new Set(
        miembrosExistentes
            .filter(m => m.profile_id !== null && m.profile_id !== undefined)
            .map(m => String(m.profile_id))
    )

    // Carga automática al abrir
    useEffect(() => {
        if (!isOpen) { setSelected(new Set()); setSearch(''); return }
        setIsFetching(true)
        import('@/lib/supabase/client')
            .then(({ createClient }) => createClient()
                .from('profiles')
                .select('id, nombre, apellidos')
                .order('nombre')
            )
            .then(({ data }) => {
                setHermanos((data ?? []) as { id: string; nombre: string; apellidos: string }[])
                setIsFetching(false)
            })
    }, [isOpen])

    const filtrados = hermanos.filter(h => {
        const texto = `${h.nombre ?? ''} ${h.apellidos ?? ''}`.toLowerCase()
        return texto.includes(search.toLowerCase())
    })

    const toggle = (id: string) => {
        if (yaEnOfrenda.has(id)) return // no seleccionar duplicados
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleImport = async () => {
        if (selected.size === 0) return
        setIsLoading(true)
        const result = await syncHermanos(Array.from(selected), grupo)
        setIsLoading(false)
        if (result.error) {
            feedback.quickError(result.error)
        } else {
            feedback.quickSuccess(
                interpolate(t('ofrenda.toast.memberImported'), { count: String(result.importados) }),
                interpolate(t('ofrenda.toast.memberImportedDesc'), { grupo: String(grupo) })
            )
            setSelected(new Set())
            onClose()
            await onSync()
        }
    }

    const grupoLabel = grupo === 1 ? t('ofrenda.people.g1.section') : t('ofrenda.people.g2.section')
    const nuevosDisponibles = filtrados.filter(h => yaEnOfrenda.has(h.id) === false).length

    return (
        <OfrendaLiquidShell
            open={isOpen}
            onClose={onClose}
            ariaLabel={t('ofrenda.people.importModal.title')}
            title={t('ofrenda.people.importModal.title')}
            headline={grupoLabel}
            subtitle={interpolate(t('ofrenda.people.importModal.desc'), { section: grupoLabel })}
            accent={grupo === 1 ? 'emerald' : 'blue'}
            panelSize="md"
            testIdPrefix="ofrenda-import-miembro"
            closeLabel={t('common.close')}
            unstyledBody
            footer={
                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="ofrenda-liquid-btn-secondary">
                        {t('ofrenda.people.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={isLoading || selected.size === 0}
                        className="ofrenda-liquid-btn-primary"
                    >
                        {isLoading
                            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            : <UserPlus className="h-3.5 w-3.5" />}
                        {isLoading
                            ? t('ofrenda.people.importModal.importing')
                            : `${t('ofrenda.people.importModal.importBtn')}${selected.size > 0 ? ` (${selected.size})` : ''}`}
                    </button>
                </div>
            }
        >
            <div className="flex max-h-[min(52vh,420px)] flex-col px-4 py-4">
                <div className="ofrenda-liquid-info mb-4 shrink-0">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#b8964a]" />
                    <div className="space-y-1">
                        <p className="font-semibold">{t('ofrenda.people.importModal.what')}</p>
                        <p>{t('ofrenda.people.importModal.hint')}</p>
                    </div>
                </div>

                {isFetching ? (
                    <div className="space-y-2 animate-pulse">
                        {Array.from({ length: 6 }, (_, i) => i).map(i => (
                            <div key={`sk-${i}`} className="h-11 rounded-xl bg-slate-100" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="relative mb-3 shrink-0">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('ofrenda.people.importModal.search')}
                                className="ofrenda-liquid-search w-full rounded-2xl py-3 pl-10 pr-3 text-sm"
                                aria-label={t('ofrenda.people.importModal.search')}
                            />
                        </div>

                        <p className="mb-2 shrink-0 px-0.5 text-xs text-slate-600">
                            {interpolate(t('ofrenda.people.importModal.available'), { count: String(nuevosDisponibles) })}
                            {selected.size > 0 && (
                                <span className="ml-2 font-semibold text-[#1f2e85]">
                                    {interpolate(t('ofrenda.people.importModal.selected'), { count: String(selected.size) })}
                                </span>
                            )}
                        </p>

                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-0.5">
                            {filtrados.length === 0 ? (
                                <p className="py-8 text-center text-sm text-slate-500">
                                    {interpolate(t('ofrenda.people.importModal.noResults'), { query: search })}
                                </p>
                            ) : filtrados.map(h => {
                                const nombreCompleto = [h.nombre, h.apellidos].filter(Boolean).join(' ')
                                const yaEsta = yaEnOfrenda.has(h.id)
                                const isSel = selected.has(h.id)
                                const rowClass = yaEsta
                                    ? 'ofrenda-liquid-member opacity-60 cursor-not-allowed'
                                    : isSel
                                      ? 'ofrenda-liquid-member ofrenda-liquid-member--selected font-bold'
                                      : 'ofrenda-liquid-member'
                                return (
                                    <label
                                        key={h.id}
                                        className={`${rowClass} flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm`}
                                    >
                                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${getCheckboxClass(yaEsta, isSel)}`}>
                                            {(yaEsta || isSel) && (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                            )}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={isSel || yaEsta}
                                            onChange={() => toggle(h.id)}
                                            disabled={yaEsta}
                                            className="sr-only"
                                            aria-label={`Seleccionar ${nombreCompleto}`}
                                        />
                                        <span className="flex-1 font-medium">{nombreCompleto}</span>
                                        {yaEsta && (
                                            <span className="shrink-0 text-[10px] font-bold text-[#8a7340]">
                                                {t('ofrenda.people.importModal.already')}
                                            </span>
                                        )}
                                    </label>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </OfrendaLiquidShell>
    )
}

// ─── Legend Card ──────────────────────────────────────────────────────────────

function LegendCard({
    grupo,
    label,
    description,
    color,
    count,
    active,
    t,
}: Readonly<{
    grupo: 1 | 2
    label: string
    description: string
    color: GroupColor
    count: number
    active: number
    t: OfrendaT
}>) {
    const accent = GROUP_ACCENT[color]
    const inactive = count - active
    return (
        <div className={`flex-1 min-w-[220px] p-4 border rounded-2xl space-y-2 ${accent.legendBg}`}>
            <div className="flex items-center justify-between">
                <p className={`font-black text-sm ${accent.legendTitle}`}>{label}</p>
                <span className={`text-xs font-black ${accent.legendCount}`}>
                    G{grupo}
                </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            <div className="flex gap-3 text-xs font-semibold pt-1">
                <span className={accent.legendCount}>
                    {interpolate(t('ofrenda.people.legend.active'), { count: String(active) })}
                </span>
                {inactive > 0 && (
                    <span className="text-muted-foreground">
                        {interpolate(t('ofrenda.people.legend.inactive'), { count: String(inactive) })}
                    </span>
                )}
                <span className="text-muted-foreground/60 ml-auto">
                    {interpolate(t('ofrenda.people.legend.total'), { count: String(count) })}
                </span>
            </div>
        </div>
    )
}
