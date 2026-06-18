/**
 * PlanoPersonasManager — gestión del directorio de personas del plano.
 * Buscar, añadir, renombrar, borrar y marcar la capacidad (ofrendario/apoyo/ambos).
 * Responsive: tarjetas en móvil, fila densa en escritorio.
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, Pencil, Trash2, Loader2, Users, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { interpolate } from '../ofrendaLocale'
import { useOfrendaToast } from '../ofrendaFeedback'
import { OfrendaLiquidShell } from '../OfrendaLiquidShell'
import { invokePlanoAction } from './planoInvoke'
import { normalizePlanoPersonaNombre } from './planoPersonaNormalize'
import {
    listPlanoPersonas,
    createPlanoPersona,
    renamePlanoPersona,
    deletePlanoPersona,
    setPlanoPersonaCapacidad,
    type PlanoPersonaFull,
} from './planoActions'
import type { PlanoCapacidad } from './planoTypes'

const CAPS: PlanoCapacidad[] = ['ofrendario', 'apoyo', 'ambos']

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

    // Cargar una sola vez al montar (las fns del toast/t no son referencialmente
    // estables; depender de `load` provocaría un bucle de recargas).
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
                    <Users className="w-4 h-4 text-emerald-600" />
                    {t('ofrenda.plano.personas.title')}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">{t('ofrenda.plano.personas.desc')}</p>
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
                        className="flex-1 min-w-0 px-4 py-2.5 min-h-[44px] rounded-xl border border-border bg-background text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => void handleAdd()}
                        disabled={busy || adding.trim().length < 2}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 touch-manipulation shrink-0"
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
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl border border-border bg-background text-sm"
                />
            </div>

            <p className="text-xs font-semibold text-muted-foreground" data-testid="plano-personas-count">
                {interpolate(t('ofrenda.plano.personas.count'), { n: String(personas.length) })}
            </p>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-600" aria-label={t('common.loading')} />
                </div>
            ) : personas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{t('ofrenda.plano.personas.empty')}</p>
            ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{t('ofrenda.plano.personas.noResults')}</p>
            ) : (
                <ul className="space-y-2" data-testid="plano-personas-list">
                    {filtered.map(p => (
                        <li
                            key={p.id}
                            className="rounded-2xl border border-border/60 bg-background/80 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold truncate">{p.nombre}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    {p.asignaciones > 0
                                        ? interpolate(t('ofrenda.plano.personas.assigned'), { n: String(p.asignaciones) })
                                        : t('ofrenda.plano.personas.notAssigned')}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                <div
                                    className="inline-flex rounded-xl border border-border bg-muted/40 p-0.5"
                                    role="group"
                                    aria-label={t('ofrenda.plano.cap.label')}
                                >
                                    {CAPS.map(cap => {
                                        const active = p.capacidad === cap
                                        return (
                                            <button
                                                key={cap}
                                                type="button"
                                                disabled={!canEdit}
                                                aria-pressed={active}
                                                onClick={() => void changeCapacidad(p, cap)}
                                                className={`px-2.5 py-1.5 min-h-[36px] rounded-[10px] text-xs font-bold transition-colors touch-manipulation ${
                                                    active
                                                        ? 'bg-emerald-600 text-white shadow'
                                                        : 'text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground'
                                                } ${!canEdit ? 'cursor-default' : ''}`}
                                            >
                                                {t(`ofrenda.plano.cap.${cap}` as const)}
                                            </button>
                                        )
                                    })}
                                </div>

                                {canEdit && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setEditing(p)}
                                            aria-label={t('common.edit')}
                                            className="p-2 min-h-[40px] min-w-[40px] rounded-xl border border-border hover:bg-muted touch-manipulation"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeleting(p)}
                                            aria-label={t('common.delete')}
                                            className="p-2 min-h-[40px] min-w-[40px] rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 touch-manipulation"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
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

            {deleting && (
                <OfrendaLiquidShell
                    open
                    onClose={() => setDeleting(null)}
                    ariaLabel={t('ofrenda.plano.personas.deleteTitle')}
                    title={t('ofrenda.plano.personas.deleteTitle')}
                    headline={t('ofrenda.plano.personas.deleteTitle')}
                    accent="gold"
                    testIdPrefix="plano-personas-delete"
                    unstyledBody
                >
                    <div className="px-4 pb-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {interpolate(t('ofrenda.plano.personas.deleteDesc'), { nombre: deleting.nombre })}
                            {deleting.asignaciones > 0 && (
                                <span className="block mt-2 font-semibold text-amber-700 dark:text-amber-300">
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
                                className="flex-1 py-3 min-h-[48px] rounded-xl border border-border font-semibold touch-manipulation"
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
                        className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-border bg-background text-base"
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
                        className="flex-1 py-3 min-h-[48px] rounded-xl border border-border font-semibold touch-manipulation"
                    >
                        {t('common.cancel')}
                    </button>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => void save()}
                        disabled={busy || value.trim().length < 2}
                        className="flex-1 py-3 min-h-[48px] rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50 touch-manipulation"
                    >
                        {t('common.save')}
                    </motion.button>
                </div>
            </div>
        </OfrendaLiquidShell>
    )
}

export default PlanoPersonasManager
