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

    const debouncedQuery = useDebounce(query, 300)

    // Cargar himnos/coros ya seleccionados si hay cultoId
    useEffect(() => {
        async function loadSelected() {
            if (!cultoId) return
            const { data } = await getHimnosCorosByCulto(cultoId)
            if (data) setSelected(data)
        }
        loadSelected()
    }, [cultoId])

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
        toast.success('Eliminado de la lista')
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
        <div className={`space-y-6 ${className}`}>
            {/* Tipo Selector & Stats */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex bg-muted p-1 rounded-2xl w-full sm:w-auto">
                    <button
                        onClick={() => setTipo('himno')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-xl font-bold text-sm transition-all ${tipo === 'himno'
                            ? 'bg-background text-primary shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Himnos ({himnosSelected.length}/{maxHimnos})
                    </button>
                    <button
                        onClick={() => setTipo('coro')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-xl font-bold text-sm transition-all ${tipo === 'coro'
                            ? 'bg-background text-primary shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Coros ({corosSelected.length}/{maxCoros})
                    </button>
                </div>

                {/* Total Time Badge */}
                <div className="flex items-center gap-4 ml-auto text-xs font-black uppercase tracking-wider bg-muted/30 px-4 py-2 rounded-xl border border-border/50">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        Himnos: {formatDuration(durationHimnos)}
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent" />
                        Coros: {formatDuration(durationCoros)}
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="text-primary flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Total: {formatDuration(totalDuration)}
                    </div>
                </div>
            </div>

            {/* Search Input */}
            <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative bg-background border border-border rounded-xl flex items-center px-4 h-12 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                    <Search className="w-4 h-4 text-muted-foreground mr-3" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Buscar ${tipo}...`}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder:text-muted-foreground/50"
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
                        className="space-y-2 bg-muted/20 p-2 rounded-2xl border border-border/50"
                    >
                        {results.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 bg-background rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer border border-transparent hover:border-border"
                                onClick={() => handleAdd(item)}
                            >
                                <div className="flex-1">
                                    <p className="font-bold text-sm">
                                        <span className="text-primary opacity-70 mr-2">#{item.numero}</span>
                                        {item.titulo}
                                    </p>
                                    {item.duracion_segundos && (
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(item.duracion_segundos)}
                                        </div>
                                    )}
                                </div>
                                <button className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Selected Playlist */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-1">
                    Lista de Selección
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
                                className="flex items-center justify-between p-3 bg-card border border-border/50 rounded-xl shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs ${item.tipo === 'himno'
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-accent/10 text-accent'
                                        }`}>
                                        {item.tipo === 'himno' ? 'H' : 'C'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm leading-tight">
                                            #{data?.numero} <span className="text-muted-foreground font-normal mx-1">|</span> {data?.titulo}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.tipo === 'himno' ? 'bg-primary/5 text-primary' : 'bg-accent/5 text-accent'
                                                }`}>
                                                {item.tipo}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDuration(data?.duracion_segundos || 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(item.id)}
                                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>
        </div>
    )
}
