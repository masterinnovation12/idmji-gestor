'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, Music, Clock } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { searchHimnos, searchCoros, addHimnoCoro, removeHimnoCoro, getHimnosCorosByCulto } from '@/app/dashboard/himnos/actions'
import { Himno, Coro, PlanHimnoCoro } from '@/types/database'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface HimnoCoroSelectorProps {
    cultoId?: string // Now optional for calculator mode
    maxHimnos?: number
    maxCoros?: number
    className?: string
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

    // Cargar himnos/coros ya seleccionados si hay cultoId o de localStorage para calculadora
    useEffect(() => {
        async function loadData() {
            if (cultoId) {
                const { data } = await getHimnosCorosByCulto(cultoId)
                if (data) setSelected(data)
            } else {
                // Cargar listas guardadas de localStorage
                const saved = localStorage.getItem('idmji_saved_lists')
                if (saved) setSavedLists(JSON.parse(saved))

                // Cargar sesión actual de calculadora
                const current = localStorage.getItem('idmji_calc_session')
                if (current) setSelected(JSON.parse(current))
            }
        }
        loadData()
    }, [cultoId])

    // Guardar sesión actual en cada cambio (modo calculadora)
    useEffect(() => {
        if (!cultoId) {
            localStorage.setItem('idmji_calc_session', JSON.stringify(selected))
        }
    }, [selected, cultoId])

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

    const himnosSelected = selected.filter(s => s.tipo === 'himno')
    const corosSelected = selected.filter(s => s.tipo === 'coro')

    const canAddHimno = himnosSelected.length < maxHimnos
    const canAddCoro = corosSelected.length < maxCoros

    const handleAdd = async (item: Himno | Coro) => {
        // Validación de duplicados
        if (selected.some(s => s.item_id === item.id && s.tipo === tipo)) {
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
            const orden = selected.filter(s => s.tipo === tipo).length + 1
            const result = await addHimnoCoro(cultoId, tipo, item.id, orden)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`${tipo === 'himno' ? 'Himno' : 'Coro'} añadido`)
                const { data } = await getHimnosCorosByCulto(cultoId)
                if (data) setSelected(data)
                setQuery('')
                setResults([])
            }
        } else {
            // Modo Calculadora: Estado Local
            const newItem: PlanHimnoCoro = {
                id: Math.random().toString(), // Temp ID
                culto_id: 'temp',
                tipo,
                item_id: item.id,
                orden: selected.filter(s => s.tipo === tipo).length + 1,
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
            if (data) setSelected(data)
        } else {
            setSelected(selected.filter(s => s.id !== planId))
        }
        toast.success(cultoId ? 'Eliminado del culto' : 'Eliminado de la lista')
    }

    const handleSaveList = () => {
        if (selected.length === 0) {
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
            items: [...selected]
        }
        const updated = [...savedLists, newList]
        setSavedLists(updated)
        localStorage.setItem('idmji_saved_lists', JSON.stringify(updated))
        setListName('')
        setIsSaveModalOpen(false)
        toast.success('Lista guardada correctamente')
    }

    const loadList = (list: typeof savedLists[0]) => {
        setSelected(list.items)
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
        <div className={`space-y-5 ${className} overflow-hidden`}>
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
                                className="flex items-center justify-between p-4 bg-card rounded-xl hover:bg-primary hover:text-white transition-all group cursor-pointer border border-border/50 shadow-sm"
                                onClick={() => handleAdd(item)}
                            >
                                <div className="flex-1">
                                    <p className="font-black text-xs uppercase tracking-widest leading-none text-foreground group-hover:text-white">
                                        <span className="text-primary group-hover:text-white font-black mr-3">#{item.numero}</span>
                                        {item.titulo}
                                    </p>
                                    {item.duracion_segundos && (
                                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-2 group-hover:text-white/70">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(item.duracion_segundos)}
                                        </div>
                                    )}
                                </div>
                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white group-hover:bg-white group-hover:text-blue-600 transition-all shrink-0 ml-4 shadow-md">
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
                    Elementos en la calculadora
                </h3>

                <AnimatePresence mode='popLayout'>
                    {selected.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-8 border-2 border-dashed border-border/50 rounded-2xl text-center text-muted-foreground bg-muted/5"
                        >
                            <Music className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-medium">No hay canciones seleccionadas</p>
                        </motion.div>
                    )}

                    {selected.map((item) => {
                        const data = item.tipo === 'himno' ? item.himno : item.coro
                        return (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex items-center justify-between p-4 bg-muted/30 dark:bg-white/5 border border-border/50 dark:border-white/10 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner shrink-0 ${item.tipo === 'himno'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-purple-500 text-white'
                                        }`}>
                                        {item.tipo === 'himno' ? 'H' : 'C'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-xs uppercase tracking-tight leading-snug text-foreground truncate">
                                            #{data?.numero} <span className="text-muted-foreground mx-1">|</span> {data?.titulo}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className={`text-[8px] uppercase font-black px-2 py-0.5 rounded-full tracking-tighter ${item.tipo === 'himno' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                                                }`}>
                                                {item.tipo}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground font-black flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {formatDuration(data?.duracion_segundos || 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(item.id)}
                                    className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all sm:opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                                >
                                    <Trash2 className="w-4.5 h-4.5" />
                                </button>
                            </motion.div>
                        )
                    })}
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
