import { useState, useEffect, useRef, useSyncExternalStore, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, BookOpen, AlertCircle, X, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getBibliaLibros } from '@/app/dashboard/lecturas/actions'

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
    const [showDropdown, setShowDropdown] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [isMobileSearchActive, setIsMobileSearchActive] = useState(false)
    const [dropdownRect, setDropdownRect] = useState<{ top: number, left: number, width: number } | null>(null)
    const mounted = useSyncExternalStore(subscribeToNothing, getMountedSnapshot, getMountedServerSnapshot)
    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

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

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Posicionamiento dinámico para el dropdown fixed
    const updatePosition = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect()
            setDropdownRect({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            })
        }
    }

    useEffect(() => {
        if (showDropdown && !isMobile) {
            updatePosition()
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
            return () => {
                window.removeEventListener('scroll', updatePosition, true)
                window.removeEventListener('resize', updatePosition)
            }
        }
    }, [showDropdown, isMobile])

    useEffect(() => {
        async function loadLibros() {
            const { data } = await getBibliaLibros()
            if (data) {
                setLibros(data)
            }
        }
        loadLibros()
    }, [])

    // Scroll lock for mobile search
    useEffect(() => {
        if (isMobileSearchActive) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isMobileSearchActive])

    const filteredLibros = libros.filter(libro =>
        libro.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        libro.abreviatura.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleSelectLibro = (libro: BibleBook) => {
        setSelectedLibroObj(libro)
        setSearchQuery(libro.nombre)
        setCapituloInicio('')
        setVersiculoInicio('')
        setVersiculoFin('')
        setSubmitError(null)
        setShowDropdown(false)
        setIsMobileSearchActive(false)
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

        if (validationError) return // Don't submit if there's a validation error

        // Re-validación final antes de enviar
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

    return (
        <div className="space-y-6">
            {/* Libro */}
            <div className="space-y-2.5 relative">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Libro de la Biblia</label>
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
                                if (!isMobile) setShowDropdown(true)
                            }}
                            onClick={() => {
                                if (isMobile) {
                                    setIsMobileSearchActive(true)
                                } else {
                                    setShowDropdown(true)
                                }
                            }}
                            onFocus={() => {
                                if (!isMobile) setShowDropdown(true)
                            }}
                            placeholder="Buscar libro..."
                            disabled={disabled}
                            className="w-full bg-muted/30 border border-border/50 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm md:text-base font-bold placeholder:text-muted-foreground/40 shadow-sm cursor-text md:cursor-pointer"
                        />
                    </div>

                    {/* Desktop Search Results - PORTAL position for reliability */}
                    <AnimatePresence>
                        {mounted && !isMobile && showDropdown && dropdownRect && createPortal(
                            <div key={`bible-selector-portal-${id}`} className="fixed inset-0 z-[9998]" onClick={() => setShowDropdown(false)}>
                                <motion.div
                                    key={`bible-selector-dropdown-${id}`}
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    ref={dropdownRef}
                                    style={{
                                        position: 'fixed',
                                        top: dropdownRect.top + 8,
                                        left: dropdownRect.left,
                                        width: dropdownRect.width,
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden border border-gray-200 dark:border-white/10 flex flex-col min-h-[100px] max-h-[450px]"
                                >
                                    <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Resultados de búsqueda</p>
                                        <button
                                            onClick={() => setShowDropdown(false)}
                                            className="p-1.5 hover:bg-muted rounded-full transition-colors"
                                        >
                                            <X className="w-4 h-4 text-muted-foreground" />
                                        </button>
                                    </div>
                                    <div className="overflow-y-auto p-2 no-scrollbar flex-1">
                                        {filteredLibros.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-1">
                                                {filteredLibros.map((libro, idx) => (
                                                    <button
                                                        key={libro.id || `libro-result-${idx}`}
                                                        onClick={() => handleSelectLibro(libro)}
                                                        className="w-full px-4 py-3.5 text-left hover:bg-primary/5 dark:hover:bg-primary/10 transition-all flex items-center justify-between group rounded-[1.5rem] relative overflow-hidden"
                                                    >
                                                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                                                        <div className="flex items-center gap-4 relative z-10">
                                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs border shadow-sm transition-all group-hover:scale-105 group-hover:rotate-3 ${libro.testamento === 'AT'
                                                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                                                                : 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                                                                }`}>
                                                                {libro.abreviatura.slice(0, 2)}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-sm md:text-base group-hover:text-primary transition-colors uppercase tracking-tight">{libro.nombre}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${libro.testamento === 'AT'
                                                                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-600'
                                                                        : 'bg-blue-500/5 border-blue-500/20 text-blue-600'
                                                                        }`}>
                                                                        {libro.testamento === 'AT' ? 'Antiguo Testamento' : 'Nuevo Testamento'}
                                                                    </span>
                                                                    <span className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-widest">•</span>
                                                                    <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest italic">
                                                                        {libro.capitulos.length} Capítulos
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-xl bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center transition-all relative z-10">
                                                            <ChevronDown className="w-4 h-4 text-muted-foreground/30 -rotate-90 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-10 text-center">
                                                <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                                                <p className="text-xs font-black text-muted-foreground/40 uppercase tracking-widest">No hay resultados para &quot;{searchQuery}&quot;</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 bg-muted/20 border-t border-border/50 text-center shrink-0">
                                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Sugerencia: Escribe para filtrar la lista</p>
                                    </div>
                                </motion.div>
                            </div>,
                            document.body
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Mobile Search Overlay */}
            <AnimatePresence>
                {isMobile && isMobileSearchActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] bg-white dark:bg-zinc-950 flex flex-col"
                    >
                        {/* Search Header */}
                        <div className="flex items-center gap-4 p-4 border-b border-border/50">
                            <button
                                onClick={() => setIsMobileSearchActive(false)}
                                className="p-2 hover:bg-muted rounded-xl transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    autoFocus
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar libro..."
                                    className="w-full bg-muted/50 rounded-2xl pl-12 pr-10 py-3.5 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-base"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-muted-foreground/10 rounded-full"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Search Results */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredLibros.length > 0 ? (
                                filteredLibros.map((libro, idx) => (
                                    <button
                                        key={libro.id || `mobile-libro-result-${idx}`}
                                        onClick={() => handleSelectLibro(libro)}
                                        className="w-full p-4 text-left bg-muted/20 hover:bg-primary/5 active:bg-primary/10 rounded-2xl transition-all border border-border/10 flex items-center gap-4 group"
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border shadow-sm ${libro.testamento === 'AT' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                                            }`}>
                                            {libro.abreviatura.slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-black text-base uppercase tracking-tight text-foreground">{libro.nombre}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                                                {libro.testamento === 'AT' ? 'Antiguo Testamento' : 'Nuevo Testamento'} • {libro.capitulos.length} Capítulos
                                            </p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    <BookOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="font-bold text-muted-foreground uppercase tracking-widest">No se encontraron libros</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
