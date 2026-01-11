'use client'

import { useState, useEffect, useRef, useSyncExternalStore, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, BookOpen, AlertCircle, X, ArrowLeft, Check, Command } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getBibliaLibros } from '@/app/dashboard/lecturas/actions'
import { cn } from '@/lib/utils'

interface Chapter {
    n: number
    v: number
}

interface BibleBook {
    id: number
    nombre: string
    abreviatura: string
    testamento: string
    capitulos: Chapter[]
}

interface BibleSelectorProps {
    onSelect: (libro: string, capInicio: number, versInicio: number, capFin?: number, versFin?: number) => void
    disabled?: boolean
}

// Helper for detecting mounted state without setState in useEffect
function subscribeToNothing() {
    return () => { }
}
function getMountedSnapshot() {
    return true
}
function getMountedServerSnapshot() {
    return false
}

export default function BibleSelector({ onSelect, disabled }: BibleSelectorProps) {
    const [id] = useState(() => Math.random().toString(36).substring(2, 9))
    const [libros, setLibros] = useState<BibleBook[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedLibroObj, setSelectedLibroObj] = useState<BibleBook | null>(null)
    const [capituloInicio, setCapituloInicio] = useState<number | ''>('')
    const [versiculoInicio, setVersiculoInicio] = useState<number | ''>('')
    const [versiculoFin, setVersiculoFin] = useState<number | ''>('')

    // UI States
    const [isOpen, setIsOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Positioning
    const [dropdownRect, setDropdownRect] = useState<{ top: number, left: number, width: number } | null>(null)
    const mounted = useSyncExternalStore(subscribeToNothing, getMountedSnapshot, getMountedServerSnapshot)

    // Refs
    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    // Validation logic derived from state
    const validationError = useMemo(() => {
        if (!selectedLibroObj) return null

        if (capituloInicio !== '') {
            const maxCaps = selectedLibroObj.capitulos.length
            if (capituloInicio > maxCaps) {
                return `El libro ${selectedLibroObj.nombre} solo tiene ${maxCaps} capítulos.`
            }

            const maxVers = (() => {
                const cap = selectedLibroObj.capitulos.find(c => c.n === Number(capituloInicio))
                return cap ? cap.v : 0
            })()

            if (versiculoInicio !== '' && Number(versiculoInicio) > maxVers) {
                return `El capítulo ${capituloInicio} de ${selectedLibroObj.nombre} solo tiene ${maxVers} versículos.`
            }
            if (versiculoFin !== '' && Number(versiculoFin) > maxVers) {
                return `El capítulo ${capituloInicio} de ${selectedLibroObj.nombre} solo tiene ${maxVers} versículos.`
            }
            if (versiculoInicio !== '' && versiculoFin !== '' && Number(versiculoFin) < Number(versiculoInicio)) {
                return `El versículo de fin no puede ser menor al de inicio.`
            }
        }

        return null
    }, [selectedLibroObj, capituloInicio, versiculoInicio, versiculoFin])

    const [submitError, setSubmitError] = useState<string | null>(null)
    const error = validationError || submitError

    // Detect Mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // If clicking inside the portal dropdown, ignore
            if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
                return;
            }
            // If clicking inside input, ignore
            if (inputRef.current && inputRef.current.contains(event.target as Node)) {
                return;
            }
            setIsOpen(false)
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isOpen])

    // Robust Positioning Logic (Runs on every render when open to catch layout shifts)
    const updatePosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect()
            console.log("BibleSelector: Calc Position:", rect.top, rect.left, rect.width)
            setDropdownRect({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            })
        }
    }

    // DEBUG: Monitor rendering conditions
    console.log("BibleSelector Render: ", { mounted, isMobile, isOpen, rect: dropdownRect ? 'VALID' : 'NULL', books: libros.length })


    useLayoutEffect(() => {
        if (isOpen && !isMobile) {
            updatePosition()
            // Also listen to events
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
            return () => {
                window.removeEventListener('scroll', updatePosition, true)
                window.removeEventListener('resize', updatePosition)
            }
        }
    }, [isOpen, isMobile, searchQuery])

    // Load Books with Robust Fallback
    useEffect(() => {
        async function loadLibros() {
            try {
                console.log("BibleSelector: Attempting to load books...")
                const { data, error } = await getBibliaLibros()

                if (data && data.length > 0) {
                    console.log("BibleSelector: Successfully loaded", data.length, "books from DB")
                    setLibros(data)
                } else {
                    console.warn("BibleSelector: Failed to load from DB or empty. Using Fallback Data.", error)

                    // Fallback Data to ensure UI works (Simplified Verses)
                    const FALLBACK_BOOKS: BibleBook[] = [
                        { id: 1, nombre: "Génesis", abreviatura: "Gn", testamento: "AT", capitulos: Array.from({ length: 50 }, (_, i) => ({ n: i + 1, v: 31 })) },
                        { id: 2, nombre: "Éxodo", abreviatura: "Ex", testamento: "AT", capitulos: Array.from({ length: 40 }, (_, i) => ({ n: i + 1, v: 31 })) },
                        { id: 19, nombre: "Salmos", abreviatura: "Sal", testamento: "AT", capitulos: Array.from({ length: 150 }, (_, i) => ({ n: i + 1, v: 20 })) },
                        { id: 20, nombre: "Proverbios", abreviatura: "Pr", testamento: "AT", capitulos: Array.from({ length: 31 }, (_, i) => ({ n: i + 1, v: 33 })) },
                        { id: 40, nombre: "Mateo", abreviatura: "Mt", testamento: "NT", capitulos: Array.from({ length: 28 }, (_, i) => ({ n: i + 1, v: 31 })) },
                        { id: 41, nombre: "Marcos", abreviatura: "Mc", testamento: "NT", capitulos: Array.from({ length: 16 }, (_, i) => ({ n: i + 1, v: 20 })) },
                        { id: 42, nombre: "Lucas", abreviatura: "Lc", testamento: "NT", capitulos: Array.from({ length: 24 }, (_, i) => ({ n: i + 1, v: 53 })) },
                        { id: 43, nombre: "Juan", abreviatura: "Jn", testamento: "NT", capitulos: Array.from({ length: 21 }, (_, i) => ({ n: i + 1, v: 31 })) },
                        { id: 44, nombre: "Hechos", abreviatura: "Hch", testamento: "NT", capitulos: Array.from({ length: 28 }, (_, i) => ({ n: i + 1, v: 31 })) },
                        { id: 45, nombre: "Romanos", abreviatura: "Ro", testamento: "NT", capitulos: Array.from({ length: 16 }, (_, i) => ({ n: i + 1, v: 27 })) },
                        { id: 66, nombre: "Apocalipsis", abreviatura: "Ap", testamento: "NT", capitulos: Array.from({ length: 22 }, (_, i) => ({ n: i + 1, v: 21 })) }
                    ]
                    setLibros(FALLBACK_BOOKS)
                }
            } catch (e) {
                console.error("BibleSelector: Exception loading books", e)
            }
        }
        loadLibros()
    }, [])

    // Scroll lock for mobile
    useEffect(() => {
        if (isOpen && isMobile) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen, isMobile])

    // Search Filtering
    const filteredLibros = useMemo(() => {
        const terms = searchQuery.toLowerCase().split(/\s+/)
        return libros.filter(libro => {
            const name = libro.nombre.toLowerCase()
            const abbr = libro.abreviatura.toLowerCase()
            return terms.every(term => name.includes(term) || abbr.includes(term))
        })
    }, [libros, searchQuery])

    // Grouping
    const groupedLibros = useMemo(() => {
        return {
            AT: filteredLibros.filter(l => l.testamento === 'AT'),
            NT: filteredLibros.filter(l => l.testamento === 'NT')
        }
    }, [filteredLibros])

    // Keyboard Navigation
    useEffect(() => {
        setSelectedIndex(0)
    }, [searchQuery])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true)
                e.preventDefault()
            }
            return
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(prev => Math.min(prev + 1, filteredLibros.length - 1))
                // Auto-scroll
                scrollSelectedIntoView(selectedIndex + 1)
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex(prev => Math.max(prev - 1, 0))
                scrollSelectedIntoView(selectedIndex - 1)
                break
            case 'Enter':
                e.preventDefault()
                if (filteredLibros[selectedIndex]) {
                    handleSelectLibro(filteredLibros[selectedIndex])
                }
                break
            case 'Escape':
                setIsOpen(false)
                inputRef.current?.blur()
                break
            case 'Tab':
                setIsOpen(false)
                break
        }
    }

    const scrollSelectedIntoView = (index: number) => {
        // Simple heuristic: if we have a ref to the list container
        // we can scroll. For now, rely on standard behavior or add refs to items if needed.
    }

    const handleSelectLibro = (libro: BibleBook) => {
        setSelectedLibroObj(libro)
        setSearchQuery(libro.nombre)
        setCapituloInicio('')
        setVersiculoInicio('')
        setVersiculoFin('')
        setSubmitError(null)
        setIsOpen(false)
    }

    const getMaxChapters = () => selectedLibroObj ? selectedLibroObj.capitulos.length : 0
    const getMaxVerses = (capNum: number | '') => {
        if (!selectedLibroObj || capNum === '') return 0
        const cap = selectedLibroObj.capitulos.find(c => c.n === capNum)
        return cap ? cap.v : 0
    }

    const handleSubmit = () => {
        if (!selectedLibroObj || !capituloInicio || !versiculoInicio) {
            setSubmitError("Por favor, selecciona un libro, capítulo y versículo.")
            return
        }

        if (validationError) return

        const maxCaps = getMaxChapters()
        if (capituloInicio > maxCaps) {
            setSubmitError(`El libro ${selectedLibroObj.nombre} solo tiene ${maxCaps} capítulos.`)
            return
        }

        const maxVers = getMaxVerses(Number(capituloInicio))
        if (versiculoInicio > maxVers) {
            setSubmitError(`El capítulo ${capituloInicio} de ${selectedLibroObj.nombre} solo tiene ${maxVers} versículos.`)
            return
        }

        setSubmitError(null)
        onSelect(
            selectedLibroObj.nombre,
            Number(capituloInicio),
            Number(versiculoInicio),
            Number(capituloInicio),
            versiculoFin ? Number(versiculoFin) : undefined
        )
    }

    // Render Items Helper
    const renderBookItem = (libro: BibleBook, idx: number, globalIdx: number) => {
        const isSelected = globalIdx === selectedIndex
        return (
            <button
                key={libro.id}
                onClick={() => handleSelectLibro(libro)}
                onMouseEnter={() => setSelectedIndex(globalIdx)}
                className={cn(
                    "w-full px-4 py-3 flex items-center justify-between group transition-all rounded-xl relative overflow-hidden",
                    isSelected ? "bg-primary/10" : "hover:bg-primary/5"
                )}
            >
                <div className="flex items-center gap-3 relative z-10 w-full">
                    {/* Icon Badge */}
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] border shadow-sm transition-all group-hover:scale-105 group-hover:rotate-3 shrink-0",
                        libro.testamento === 'AT'
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-600"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-600"
                    )}>
                        {libro.abreviatura.slice(0, 3)}
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 min-w-0 text-left">
                        <p className={cn(
                            "font-black text-sm uppercase tracking-tight truncate transition-colors",
                            isSelected ? "text-primary" : "text-foreground"
                        )}>
                            {libro.nombre}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                                "text-[7px] px-1.5 py-px rounded-full font-black uppercase tracking-widest border shrink-0",
                                libro.testamento === 'AT'
                                    ? "bg-amber-500/5 border-amber-500/20 text-amber-600"
                                    : "bg-blue-500/5 border-blue-500/20 text-blue-600"
                            )}>
                                {libro.testamento === 'AT' ? 'AT' : 'NT'}
                            </span>
                            <span className="text-[7px] text-muted-foreground/50 font-black uppercase tracking-widest truncate">
                                {libro.capitulos.length} CAP
                            </span>
                        </div>
                    </div>

                    {/* Selected Indicator */}
                    {isSelected && (
                        <motion.div
                            layoutId="check-indicator"
                            className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0"
                        >
                            <Check className="w-3 h-3" />
                        </motion.div>
                    )}
                </div>
            </button>
        )
    }

    return (
        <div className="space-y-6">
            {/* Libro Input - Trigger */}
            <div className="space-y-2.5 relative">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">
                    Libro de la Biblia
                </label>
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            ref={inputRef}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setIsOpen(true)
                            }}
                            onFocus={() => setIsOpen(true)}
                            onKeyDown={handleKeyDown}
                            onClick={() => setIsOpen(true)}
                            placeholder="Buscar libro (ej. Mateo, Salmos)..."
                            disabled={disabled}
                            autoComplete="off"
                            className="w-full bg-muted/30 border border-border/50 rounded-2xl pl-12 pr-10 py-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm md:text-base font-bold placeholder:text-muted-foreground/40 shadow-sm md:cursor-text"
                        />
                        {/* Command Icon hint */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-40 pointer-events-none">
                            <span className="text-[10px] uppercase font-black tracking-widest border border-border rounded px-1.5 py-0.5">
                                LISTA
                            </span>
                        </div>
                    </div>

                    {/* UNIVERSAL DROPDOWN - STANDARD ABSOLUTE POSITIONING */}
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                key="bible-selector-dropdown"
                                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-primary/20 rounded-[1.5rem] shadow-2xl z-[100] overflow-hidden flex flex-col max-h-[350px]"
                            >
                                {/* Scrollable List */}
                                <div className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 scrollbar-track-transparent">
                                    {filteredLibros.length === 0 ? (
                                        <div className="p-8 text-center flex flex-col items-center">
                                            <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                                                <Search className="w-5 h-5 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                                                No se encontraron libros
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Groups */}
                                            {groupedLibros.AT.length > 0 && (
                                                <div>
                                                    <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 px-4 py-2 mb-1 border-b border-border/50">
                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500">
                                                            Antiguo Testamento
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-1 px-1">
                                                        {groupedLibros.AT.map((l, i) => renderBookItem(l, i, filteredLibros.indexOf(l)))}
                                                    </div>
                                                </div>
                                            )}

                                            {groupedLibros.NT.length > 0 && (
                                                <div>
                                                    <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10 px-4 py-2 mb-1 border-b border-border/50 mt-2">
                                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-500">
                                                            Nuevo Testamento
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-1 px-1">
                                                        {groupedLibros.NT.map((l, i) => renderBookItem(l, i, filteredLibros.indexOf(l)))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer Tip */}
                                <div className="p-3 bg-muted/30 border-t border-white/10 text-center flex items-center justify-center gap-4 text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] shrink-0">
                                    <span className="flex items-center gap-1"><ArrowLeft className="w-3 h-3 rotate-90" /> Navegar</span>
                                    <span className="flex items-center gap-1">ENTER Seleccionar</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* DIAGNOSTIC INFO (VISIBLE TO USER) */}
                    <div className="mt-1 px-2 flex justify-between text-[9px] font-mono text-muted-foreground/50 select-none">
                        <span>Status: RELATIVE (UNIVERSAL)</span>
                        <span>Total: {libros.length}</span>
                        <span>Filtrados: {filteredLibros.length}</span>
                        <span>Mode: {isMobile ? 'Mobile(Ignored)' : 'Desktop'}</span>
                    </div>
                </div>
            </div>

            {/* Capítulo y Versículo Inicio y Fin */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-end ml-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Capítulo</label>
                            {selectedLibroObj && (
                                <span className="text-[8px] font-black text-primary uppercase">Máx: {getMaxChapters()}</span>
                            )}
                        </div>
                        <input
                            type="number"
                            min="1"
                            max={getMaxChapters()}
                            value={capituloInicio}
                            onChange={(e) => {
                                setCapituloInicio(e.target.value === '' ? '' : Number(e.target.value))
                                setSubmitError(null)
                            }}
                            placeholder="Ej: 1"
                            disabled={disabled || !selectedLibroObj}
                            className={`w-full h-14 bg-muted/30 border rounded-2xl px-5 outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm font-black shadow-sm ${error && (error.includes('capítulos') || (capituloInicio !== '' && Number(capituloInicio) > getMaxChapters())) ? 'border-red-500 ring-4 ring-red-500/10' : 'border-border/50 focus:border-primary/50'
                                }`}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-end ml-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Versículos (Rango)</label>
                            {selectedLibroObj && capituloInicio !== '' && (
                                <span className="text-[8px] font-black text-primary uppercase">Máx: {getMaxVerses(Number(capituloInicio))}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground/40 uppercase">De</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={getMaxVerses(Number(capituloInicio))}
                                    value={versiculoInicio}
                                    onChange={(e) => {
                                        setVersiculoInicio(e.target.value === '' ? '' : Number(e.target.value))
                                        setSubmitError(null)
                                    }}
                                    placeholder="Inicio"
                                    disabled={disabled || !selectedLibroObj || capituloInicio === ''}
                                    className={`w-full h-14 bg-muted/30 border rounded-2xl pl-8 pr-2 outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm font-black shadow-sm ${error && (error.includes('versículos') && versiculoInicio !== '' && Number(versiculoInicio) > getMaxVerses(Number(capituloInicio))) ? 'border-red-500 ring-4 ring-red-500/10' : 'border-border/50 focus:border-primary/50'
                                        }`}
                                />
                            </div>
                            <span className="text-muted-foreground font-black">—</span>
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground/40 uppercase">Hasta</span>
                                <input
                                    type="number"
                                    min={Number(versiculoInicio) || 1}
                                    max={getMaxVerses(Number(capituloInicio))}
                                    value={versiculoFin}
                                    onChange={(e) => {
                                        setVersiculoFin(e.target.value === '' ? '' : Number(e.target.value))
                                        setSubmitError(null)
                                    }}
                                    placeholder="Fin"
                                    disabled={disabled || !selectedLibroObj || capituloInicio === ''}
                                    className={`w-full h-14 bg-muted/30 border rounded-2xl pl-10 pr-2 outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm font-black shadow-sm ${error && (error.includes('versículos') && versiculoFin !== '' && Number(versiculoFin) > getMaxVerses(Number(capituloInicio))) ? 'border-red-500 ring-4 ring-red-500/10' : 'border-border/50 focus:border-primary/50'
                                        }`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-x-3 items-center text-red-600 text-xs font-bold shadow-sm"
                >
                    <div className="p-1.5 bg-red-500/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                    </div>
                    <p>{error}</p>
                </motion.div>
            )}

            {/* Preview */}
            <AnimatePresence>
                {selectedLibroObj && capituloInicio && versiculoInicio && !error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 shadow-inner relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <p className="text-[9px] font-black text-muted-foreground/60 mb-2 uppercase tracking-[0.3em] relative z-10">Vista previa de la cita:</p>
                        <p className="text-2xl md:text-3xl font-black text-primary tracking-tighter uppercase italic relative z-10">
                            {selectedLibroObj.nombre} {capituloInicio}:{versiculoInicio}
                            {versiculoFin && versiculoFin !== versiculoInicio && `-${versiculoFin}`}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={disabled || !selectedLibroObj || capituloInicio === '' || versiculoInicio === '' || !!error}
                className="w-full h-16 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl flex items-center justify-center gap-3 mt-4"
            >
                <BookOpen className="w-5 h-5" />
                Registrar Lectura Bíblica
            </button>
        </div>
    )
}
