'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
    Plus, Trash2, GripVertical, UserCheck, UserX, UserPlus,
    Search, AlertTriangle, CheckCircle2, Info, X, Users
} from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import {
    upsertMiembro,
    deleteMiembro,
    reordenarMiembros,
    syncHermanos,
    getMiembros,
} from './actions'
import type { OfrMiembro } from './actions'

// ─── Helpers de estilo inline ────────────────────────────────────────────────

function getRowClass(isPendingDelete: boolean, activo: boolean): string {
    if (isPendingDelete) return 'border-red-500/50 bg-red-500/5'
    if (activo) return 'border-border'
    return 'border-dashed border-border/50 opacity-60'
}

function getLabelClass(yaEsta: boolean, isSel: boolean): string {
    if (yaEsta) return 'opacity-50 cursor-not-allowed bg-muted/50'
    if (isSel) return 'bg-emerald-500/10 border border-emerald-500/20 cursor-pointer'
    return 'hover:bg-muted cursor-pointer'
}

function getCheckboxClass(yaEsta: boolean, isSel: boolean): string {
    if (yaEsta || isSel) return 'border-emerald-500 bg-emerald-500'
    return 'border-border bg-background'
}

// ─── Toasts premium con descripción e icono ──────────────────────────────────

function toastOk(title: string, description?: string) {
    toast.success(title, {
        description,
        duration: 3500,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    })
}

function toastWarn(title: string, description?: string) {
    toast.warning(title, {
        description,
        duration: 4000,
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
    })
}

function toastErr(msg: string) {
    toast.error(msg, {
        duration: 5000,
        icon: <X className="w-4 h-4 text-red-500" />,
    })
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
    initialMiembros: OfrMiembro[]
    canEdit: boolean
    onChange: (miembros: OfrMiembro[]) => void
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MiembrosManager({ initialMiembros, canEdit, onChange }: Readonly<Props>) {
    const [miembros, setMiembros]         = useState<OfrMiembro[]>(initialMiembros)
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [addGrupo, setAddGrupo]         = useState<1 | 2>(1)
    const [syncModalOpen, setSyncModalOpen] = useState(false)
    // id del miembro esperando confirmación de borrado
    const [pendingDelete, setPendingDelete] = useState<string | null>(null)

    const g1 = miembros.filter(m => m.grupo === 1).sort((a, b) => a.orden - b.orden)
    const g2 = miembros.filter(m => m.grupo === 2).sort((a, b) => a.orden - b.orden)

    // ── Actualizar lista desde BD ──────────────────────────────────────────────
    const refresh = useCallback(async () => {
        const result = await getMiembros()
        if (result.data) {
            setMiembros(result.data)
            onChange(result.data)
        }
    }, [onChange])

    // ── Añadir persona ─────────────────────────────────────────────────────────
    const handleAddClick = (grupo: 1 | 2) => {
        setAddGrupo(grupo)
        setAddModalOpen(true)
    }

    const handleAddSubmit = async (nombre: string) => {
        const orden = miembros.filter(m => m.grupo === addGrupo).length
        const result = await upsertMiembro({ nombre, grupo: addGrupo, orden })
        if (result.error) { toastErr(result.error); return }
        toastOk(
            `${nombre} añadido`,
            `Grupo ${addGrupo} — aparecerá en la rotación automática del próximo plan generado.`
        )
        setAddModalOpen(false)
        await refresh()
    }

    // ── Eliminar (con confirmación inline) ────────────────────────────────────
    const handleDeleteConfirmed = async (id: string, nombre: string) => {
        setPendingDelete(null)
        const result = await deleteMiembro(id)
        if (result.error) { toastErr(result.error); return }
        toastWarn(
            `${nombre} eliminado`,
            'Ha sido quitado de la lista. Sus asignaciones pasadas no se borran.'
        )
        await refresh()
    }

    // ── Toggle activo / inactivo ──────────────────────────────────────────────
    const handleToggleActivo = async (m: OfrMiembro) => {
        const result = await upsertMiembro({ ...m, activo: !m.activo })
        if (result.error) { toastErr(result.error); return }
        if (m.activo) {
            toastWarn(
                `${m.nombre} desactivado`,
                'No recibirá asignaciones automáticas hasta que se reactive.'
            )
        } else {
            toastOk(
                `${m.nombre} activado`,
                'Volverá a entrar en la rotación al regenerar el plan.'
            )
        }
        await refresh()
    }

    // ── Reordenar (drag & drop) ────────────────────────────────────────────────
    const handleReorder = async (grupo: 1 | 2, nuevaLista: OfrMiembro[]) => {
        const otros   = miembros.filter(m => m.grupo !== grupo)
        const updated = nuevaLista.map((m, i) => ({ ...m, orden: i }))
        setMiembros([...otros, ...updated])
        onChange([...otros, ...updated])
        const result = await reordenarMiembros(updated.map(m => ({ id: m.id, orden: m.orden })))
        if (result.error) toastErr(result.error)
    }

    return (
        <div className="space-y-6">
            {/* ── Leyenda explicativa de grupos ─────────────────────── */}
            <div className="flex flex-wrap gap-3">
                <LegendCard
                    grupo={1}
                    label="Grupo 1 — Quienes realizan la labor"
                    description="Cada servicio se asignan 3: Realiza la labor · Apoyo · Vigilancia y Orientación"
                    color="emerald"
                    count={g1.length}
                    active={g1.filter(m => m.activo).length}
                />
                <LegendCard
                    grupo={2}
                    label="Grupo 2 — Colaboradores de entrada"
                    description="Cada servicio se asignan 3 colaboradores para apoyar en la recepción"
                    color="blue"
                    count={g2.length}
                    active={g2.filter(m => m.activo).length}
                />
            </div>

            {/* ── Grupos ───────────────────────────────────────────── */}
            {([
                { grupo: 1 as const, lista: g1, color: 'emerald', label: 'Grupo 1 — Roles de Servicio' },
                { grupo: 2 as const, lista: g2, color: 'blue',    label: 'Grupo 2 — Colaboradores' },
            ] as const).map(({ grupo, lista, color, label }) => (
                <section key={grupo} aria-label={label}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className={`font-black text-sm uppercase tracking-wider text-${color}-600 dark:text-${color}-400`}>
                            {label}
                        </h2>
                        {canEdit && (
                            <div className="flex gap-2">
                                {/* Botón de importar desde directorio */}
                                <button
                                    onClick={() => { setSyncModalOpen(true); setAddGrupo(grupo) }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-xl hover:bg-muted transition-colors touch-manipulation"
                                    title="Importar personas desde el Directorio de Hermanos del sistema"
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Importar del Directorio</span>
                                    <span className="sm:hidden">Importar</span>
                                </button>

                                <button
                                    onClick={() => handleAddClick(grupo)}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-${color}-600 hover:bg-${color}-700 text-white rounded-xl transition-colors touch-manipulation`}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Añadir
                                </button>
                            </div>
                        )}
                    </div>

                    {lista.length === 0 && (
                        <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
                            {canEdit
                                ? 'Sin personas todavía. Usa «Añadir» para crear una nueva o «Importar del Directorio» para traer hermanos del sistema.'
                                : `Sin personas en ${label}.`}
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
                                    isDraggable
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
                                    isDraggable={false}
                                />
                            ))}
                        </div>
                    )}
                </section>
            ))}

            {/* ── Modales ───────────────────────────────────────────── */}
            <AddPersonaModal
                isOpen={addModalOpen}
                grupo={addGrupo}
                onClose={() => setAddModalOpen(false)}
                onSubmit={handleAddSubmit}
            />

            <ImportDirectorioModal
                isOpen={syncModalOpen}
                grupo={addGrupo}
                miembrosExistentes={miembros}
                onClose={() => setSyncModalOpen(false)}
                onSync={refresh}
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
    isDraggable: boolean
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
    isDraggable,
}: Readonly<MiembroRowProps>) {
    const Row = isDraggable ? Reorder.Item : motion.div

    return (
        <Row
            value={isDraggable ? miembro : undefined}
            layout
            className={`flex items-center gap-3 px-3 py-2.5 bg-background border rounded-2xl transition-all ${getRowClass(isPendingDelete, miembro.activo)}`}
            whileDrag={isDraggable ? { scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } : undefined}
        >
            {/* Grip */}
            {isDraggable && (
                <div className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-manipulation p-1 shrink-0">
                    <GripVertical className="w-4 h-4" />
                </div>
            )}

            {/* Número de orden */}
            <span className={`text-xs font-black w-5 text-center text-${color}-600 dark:text-${color}-400 shrink-0`}>
                {posicion}
            </span>

            {/* Nombre */}
            <span className={`flex-1 text-sm font-semibold ${miembro.activo ? '' : 'line-through text-muted-foreground'}`}>
                {miembro.nombre}
            </span>

            {/* Badge estado */}
            <AnimatePresence mode="wait">
                {isPendingDelete ? null : (
                    <motion.span
                        key={`badge-${miembro.activo}`}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.15 }}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            miembro.activo
                                ? `bg-${color}-500/10 text-${color}-700 dark:text-${color}-300`
                                : 'bg-muted text-muted-foreground'
                        }`}
                    >
                        {miembro.activo ? '● Activo' : '○ Inactivo'}
                    </motion.span>
                )}
            </AnimatePresence>

            {/* Acciones normales */}
            {canEdit && !isPendingDelete && (
                <MiembroAcciones
                    miembro={miembro}
                    onToggleActivo={onToggleActivo}
                    onDeleteRequest={onDeleteRequest}
                />
            )}

            {/* Confirmación inline de borrado */}
            <AnimatePresence>
                {isPendingDelete && (
                    <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.18 }}
                        className="flex items-center gap-1.5 overflow-hidden shrink-0"
                    >
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                            ¿Eliminar?
                        </span>
                        <button
                            onClick={onDeleteConfirmed}
                            className="px-2.5 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors touch-manipulation whitespace-nowrap"
                        >
                            Sí, eliminar
                        </button>
                        <button
                            onClick={onDeleteCancel}
                            className="px-2.5 py-1 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors touch-manipulation"
                        >
                            Cancelar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </Row>
    )
}

// ─── Botones de acción de fila ────────────────────────────────────────────────

function MiembroAcciones({
    miembro,
    onToggleActivo,
    onDeleteRequest,
}: Readonly<{
    miembro: OfrMiembro
    onToggleActivo: (m: OfrMiembro) => void
    onDeleteRequest: () => void
}>) {
    const toggleClass = miembro.activo
        ? 'hover:bg-amber-500/10 text-amber-500 hover:text-amber-600'
        : 'hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600'
    const toggleLabel = miembro.activo
        ? `Desactivar a ${miembro.nombre}`
        : `Activar a ${miembro.nombre}`
    const toggleTitle = miembro.activo
        ? 'Desactivar — no recibirá asignaciones'
        : 'Activar — entrará en la rotación'

    return (
        <div className="flex items-center gap-1 shrink-0">
            <button
                onClick={() => onToggleActivo(miembro)}
                className={`p-1.5 rounded-lg transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center ${toggleClass}`}
                aria-label={toggleLabel}
                title={toggleTitle}
            >
                {miembro.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </button>
            <button
                onClick={onDeleteRequest}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label={`Eliminar a ${miembro.nombre}`}
                title="Eliminar de la lista de labor ofrenda"
            >
                <Trash2 className="w-4 h-4" />
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
}: Readonly<{
    isOpen: boolean
    grupo: 1 | 2
    onClose: () => void
    onSubmit: (nombre: string) => Promise<void>
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Añadir persona al Grupo ${grupo}`}
            size="sm"
            keyPrefix="add-miembro"
        >
            <p className="text-xs text-muted-foreground mb-4">
                {grupo === 1
                    ? 'Esta persona participará en los roles: Realiza labor, Apoyo y Vigilancia.'
                    : 'Esta persona participará como Colaboradora en la recepción de ofrendas.'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="nombre-miembro" className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                        Nombre completo
                    </label>
                    <input
                        id="nombre-miembro"
                        ref={inputRef}
                        type="text"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        placeholder="Ej: Pedro García"
                        required
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                    />
                </div>
                <div className="flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-muted transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !nombre.trim()}
                        className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading
                            ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                            : <><Plus className="w-3.5 h-3.5" /> Añadir</>
                        }
                    </button>
                </div>
            </form>
        </Modal>
    )
}

// ─── Modal: Importar del Directorio de Hermanos ──────────────────────────────

function ImportDirectorioModal({
    isOpen,
    grupo,
    miembrosExistentes,
    onClose,
    onSync,
}: Readonly<{
    isOpen: boolean
    grupo: 1 | 2
    miembrosExistentes: OfrMiembro[]
    onClose: () => void
    onSync: () => Promise<void>
}>) {
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
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleImport = async () => {
        if (selected.size === 0) return
        setIsLoading(true)
        const result = await syncHermanos(Array.from(selected), grupo)
        setIsLoading(false)
        if (result.error) {
            toastErr(result.error)
        } else {
            const plural = result.importados === 1 ? '' : 's'
            toastOk(
                `${result.importados} persona${plural} importada${plural}`,
                `Añadidas al Grupo ${grupo} de Labor Ofrenda. Regenera el plan para incluirlas en la rotación.`
            )
            setSelected(new Set())
            onClose()
            await onSync()
        }
    }

    const grupoLabel = grupo === 1 ? 'Grupo 1 — Roles de Servicio' : 'Grupo 2 — Colaboradores'
    const nuevosDisponibles = filtrados.filter(h => yaEnOfrenda.has(h.id) === false).length

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Importar del Directorio de Hermanos"
            size="md"
            keyPrefix="sync-hermanos"
        >
            <div className="space-y-4">
                {/* Banner informativo */}
                <div className="flex gap-3 p-3 bg-blue-500/8 border border-blue-500/20 rounded-xl">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <p className="font-semibold">¿Qué hace esto?</p>
                        <p>Importa personas del <strong>Directorio de Hermanos</strong> del sistema directamente a <strong>{grupoLabel}</strong> de la lista de Labor Ofrenda.</p>
                        <p className="text-blue-600/80 dark:text-blue-400/80">
                            Los hermanos marcados con ✓ ya están en la lista. Selecciona los que quieras añadir y pulsa «Importar».
                        </p>
                    </div>
                </div>

                {isFetching ? (
                    /* Skeleton de carga */
                    <div className="space-y-2 animate-pulse">
                        {Array.from({ length: 6 }, (_, i) => i).map(i => (
                            <div key={`sk-${i}`} className="h-11 bg-muted rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Buscador */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="search"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nombre..."
                                className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
                                aria-label="Buscar hermano para importar"
                            />
                        </div>

                        {/* Contador */}
                        <p className="text-xs text-muted-foreground px-0.5">
                            {nuevosDisponibles} disponible{nuevosDisponibles === 1 ? '' : 's'} para importar
                            {selected.size > 0 && <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">· {selected.size} seleccionado{selected.size === 1 ? '' : 's'}</span>}
                        </p>

                        {/* Lista */}
                        <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5 rounded-xl">
                            {filtrados.length === 0 ? (
                                <p className="text-center py-8 text-sm text-muted-foreground">Sin resultados para «{search}»</p>
                            ) : filtrados.map(h => {
                                const nombreCompleto = [h.nombre, h.apellidos].filter(Boolean).join(' ')
                                const yaEsta = yaEnOfrenda.has(h.id)
                                const isSel  = selected.has(h.id)
                                return (
                                    <label
                                        key={h.id}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${getLabelClass(yaEsta, isSel)}`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${getCheckboxClass(yaEsta, isSel)}`}>
                                            {(yaEsta || isSel) && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 400 }}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                </motion.div>
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
                                        <span className="flex-1 text-sm font-medium">{nombreCompleto}</span>
                                        {yaEsta && (
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                                Ya en lista
                                            </span>
                                        )}
                                    </label>
                                )
                            })}
                        </div>

                        {/* Footer con acciones */}
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                            <button
                                onClick={onClose}
                                className="px-3 py-2 text-sm border border-border rounded-xl hover:bg-muted transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={isLoading || selected.size === 0}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 transition-colors"
                            >
                                {isLoading
                                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importando...</>
                                    : <><UserPlus className="w-3.5 h-3.5" /> Importar {selected.size > 0 ? `(${selected.size})` : ''}</>
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
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
}: Readonly<{
    grupo: 1 | 2
    label: string
    description: string
    color: string
    count: number
    active: number
}>) {
    const inactive = count - active
    return (
        <div className={`flex-1 min-w-[220px] p-4 bg-${color}-500/5 border border-${color}-500/20 rounded-2xl space-y-2`}>
            <div className="flex items-center justify-between">
                <p className={`font-black text-sm text-${color}-700 dark:text-${color}-300`}>{label}</p>
                <span className={`text-xs font-black text-${color}-600 dark:text-${color}-400`}>
                    G{grupo}
                </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            <div className="flex gap-3 text-xs font-semibold pt-1">
                <span className={`text-${color}-600 dark:text-${color}-400`}>{active} activos</span>
                {inactive > 0 && <span className="text-muted-foreground">{inactive} inactivos</span>}
                <span className="text-muted-foreground/60 ml-auto">{count} total</span>
            </div>
        </div>
    )
}
