/**
 * HimnoCoroSelector - IDMJI Gestor de Púlpito
 * 
 * Componente para seleccionar y organizar himnos y coros en cultos o calculadora de tiempo.
 * 
 * Características:
 * - Búsqueda en tiempo real de himnos y coros
 * - Ordenamiento automático: primero himnos, luego coros
 * - Reorganización con botones de flechas (arriba/abajo)
 * - Drag-and-drop premium para reorganización visual
 * - Modo calculadora (sin cultoId) y modo culto (con cultoId)
 * - Guardado de listas en localStorage (calculadora)
 * 
 * @author Antigravity AI
 * @date 2024-12-25
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, Plus, Trash2, Music, Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { searchHimnos, searchCoros, addHimnoCoro, removeHimnoCoro, getHimnosCorosByCulto, updateHimnosCorosOrder, replaceCultoPlanAfterSequenceConfirm, updateSequencePointer } from '@/app/dashboard/himnos/actions'
import { Himno, Coro, PlanHimnoCoro, Profile } from '@/types/database'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { LIMITES } from '@/lib/constants'
import {
    isTipoCultoEnsenanza,
    displayListEnsenanza,
    assignGlobalOrden,
    needsEnsenanzaOrderNormalization,
} from '@/lib/utils/himnoCoroEnsenanzaOrder'

interface HimnoCoroSelectorProps {
    cultoId?: string // Now optional for calculator mode
    cultoDate?: string // Nueva prop para rastrear el punto de verdad en la secuencia
    maxHimnos?: number
    maxCoros?: number
    className?: string
    tipoCulto?: string
}

/**
 * Componente sortable individual para cada item
 */
function SortableItem({ item, id, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
    item: PlanHimnoCoro
    id: string
    onRemove: (id: string) => void
    onMoveUp: (id: string) => void
    onMoveDown: (id: string) => void
    isFirst: boolean
    isLast: boolean
}) {
    const {
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
    }

    const data = item.tipo === 'himno' ? item.himno : item.coro

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-4 p-4 md:p-5 bg-white dark:bg-zinc-800/50 border border-gray-200 dark:border-white/10 rounded-3xl shadow-sm transition-all group ${isDragging ? 'ring-2 ring-blue-500 bg-white dark:bg-zinc-800 shadow-2xl' : 'hover:border-blue-500/30 hover:shadow-md'
                }`}
        >
            {/* CONTENIDO CENTRAL (MAXIMIZADO) - SIN ICONO IZQUIERDO */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                {/* Título y Número - Segunda línea inteligente */}
                <h4 className="font-black text-[13px] md:text-base uppercase tracking-tight leading-snug text-gray-900 dark:text-white line-clamp-2 mb-1.5 break-words">
                    <span className="text-blue-600 dark:text-blue-400 mr-2 shrink-0">#{data?.numero}</span>
                    {data?.titulo}
                </h4>
                
                {/* Metadatos: Badge + Duración */}
                <div className="flex items-center gap-2 md:gap-3">
                    <span className={`text-[8px] md:text-[9px] uppercase font-black px-1.5 py-0.5 rounded-lg tracking-wider border shrink-0 ${item.tipo === 'himno'
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                        : 'bg-purple-500/10 border-purple-500/20 text-purple-600'
                        }`}>
                        {item.tipo === 'himno' ? 'Himno' : 'Coro'}
                    </span>
                    
                    <div className="flex items-center gap-1.5 text-[9px] md:text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest shrink-0">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span>{formatDuration(data?.duracion_segundos || 0)}</span>
                    </div>
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-2">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onMoveUp(item.id)
                        }}
                        disabled={isFirst}
                        title="Mover arriba"
                        className={`p-1.5 md:p-2 rounded-xl transition-all ${isFirst
                            ? 'opacity-10 cursor-not-allowed'
                            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-500/10 active:scale-90'
                            }`}
                    >
                        <ChevronUp className="w-5 h-5" />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onMoveDown(item.id)
                        }}
                        disabled={isLast}
                        title="Mover abajo"
                        className={`p-1.5 md:p-2 rounded-xl transition-all ${isLast
                            ? 'opacity-10 cursor-not-allowed'
                            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-500/10 active:scale-90'
                            }`}
                    >
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove(item.id)
                    }}
                    title="Eliminar"
                    className="p-2 md:p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110 active:scale-90"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </motion.div>
    )
}

export default function HimnoCoroSelector(props: HimnoCoroSelectorProps) {
    const {
        cultoId,
        cultoDate,
        maxHimnos = LIMITES.MAX_HIMNOS_POR_CULTO,
        maxCoros = LIMITES.MAX_COROS_POR_CULTO,
        className,
        tipoCulto
    } = props

    // Para cultos de Alabanza, seleccionamos Coros por defecto
    const [tipo, setTipo] = useState<'himno' | 'coro'>(
        tipoCulto?.toLowerCase().includes('alabanza') ? 'coro' : 'himno'
    )
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<(Himno | Coro)[]>([])
    const [selected, setSelected] = useState<PlanHimnoCoro[]>([])
    const [savedLists, setSavedLists] = useState<{ id: string, name: string, items: PlanHimnoCoro[] }[]>([])
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
    const [listName, setListName] = useState('')

    // Secuencia Automática
    const [isSequenceModalOpen, setIsSequenceModalOpen] = useState(false)
    const [isUpdatingSequence, setIsUpdatingSequence] = useState(false)
    const [pendingCoroId, setPendingCoroId] = useState<number | null>(null)
    /** Tipo del ítem recién añadido al abrir el modal (no la pestaña activa tras cambiar de tab). */
    const [pendingSequenceTipo, setPendingSequenceTipo] = useState<'himno' | 'coro' | null>(null)
    const [userProfile, setUserProfile] = useState<Profile | null>(null)

    const debouncedQuery = useDebounce(query, 300)

    // Configurar sensores para drag-and-drop con restricciones de activación para permitir clics
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px de tolerancia para distinguir clic de arrastre
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Ordenar selected por el campo 'orden' para mantener la secuencia definida por el usuario
    const sortedSelected = useMemo(() => {
        return [...selected].sort((a, b) => a.orden - b.orden)
    }, [selected])

    const isAlabanza = tipoCulto?.toLowerCase().includes('alabanza')
    const isEnsenanza = isTipoCultoEnsenanza(tipoCulto)

    /** En enseñanza: siempre himnos primero y coros después (orden relativo dentro de cada bloque). */
    const listForUi = useMemo(() => {
        if (!isEnsenanza) return sortedSelected
        return displayListEnsenanza(sortedSelected)
    }, [sortedSelected, isEnsenanza])

    const lastEnsenanzaNormalizeSigRef = useRef<string>('')

    const supabase = createClient()
    const [userId, setUserId] = useState<string | null>(null)

    // Fetch User Profile on mount
    useEffect(() => {
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUserId(user.id)
                // Obtener perfil para el rol
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()
                if (profile) setUserProfile(profile as Profile)
            }
        }
        getUser()
    }, [supabase.auth])

    // Cargar himnos/coros ya seleccionados si hay cultoId o de localStorage para calculadora
    useEffect(() => {
        async function loadData() {
            if (cultoId) {
                const { data } = await getHimnosCorosByCulto(cultoId)
                if (data) {
                    setSelected(data)
                }
            } else if (userId) {
                // Cargar listas guardadas de localStorage específicas del usuario
                const saved = localStorage.getItem(`idmji_saved_lists_${userId}`)
                if (saved) {
                    setSavedLists(JSON.parse(saved))
                } else {
                    setSavedLists([])
                }

                // Cargar sesión actual de calculadora del usuario
                const current = localStorage.getItem(`idmji_calc_session_${userId}`)
                if (current) {
                    const parsed = JSON.parse(current)
                    setSelected(parsed.sort((a: PlanHimnoCoro, b: PlanHimnoCoro) => a.orden - b.orden))
                } else {
                    setSelected([])
                }
            }
        }
        loadData()
    }, [cultoId, userId])

    useEffect(() => {
        lastEnsenanzaNormalizeSigRef.current = ''
    }, [cultoId])

    // Persistir orden global coherente (himnos → coros) si la BD tenía orden mezclado
    useEffect(() => {
        if (!cultoId || !isEnsenanza || selected.length === 0) return
        if (!needsEnsenanzaOrderNormalization(selected)) return

        const sig = [cultoId, ...selected.map((s) => `${String(s.id)}:${String(s.orden)}`)].join('|')
        if (lastEnsenanzaNormalizeSigRef.current === sig) return

        let cancelled = false
        ;(async () => {
            const updated = assignGlobalOrden(displayListEnsenanza(selected))
            const result = await updateHimnosCorosOrder(
                cultoId,
                updated.map((u) => ({ id: u.id, orden: u.orden }))
            )
            if (cancelled) return
            lastEnsenanzaNormalizeSigRef.current = sig
            if (!result.error) {
                setSelected(updated)
            } else {
                toast.error('No se pudo normalizar el orden de himnos/coros')
            }
        })()
        return () => {
            cancelled = true
        }
    }, [cultoId, isEnsenanza, selected])

    // Guardar sesión actual en cada cambio (modo calculadora)
    useEffect(() => {
        if (!cultoId && userId) {
            localStorage.setItem(`idmji_calc_session_${userId}`, JSON.stringify(sortedSelected))
        }
    }, [sortedSelected, cultoId, userId])

    // Buscar himnos/coros
    useEffect(() => {
        async function search() {
            if (debouncedQuery.length < 1) {
                setResults([])
                return
            }

            const searchFn = tipo === 'himno' ? searchHimnos : searchCoros
            const { data } = await searchFn(debouncedQuery)
            setResults(data || [])
        }
        search()
    }, [debouncedQuery, tipo])

    const himnosSelected = sortedSelected.filter(s => s.tipo === 'himno')
    const corosSelected = sortedSelected.filter(s => s.tipo === 'coro')

    const canAddHimno = himnosSelected.length < maxHimnos
    const canAddCoro = corosSelected.length < maxCoros

    const handleAdd = async (item: Himno | Coro) => {
        // Validación de duplicados
        if (sortedSelected.some(s => s.item_id === item.id && s.tipo === tipo)) {
            toast.error(`Este ${tipo} ya está en la lista`)
            return
        }

        if (tipo === 'himno' && !canAddHimno) {
            toast.error(`Máximo ${maxHimnos} himnos permitidos`)
            return
        }
        if (tipo === 'coro' && !canAddCoro) {
            toast.error(`Máximo ${maxCoros} coros permitidos`)
            return
        }

        if (cultoId) {
            // Modo Real: Guardar en DB
            // Calcular el orden global: simplemente al final de la lista actual
            const orden = selected.length > 0 ? Math.max(...selected.map(s => s.orden)) + 1 : 1

            const result = await addHimnoCoro(cultoId, tipo, item.id, orden)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`${tipo === 'himno' ? 'Himno' : 'Coro'} añadido`)
                
                // --- LÓGICA DE SECUENCIA AUTOMÁTICA (SOLO ADMIN) ---
                if (userProfile?.rol === 'ADMIN') {
                    if ((isAlabanza && tipo === 'coro') || (isEnsenanza)) {
                        setPendingSequenceTipo(tipo)
                        setPendingCoroId(item.id)
                        setIsSequenceModalOpen(true)
                    }
                }

                const { data } = await getHimnosCorosByCulto(cultoId)
                if (data) {
                    setSelected(data)
                }
                setQuery('')
                setResults([])
            }
        } else {
            // Modo Calculadora: Estado Local
            const orden = selected.length > 0 ? Math.max(...selected.map(s => s.orden)) + 1 : 1

            const newItem: PlanHimnoCoro = {
                id: crypto.randomUUID(), // Unique temp ID
                culto_id: 'temp',
                tipo,
                item_id: item.id,
                orden,
                [tipo === 'himno' ? 'himno' : 'coro']: item
            }
            setSelected([...selected, newItem])
            setQuery('')
            setResults([])
            toast.success('Añadido a la lista temporal')
        }
    }

    const handleRemove = async (planId: string) => {
        if (cultoId) {
            await removeHimnoCoro(planId, cultoId)
            const { data } = await getHimnosCorosByCulto(cultoId)
            if (data) {
                setSelected(data)
            }
        } else {
            setSelected(selected.filter(s => s.id !== planId))
        }
        toast.success(cultoId ? 'Eliminado del culto' : 'Eliminado de la lista')
    }

    const handleMoveUp = async (id: string) => {
        const list = listForUi
        const index = list.findIndex(item => item.id === id)
        if (index <= 0) return
        if (isEnsenanza && list[index - 1].tipo !== list[index].tipo) return

        const newSelected = arrayMove(list, index, index - 1)
        await updateOrder(newSelected)
    }

    const handleMoveDown = async (id: string) => {
        const list = listForUi
        const index = list.findIndex(item => item.id === id)
        if (index < 0 || index >= list.length - 1) return
        if (isEnsenanza && list[index + 1].tipo !== list[index].tipo) return

        const newSelected = arrayMove(list, index, index + 1)
        await updateOrder(newSelected)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const list = listForUi
            const oldIndex = list.findIndex(item => item.id === active.id)
            const newIndex = list.findIndex(item => item.id === over.id)
            if (oldIndex < 0 || newIndex < 0) return

            if (isEnsenanza && list[oldIndex].tipo !== list[newIndex].tipo) return

            const newSelected = arrayMove(list, oldIndex, newIndex)
            await updateOrder(newSelected)
        }
    }

    const updateOrder = async (newOrder: PlanHimnoCoro[]) => {
        // Recalcular los valores de orden basados en el nuevo índice de la lista completa
        const updated = newOrder.map((item, index) => ({
            ...item,
            orden: index + 1
        }))

        // Actualizar el estado local inmediatamente para feedback visual fluido
        setSelected(updated)

        if (cultoId) {
            // Actualizar en la base de datos
            const updates = updated.map(item => ({
                id: item.id,
                orden: item.orden
            }))

            const result = await updateHimnosCorosOrder(cultoId, updates)
            if (result.error) {
                toast.error('Error al actualizar el orden')
                // Revertir cargando desde DB si hay error
                const { data } = await getHimnosCorosByCulto(cultoId)
                if (data) {
                    setSelected(data)
                }
            } else {
                toast.success('Orden actualizado')
            }
        } else if (userId) {
            // Guardar en localStorage (modo calculadora)
            localStorage.setItem(`idmji_calc_session_${userId}`, JSON.stringify(updated))
        }
    }

    const handleSaveList = () => {
        if (sortedSelected.length === 0) {
            toast.error('La lista está vacía')
            return
        }
        if (savedLists.length >= 2) {
            toast.error('Límite de 2 listas alcanzado. Borra una para guardar otra.')
            return
        }
        setIsSaveModalOpen(true)
    }

    const confirmSaveList = () => {
        if (!listName.trim()) {
            toast.error('Ponle un nombre a la lista')
            return
        }
        if (!userId) {
            toast.error('Error de sesión. Recarga la página.')
            return
        }

        const newList = {
            id: Date.now().toString(),
            name: listName,
            items: [...sortedSelected]
        }
        const updated = [...savedLists, newList]
        setSavedLists(updated)
        localStorage.setItem(`idmji_saved_lists_${userId}`, JSON.stringify(updated))
        setListName('')
        setIsSaveModalOpen(false)
        toast.success('Lista guardada correctamente')
    }

    const loadList = (list: typeof savedLists[0]) => {
        const himnos = list.items.filter(s => s.tipo === 'himno').sort((a, b) => a.orden - b.orden)
        const coros = list.items.filter(s => s.tipo === 'coro').sort((a, b) => a.orden - b.orden)
        setSelected([...himnos, ...coros])
        toast.success(`Lista "${list.name}" cargada`)
    }

    const deleteSavedList = (id: string) => {
        if (!userId) return
        const updated = savedLists.filter(l => l.id !== id)
        setSavedLists(updated)
        localStorage.setItem(`idmji_saved_lists_${userId}`, JSON.stringify(updated))
        toast.success('Lista eliminada')
    }

    const clearCalculator = () => {
        setSelected([])
        toast.success('Calculadora vaciada')
    }

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleConfirmUpdateSequence = async () => {
        if (pendingCoroId != null) {
            setIsUpdatingSequence(true)
            try {
                const addedType = pendingSequenceTipo ?? tipo
                let key = ''
                if (isAlabanza && addedType === 'coro') key = 'ultimo_coro_id_alabanza'
                else if (isEnsenanza && addedType === 'himno') key = 'ultimo_himno_id_ensenanza'
                else if (isEnsenanza && addedType === 'coro') key = 'ultimo_coro_id_ensenanza'

                if (key) {
                    const result =
                        cultoId && tipoCulto && cultoDate
                            ? await replaceCultoPlanAfterSequenceConfirm(
                                  cultoId,
                                  key,
                                  pendingCoroId,
                                  cultoDate,
                                  tipoCulto
                              )
                            : await updateSequencePointer(key, pendingCoroId, cultoDate)

                    if (result.success) {
                        toast.success(
                            cultoId && tipoCulto && cultoDate
                                ? 'Secuencia actualizada: lista sustituida por la secuencia automática'
                                : 'Secuencia global actualizada'
                        )
                        if (cultoId) {
                            const { data } = await getHimnosCorosByCulto(cultoId)
                            if (data) setSelected(data)
                        }
                    } else {
                        toast.error('error' in result && result.error ? result.error : 'Error al actualizar secuencia')
                    }
                }
            } catch (error) {
                toast.error('Error de conexión')
            } finally {
                setIsUpdatingSequence(false)
                setIsSequenceModalOpen(false)
                setPendingCoroId(null)
                setPendingSequenceTipo(null)
            }
        }
    }

    const durationHimnos = himnosSelected.reduce((acc, curr) => acc + (curr.himno?.duracion_segundos || 0), 0)
    const durationCoros = corosSelected.reduce((acc, curr) => acc + (curr.coro?.duracion_segundos || 0), 0)
    const totalDuration = durationHimnos + durationCoros

    const sequenceTargetName = isEnsenanza ? 'Enseñanza' : 'Alabanza'
    const sequenceItemName = (pendingSequenceTipo ?? tipo) === 'himno' ? 'himno' : 'coro'

    const canMoveUpInList = (index: number) => {
        if (index <= 0) return false
        if (isEnsenanza && listForUi[index - 1].tipo !== listForUi[index].tipo) return false
        return true
    }
    const canMoveDownInList = (index: number) => {
        if (index >= listForUi.length - 1) return false
        if (isEnsenanza && listForUi[index + 1].tipo !== listForUi[index].tipo) return false
        return true
    }

    return (
        <div className={`space-y-3 md:space-y-5 ${className} overflow-hidden w-full`}>
            {/* Tipo Selector */}
            <div className="flex bg-gray-100 dark:bg-zinc-800 p-1.5 rounded-2xl w-full border border-gray-200 dark:border-zinc-700">
                <button
                    onClick={() => setTipo('himno')}
                    className={`flex-1 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tipo === 'himno'
                        ? 'bg-blue-600 text-white shadow-xl'
                        : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                        }`}
                >
                    Himnos ({himnosSelected.length}/{maxHimnos})
                </button>
                <button
                    onClick={() => setTipo('coro')}
                    className={`flex-1 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tipo === 'coro'
                        ? 'bg-blue-600 text-white shadow-xl'
                        : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                        }`}
                >
                    Coros ({corosSelected.length}/{maxCoros})
                </button>
            </div>

            {/* Total Time Badge - Stacked for sidebar */}
            <div className="grid grid-cols-3 gap-2 text-[8px] font-black uppercase tracking-wider">
                <div className="flex flex-col items-center justify-center gap-1 bg-blue-500/10 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 py-2.5 px-1 rounded-2xl border border-blue-500/20 dark:border-blue-400/20">
                    <span className="opacity-60">Himnos</span>
                    <span className="text-sm">{formatDuration(durationHimnos)}</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 bg-purple-500/10 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 py-2.5 px-1 rounded-2xl border border-purple-500/20 dark:border-purple-400/20">
                    <span className="opacity-60">Coros</span>
                    <span className="text-sm">{formatDuration(durationCoros)}</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 bg-emerald-500/10 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 py-2.5 px-1 rounded-2xl border border-emerald-500/20 dark:border-emerald-400/20">
                    <span className="opacity-60">Total</span>
                    <span className="text-sm font-black">{formatDuration(totalDuration)}</span>
                </div>
            </div>

            <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative bg-card border border-border rounded-2xl flex items-center px-5 h-14 shadow-sm focus-within:border-primary/50 transition-all">
                    <Search className="w-5 h-5 text-muted-foreground mr-4" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Buscar ${tipo === 'himno' ? 'por número o título' : 'en el catálogo'}...`}
                        className="w-full bg-transparent border-none outline-none text-sm font-black uppercase tracking-widest placeholder:text-muted-foreground text-foreground"
                        disabled={tipo === 'himno' ? !canAddHimno : !canAddCoro}
                    />
                </div>
            </div>

            {/* Live Results */}
            <AnimatePresence>
                {results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-1 bg-muted/30 dark:bg-white/5 p-2 rounded-2xl border border-border/50 dark:border-white/10 max-h-60 overflow-y-auto no-scrollbar"
                    >
                        {results.map((item, idx) => (
                            <div
                                key={item.id || `himno-coro-result-${idx}`}
                                className="flex items-center justify-between p-4 bg-card rounded-xl hover:bg-blue-500/10 transition-all group cursor-pointer border border-border/50 shadow-sm"
                                onClick={() => handleAdd(item)}
                            >
                                <div className="flex-1">
                                    <p className="font-black text-xs uppercase tracking-widest leading-none text-foreground group-hover:text-[#4A90E2] transition-colors">
                                        <span className="text-primary font-black mr-3 transition-colors group-hover:text-[#4A90E2]">#{item.numero}</span>
                                        {item.titulo}
                                    </p>
                                    {item.duracion_segundos && (
                                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-2 group-hover:text-[#4A90E2]/80 transition-colors">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(item.duracion_segundos)}
                                        </div>
                                    )}
                                </div>
                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white group-hover:scale-110 transition-all shrink-0 ml-4 shadow-md">
                                    <Plus className="w-4 h-4" />
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List Persistence Actions */}
            {!cultoId && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                        onClick={handleSaveList}
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                    >
                        Guardar Lista
                    </button>
                    <button
                        onClick={clearCalculator}
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 text-red-500 dark:text-red-400 font-black text-[10px] uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                    >
                        Limpiar Todo
                    </button>
                </div>
            )}

            {/* Saved Lists Storage */}
            {!cultoId && savedLists.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border/50">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-1">
                        Mis Listas Guardadas ({savedLists.length}/2)
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {savedLists.map((list, idx) => (
                            <div key={list.id || `saved-list-${idx}`} className="flex items-center justify-between p-3 bg-muted/30 dark:bg-white/5 rounded-2xl border border-border/50 dark:border-white/10 shadow-sm group hover:bg-muted/50 dark:hover:bg-white/10 transition-all cursor-pointer">
                                <div className="flex-1" onClick={() => loadList(list)}>
                                    <p className="text-xs font-black uppercase tracking-tight text-foreground truncate">
                                        {list.name}
                                    </p>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{list.items.length} elementos</p>
                                </div>
                                <button
                                    onClick={() => deleteSavedList(list.id)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Selected Playlist */}
            <div className="space-y-3 pt-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-1">
                    {cultoId ? 'Himnos y Coros del Culto' : 'Elementos en la calculadora'}
                </h3>
                {isEnsenanza && himnosSelected.length > 0 && corosSelected.length > 0 && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 leading-relaxed">
                        En culto de enseñanza se muestran primero los himnos y después los coros.
                    </p>
                )}

                <AnimatePresence mode='popLayout'>
                    {listForUi.length === 0 && (
                        <motion.div
                            key="empty-state"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-8 border-2 border-dashed border-border/50 rounded-2xl text-center text-muted-foreground bg-muted/5"
                        >
                            <Music className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-medium">No hay canciones seleccionadas</p>
                        </motion.div>
                    )}

                    <DndContext
                        key="content-list"
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={listForUi.map((item, idx) => item.id || `sortable-item-${idx}-${item.item_id || item.orden || idx}`)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {listForUi.map((item, index) => (
                                    <SortableItem
                                        key={item.id || `sortable-item-${index}-${item.item_id || item.orden || index}`}
                                        id={item.id || `sortable-item-${index}-${item.item_id || item.orden || index}`}
                                        item={item}
                                        onRemove={handleRemove}
                                        onMoveUp={handleMoveUp}
                                        onMoveDown={handleMoveDown}
                                        isFirst={!canMoveUpInList(index)}
                                        isLast={!canMoveDownInList(index)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </AnimatePresence>
            </div>

            {/* Save Modal */}
            <AnimatePresence>
                {isSaveModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
                            onClick={() => setIsSaveModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-700"
                        >
                            <h2 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white mb-2 uppercase italic text-center">Guardar Lista</h2>
                            <p className="text-[10px] font-black text-gray-500 dark:text-zinc-400 text-center mb-8 uppercase tracking-[0.2em]">Elige un nombre para tu selección</p>

                            <div className="relative mb-8">
                                <input
                                    type="text"
                                    value={listName}
                                    onChange={(e) => setListName(e.target.value)}
                                    placeholder="Nombre de la lista..."
                                    className="w-full h-14 bg-gray-100 dark:bg-zinc-800 rounded-2xl px-6 font-black uppercase text-xs tracking-widest border border-gray-200 dark:border-zinc-600 focus:border-blue-500 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setIsSaveModalOpen(false)}
                                    className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmSaveList}
                                    className="h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Sequence Modal */}
            <AnimatePresence>
                {isSequenceModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
                            onClick={() => {
                                setIsSequenceModalOpen(false)
                                setPendingCoroId(null)
                                setPendingSequenceTipo(null)
                            }}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-700 text-center"
                        >
                            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            
                            <h2 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white mb-4 uppercase italic">Actualizar Secuencia</h2>
                            <p className="text-sm font-bold text-gray-500 dark:text-zinc-400 mb-8 leading-relaxed">
                                ¿Deseas que los futuros cultos de {sequenceTargetName} sigan la secuencia automática a partir de este {sequenceItemName}?
                                {cultoId ? (
                                    <span className="block mt-3 text-xs font-semibold text-amber-700 dark:text-amber-400/90">
                                        {isEnsenanza
                                            ? `Solo se sustituyen los ${sequenceItemName === 'himno' ? 'himnos' : 'coros'} de este culto por la secuencia automática; la otra parte de la lista no se cambia.`
                                            : 'En este culto se quitarán los coros actuales y se pondrán los que marque la secuencia automática.'}
                                    </span>
                                ) : null}
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setIsSequenceModalOpen(false)
                                        setPendingCoroId(null)
                                        setPendingSequenceTipo(null)
                                    }}
                                    className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                                >
                                    No, solo este
                                </button>
                                <button
                                    onClick={handleConfirmUpdateSequence}
                                    disabled={isUpdatingSequence}
                                    className="h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isUpdatingSequence ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Actualizando...
                                        </>
                                    ) : (
                                        'Sí, actualizar'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    )
}
