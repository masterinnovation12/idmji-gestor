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
            <div className="flex bg-[#063b7a]/5 dark:bg-white/5 p-1.5 rounded-2xl w-full border border-[#063b7a]/10 dark:border-white/10">
                <button
                    onClick={() => setTipo('himno')}
                    className={`flex-1 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tipo === 'himno'
                        ? 'bg-[#063b7a] dark:bg-primary text-white shadow-xl'
                        : 'text-[#063b7a] dark:text-white/60 hover:bg-[#063b7a]/5 dark:hover:bg-white/5'
                        }`}
                >
                    Himnos ({himnosSelected.length}/{maxHimnos})
                </button>
                <button
                    onClick={() => setTipo('coro')}
                    className={`flex-1 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tipo === 'coro'
                        ? 'bg-[#063b7a] dark:bg-primary text-white shadow-xl'
                        : 'text-[#063b7a] dark:text-white/60 hover:bg-[#063b7a]/5 dark:hover:bg-white/5'
                        }`}
                >
                    Coros ({corosSelected.length}/{maxCoros})
                </button>
            </div>

            {/* Total Time Badge - Stacked for sidebar */}
            <div className="grid grid-cols-3 gap-2 text-[9px] font-black uppercase tracking-widest">
                <div className="flex flex-col items-center justify-center gap-1 bg-blue-500/10 dark:bg-blue-500/20 text-[#063b7a] dark:text-blue-300 py-3 rounded-2xl border border-blue-500/10">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>H: {formatDuration(durationHimnos)}</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 bg-accent/10 dark:bg-accent/20 text-[#063b7a] dark:text-accent py-3 rounded-2xl border border-accent/10">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    <span>C: {formatDuration(durationCoros)}</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 bg-primary/10 dark:bg-primary/20 text-primary py-3 rounded-2xl border border-primary/10">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(totalDuration)}</span>
                </div>
            </div>

            <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative bg-[#063b7a]/5 dark:bg-white/5 border border-[#063b7a]/10 dark:border-white/10 rounded-2xl flex items-center px-5 h-14 shadow-inner focus-within:border-primary/50 transition-all">
                    <Search className="w-5 h-5 text-[#063b7a]/50 dark:text-white/40 mr-4" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Buscar ${tipo === 'himno' ? 'por número o título' : 'en el catálogo'}...`}
                        className="w-full bg-transparent border-none outline-none text-sm font-black uppercase tracking-widest placeholder:text-[#063b7a]/30 dark:placeholder:text-white/20 text-[#063b7a] dark:text-white"
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
                        className="space-y-1 bg-[#063b7a]/5 dark:bg-white/5 p-2 rounded-2xl border border-[#063b7a]/10 dark:border-white/10 max-h-60 overflow-y-auto no-scrollbar"
                    >
                        {results.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-4 bg-white/50 dark:bg-white/5 rounded-xl hover:bg-[#063b7a] hover:text-white transition-all group cursor-pointer border border-transparent shadow-sm"
                                onClick={() => handleAdd(item)}
                            >
                                <div className="flex-1">
                                    <p className="font-black text-xs uppercase tracking-widest leading-none">
                                        <span className="text-primary group-hover:text-white font-black mr-3">#{item.numero}</span>
                                        {item.titulo}
                                    </p>
                                    {item.duracion_segundos && (
                                        <div className="flex items-center gap-1.5 text-[9px] text-[#063b7a]/40 dark:text-white/40 font-black uppercase tracking-widest mt-2 group-hover:text-white/70">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(item.duracion_segundos)}
                                        </div>
                                    )}
                                </div>
                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-white group-hover:text-[#063b7a] transition-all shrink-0 ml-4">
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
                        className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#063b7a] text-white font-black text-[10px] uppercase tracking-widest shadow-lg hover:shadow-[#063b7a]/20 transition-all hover:-translate-y-0.5"
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
                <div className="space-y-3 pt-4 border-t border-[#063b7a]/10 dark:border-white/10">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#063b7a]/40 dark:text-white/40 pl-1">
                        Mis Listas Guardadas ({savedLists.length}/2)
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                        {savedLists.map((list) => (
                            <div key={list.id} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 rounded-2xl border border-[#063b7a]/5 dark:border-white/10 shadow-sm group">
                                <div className="cursor-pointer flex-1" onClick={() => loadList(list)}>
                                    <p className="text-xs font-black uppercase tracking-tight text-[#063b7a] dark:text-white truncate">
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
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#063b7a]/40 dark:text-white/40 pl-1">
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
                                className="flex items-center justify-between p-4 bg-white dark:bg-[#063b7a]/10 border border-[#063b7a]/10 dark:border-white/10 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner shrink-0 ${item.tipo === 'himno'
                                        ? 'bg-blue-500/10 text-[#0660c6] dark:text-blue-400'
                                        : 'bg-accent/10 text-accent'
                                        }`}>
                                        {item.tipo === 'himno' ? 'H' : 'C'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-xs uppercase tracking-tight leading-snug text-[#063b7a] dark:text-white truncate">
                                            #{data?.numero} <span className="text-[#063b7a]/20 dark:text-white/20 mx-1">|</span> {data?.titulo}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className={`text-[8px] uppercase font-black px-2 py-0.5 rounded-full tracking-tighter ${item.tipo === 'himno' ? 'bg-blue-500 text-white' : 'bg-accent text-white'
                                                }`}>
                                                {item.tipo}
                                            </span>
                                            <span className="text-[9px] text-[#063b7a]/50 dark:text-white/50 font-black flex items-center gap-1.5">
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
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                            onClick={() => setIsSaveModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-white dark:bg-[#0a0a0a] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/10"
                        >
                            <h2 className="text-2xl font-black tracking-tighter text-[#063b7a] dark:text-white mb-2 uppercase italic text-center">Guardar Lista</h2>
                            <p className="text-xs font-bold text-muted-foreground text-center mb-8 uppercase tracking-widest">Elige un nombre para tu selección</p>

                            <div className="relative mb-8">
                                <input
                                    type="text"
                                    value={listName}
                                    onChange={(e) => setListName(e.target.value)}
                                    placeholder="Nombre de la lista..."
                                    className="w-full h-14 bg-[#063b7a]/5 dark:bg-white/5 rounded-2xl px-6 font-black uppercase text-xs tracking-widest border border-transparent focus:border-primary outline-none"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setIsSaveModalOpen(false)}
                                    className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-[#063b7a]/5 dark:bg-white/5 border border-[#063b7a]/20 dark:border-white/20 text-[#063b7a] dark:text-white hover:bg-[#063b7a]/10 dark:hover:bg-white/10 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmSaveList}
                                    className="h-12 bg-[#063b7a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#063b7a]/30 hover:shadow-[#063b7a]/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
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
