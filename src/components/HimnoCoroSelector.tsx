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

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Trash2, Music, Clock, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { searchHimnos, searchCoros, addHimnoCoro, removeHimnoCoro, getHimnosCorosByCulto, updateHimnosCorosOrder } from '@/app/dashboard/himnos/actions'
import { Himno, Coro, PlanHimnoCoro } from '@/types/database'
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

interface HimnoCoroSelectorProps {
    cultoId?: string // Now optional for calculator mode
    maxHimnos?: number
    maxCoros?: number
    className?: string
}

/**
 * Componente sortable individual para cada item
 */
function SortableItem({ item, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: {
    item: PlanHimnoCoro
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
    } = useSortable({ id: item.id })

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
            className={`flex items-center justify-between p-3 md:p-4 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-white/10 rounded-2xl shadow-sm transition-all group ${
                isDragging ? 'ring-2 ring-primary bg-background shadow-xl' : ''
            }`}
        >
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-xs md:text-sm shadow-inner shrink-0 ${item.tipo === 'himno'
                    ? 'bg-blue-500 text-white'
                    : 'bg-purple-500 text-white'
                    }`}>
                    {item.tipo === 'himno' ? 'H' : 'C'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-[11px] md:text-xs uppercase tracking-tight leading-tight text-foreground break-words whitespace-normal">
                        #{data?.numero} <span className="text-muted-foreground mx-1">|</span> {data?.titulo}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className={`text-[7px] md:text-[8px] uppercase font-black px-2 py-0.5 rounded-full tracking-tighter ${item.tipo === 'himno' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                            }`}>
                            {item.tipo}
                        </span>
                        <span className="text-[8px] md:text-[9px] text-muted-foreground font-black flex items-center gap-1.5">
                            <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            {formatDuration(data?.duracion_segundos || 0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-0.5 md:gap-1 shrink-0 ml-2">
                <button
                    onClick={() => onMoveUp(item.id)}
                    disabled={isFirst}
                    className={`p-1.5 md:p-2 rounded-lg transition-all ${
                        isFirst
                            ? 'opacity-20 cursor-not-allowed'
                            : 'text-primary hover:bg-primary/10 active:scale-90'
                    }`}
                >
                    <ChevronUp className="w-4 h-4" />
                </button>

                <button
                    onClick={() => onMoveDown(item.id)}
                    disabled={isLast}
                    className={`p-1.5 md:p-2 rounded-lg transition-all ${
                        isLast
                            ? 'opacity-20 cursor-not-allowed'
                            : 'text-primary hover:bg-primary/10 active:scale-90'
                    }`}
                >
                    <ChevronDown className="w-4 h-4" />
                </button>

                <button
                    onClick={() => onRemove(item.id)}
                    className="p-1.5 md:p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    )
}

export default function HimnoCoroSelector({
    cultoId,
    maxHimnos = 3,
    maxCoros = 3,
    className
}: HimnoCoroSelectorProps) {
    const [tipo, setTipo] = useState<'himno' | 'coro'>('himno')
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<(Himno | Coro)[]>([])
    const [selected, setSelected] = useState<PlanHimnoCoro[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [savedLists, setSavedLists] = useState<{ id: string, name: string, items: PlanHimnoCoro[] }[]>([])
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
    const [listName, setListName] = useState('')

    const debouncedQuery = useDebounce(query, 300)

    // Configurar sensores para drag-and-drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Ordenar selected: primero himnos, luego coros, manteniendo el orden dentro de cada tipo
    const sortedSelected = useMemo(() => {
        const himnos = selected.filter(s => s.tipo === 'himno').sort((a, b) => a.orden - b.orden)
        const coros = selected.filter(s => s.tipo === 'coro').sort((a, b) => a.orden - b.orden)
        return [...himnos, ...coros]
    }, [selected])

    // Cargar himnos/coros ya seleccionados si hay cultoId o de localStorage para calculadora
    useEffect(() => {
        async function loadData() {
            if (cultoId) {
                const { data } = await getHimnosCorosByCulto(cultoId)
                if (data) {
                    // Asegurar que el orden esté correcto: primero himnos, luego coros
                    const himnos = data.filter(s => s.tipo === 'himno').sort((a, b) => a.orden - b.orden)
                    const coros = data.filter(s => s.tipo === 'coro').sort((a, b) => a.orden - b.orden)
                    setSelected([...himnos, ...coros])
                }
            } else {
                // Cargar listas guardadas de localStorage
                const saved = localStorage.getItem('idmji_saved_lists')
                if (saved) setSavedLists(JSON.parse(saved))

                // Cargar sesión actual de calculadora
                const current = localStorage.getItem('idmji_calc_session')
                if (current) {
                    const parsed = JSON.parse(current)
                    // Asegurar ordenamiento
                    const himnos = parsed.filter((s: PlanHimnoCoro) => s.tipo === 'himno').sort((a: PlanHimnoCoro, b: PlanHimnoCoro) => a.orden - b.orden)
                    const coros = parsed.filter((s: PlanHimnoCoro) => s.tipo === 'coro').sort((a: PlanHimnoCoro, b: PlanHimnoCoro) => a.orden - b.orden)
                    setSelected([...himnos, ...coros])
                }
            }
        }
        loadData()
    }, [cultoId])

    // Guardar sesión actual en cada cambio (modo calculadora)
    useEffect(() => {
        if (!cultoId) {
            localStorage.setItem('idmji_calc_session', JSON.stringify(sortedSelected))
        }
    }, [sortedSelected, cultoId])

    // Buscar himnos/coros
    useEffect(() => {
        async function search() {
            if (debouncedQuery.length < 1) {
                setResults([])
                return
            }

            setIsSearching(true)
            const searchFn = tipo === 'himno' ? searchHimnos : searchCoros
            const { data } = await searchFn(debouncedQuery)
            setResults(data || [])
            setIsSearching(false)
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
            // Calcular el orden: si es himno, va después del último himno; si es coro, va después del último coro
            const lastOfType = sortedSelected.filter(s => s.tipo === tipo)
            const orden = lastOfType.length > 0 ? Math.max(...lastOfType.map(s => s.orden)) + 1 : 1

            const result = await addHimnoCoro(cultoId, tipo, item.id, orden)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`${tipo === 'himno' ? 'Himno' : 'Coro'} añadido`)
                const { data } = await getHimnosCorosByCulto(cultoId)
                if (data) {
                    const himnos = data.filter(s => s.tipo === 'himno').sort((a, b) => a.orden - b.orden)
                    const coros = data.filter(s => s.tipo === 'coro').sort((a, b) => a.orden - b.orden)
                    setSelected([...himnos, ...coros])
                }
                setQuery('')
                setResults([])
            }
        } else {
            // Modo Calculadora: Estado Local
            const lastOfType = sortedSelected.filter(s => s.tipo === tipo)
            const orden = lastOfType.length > 0 ? Math.max(...lastOfType.map(s => s.orden)) + 1 : 1

            const newItem: PlanHimnoCoro = {
                id: Math.random().toString(), // Temp ID
                culto_id: 'temp',
                tipo,
                item_id: item.id,
                orden,
                [tipo === 'himno' ? 'himno' : 'coro']: item
            }
            setSelected([...sortedSelected, newItem])
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
                const himnos = data.filter(s => s.tipo === 'himno').sort((a, b) => a.orden - b.orden)
                const coros = data.filter(s => s.tipo === 'coro').sort((a, b) => a.orden - b.orden)
                setSelected([...himnos, ...coros])
            }
        } else {
            setSelected(sortedSelected.filter(s => s.id !== planId))
        }
        toast.success(cultoId ? 'Eliminado del culto' : 'Eliminado de la lista')
    }

    const handleMoveUp = async (id: string) => {
        const index = sortedSelected.findIndex(item => item.id === id)
        if (index <= 0) return

        const newSelected = arrayMove(sortedSelected, index, index - 1)
        await updateOrder(newSelected)
    }

    const handleMoveDown = async (id: string) => {
        const index = sortedSelected.findIndex(item => item.id === id)
        if (index < 0 || index >= sortedSelected.length - 1) return

        const newSelected = arrayMove(sortedSelected, index, index + 1)
        await updateOrder(newSelected)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = sortedSelected.findIndex(item => item.id === active.id)
            const newIndex = sortedSelected.findIndex(item => item.id === over.id)

            const newSelected = arrayMove(sortedSelected, oldIndex, newIndex)
            await updateOrder(newSelected)
        }
    }

    const updateOrder = async (newOrder: PlanHimnoCoro[]) => {
        // Actualizar los valores de orden
        const updated = newOrder.map((item, index) => ({
            ...item,
            orden: index + 1
        }))

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
                // Recargar desde la base de datos
                const { data } = await getHimnosCorosByCulto(cultoId)
                if (data) {
                    const himnos = data.filter(s => s.tipo === 'himno').sort((a, b) => a.orden - b.orden)
                    const coros = data.filter(s => s.tipo === 'coro').sort((a, b) => a.orden - b.orden)
                    setSelected([...himnos, ...coros])
                }
            } else {
                toast.success('Orden actualizado')
            }
        } else {
            // Guardar en localStorage
            localStorage.setItem('idmji_calc_session', JSON.stringify(updated))
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
        const newList = {
            id: Date.now().toString(),
            name: listName,
            items: [...sortedSelected]
        }
        const updated = [...savedLists, newList]
        setSavedLists(updated)
        localStorage.setItem('idmji_saved_lists', JSON.stringify(updated))
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
        const updated = savedLists.filter(l => l.id !== id)
        setSavedLists(updated)
        localStorage.setItem('idmji_saved_lists', JSON.stringify(updated))
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

    const durationHimnos = himnosSelected.reduce((acc, curr) => acc + (curr.himno?.duracion_segundos || 0), 0)
    const durationCoros = corosSelected.reduce((acc, curr) => acc + (curr.coro?.duracion_segundos || 0), 0)
    const totalDuration = durationHimnos + durationCoros

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
                        {results.map((item) => (
                            <div
                                key={item.id}
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
                        {savedLists.map((list) => (
                            <div key={list.id} className="flex items-center justify-between p-3 bg-muted/30 dark:bg-white/5 rounded-2xl border border-border/50 dark:border-white/10 shadow-sm group hover:bg-muted/50 dark:hover:bg-white/10 transition-all cursor-pointer">
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

                <AnimatePresence mode='popLayout'>
                    {sortedSelected.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-8 border-2 border-dashed border-border/50 rounded-2xl text-center text-muted-foreground bg-muted/5"
                        >
                            <Music className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-medium">No hay canciones seleccionadas</p>
                        </motion.div>
                    )}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sortedSelected.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {sortedSelected.map((item, index) => (
                                    <SortableItem
                                        key={item.id}
                                        item={item}
                                        onRemove={handleRemove}
                                        onMoveUp={handleMoveUp}
                                        onMoveDown={handleMoveDown}
                                        isFirst={index === 0}
                                        isLast={index === sortedSelected.length - 1}
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
        </div >
    )
}
