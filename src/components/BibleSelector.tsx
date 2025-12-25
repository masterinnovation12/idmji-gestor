import { useState, useEffect } from 'react'
import { Search, ChevronDown, BookOpen, AlertCircle } from 'lucide-react'
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

export default function BibleSelector({ onSelect, disabled }: BibleSelectorProps) {
    const [libros, setLibros] = useState<BibleBook[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedLibroObj, setSelectedLibroObj] = useState<BibleBook | null>(null)
    const [capituloInicio, setCapituloInicio] = useState<number | ''>('')
    const [versiculoInicio, setVersiculoInicio] = useState<number | ''>('')
    const [capituloFin, setCapituloFin] = useState<number | ''>('')
    const [versiculoFin, setVersiculoFin] = useState<number | ''>('')
    const [showDropdown, setShowDropdown] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadLibros() {
            const { data } = await getBibliaLibros()
            if (data) {
                setLibros(data)
            }
        }
        loadLibros()
    }, [])

    const filteredLibros = libros.filter(libro =>
        libro.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        libro.abreviatura.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleSelectLibro = (libro: BibleBook) => {
        setSelectedLibroObj(libro)
        setSearchQuery(libro.nombre)
        setCapituloInicio('')
        setVersiculoInicio('')
        setCapituloFin('')
        setVersiculoFin('')
        setError(null)
        setShowDropdown(false)
    }

    const getMaxChapters = () => selectedLibroObj ? selectedLibroObj.capitulos.length : 150
    const getMaxVerses = (capNum: number | '') => {
        if (!selectedLibroObj || capNum === '') return 176
        const cap = selectedLibroObj.capitulos.find(c => c.n === capNum)
        return cap ? cap.v : 176
    }

    const handleSubmit = () => {
        if (!selectedLibroObj || !capituloInicio || !versiculoInicio) {
            return
        }

        // Validaciones
        const maxCaps = getMaxChapters()
        if (capituloInicio > maxCaps) {
            setError(`El libro ${selectedLibroObj.nombre} solo tiene ${maxCaps} capítulos.`)
            return
        }

        const maxVersStart = getMaxVerses(capituloInicio)
        if (versiculoInicio > maxVersStart) {
            setError(`El capítulo ${capituloInicio} de ${selectedLibroObj.nombre} solo tiene ${maxVersStart} versículos.`)
            return
        }

        if (capituloFin) {
            if (capituloFin > maxCaps) {
                setError(`El libro ${selectedLibroObj.nombre} solo tiene ${maxCaps} capítulos.`)
                return
            }
            if (capituloFin < capituloInicio) {
                setError(`El capítulo de fin no puede ser menor al de inicio.`)
                return
            }
        }

        if (versiculoFin) {
            const currentCapFin = capituloFin || capituloInicio
            const maxVersEnd = getMaxVerses(currentCapFin)
            if (versiculoFin > maxVersEnd) {
                setError(`El capítulo ${currentCapFin} de ${selectedLibroObj.nombre} solo tiene ${maxVersEnd} versículos.`)
                return
            }
            if (currentCapFin === capituloInicio && versiculoFin < versiculoInicio) {
                setError(`El versículo de fin no puede ser menor al de inicio.`)
                return
            }
        }

        onSelect(
            selectedLibroObj.nombre,
            Number(capituloInicio),
            Number(versiculoInicio),
            capituloFin ? Number(capituloFin) : undefined,
            versiculoFin ? Number(versiculoFin) : undefined
        )
    }

    return (
        <div className="space-y-6">
            {/* Libro */}
            <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Libro de la Biblia</label>
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative">
                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setShowDropdown(true)
                                if (selectedLibroObj && e.target.value !== selectedLibroObj.nombre) {
                                    setSelectedLibroObj(null)
                                }
                            }}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Escribe el nombre del libro..."
                            disabled={disabled}
                            className="w-full bg-muted/30 border border-border/50 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm md:text-base font-bold placeholder:text-muted-foreground/40 shadow-sm"
                        />
                    </div>

                    {showDropdown && filteredLibros.length > 0 && (
                        <div className="absolute z-[100] w-full mt-3 glass rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-h-[400px] overflow-hidden border border-white/20 dark:border-white/5 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                            <div className="overflow-y-auto p-3">
                                {filteredLibros.map((libro) => (
                                    <button
                                        key={libro.id}
                                        onClick={() => handleSelectLibro(libro)}
                                        className="w-full px-5 py-4 text-left hover:bg-primary/10 transition-all flex items-center justify-between group rounded-2xl mb-1 last:mb-0"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${libro.testamento === 'AT' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                                {libro.abreviatura.slice(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm md:text-base group-hover:text-primary transition-colors uppercase tracking-tight">{libro.nombre}</p>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                                                    {libro.testamento === 'AT' ? 'Antiguo Testamento' : 'Nuevo Testamento'} • {libro.capitulos.length} Capítulos
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground/30 -rotate-90" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Capítulo y Versículo Inicio y Fin (Rango Inteligente) */}
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Capítulo</label>
                        <input
                            type="number"
                            min="1"
                            max={getMaxChapters()}
                            value={capituloInicio}
                            onChange={(e) => {
                                setCapituloInicio(e.target.value === '' ? '' : Number(e.target.value))
                                setError(null)
                                // Auto-set end chapter if not set
                                if (!capituloFin) setCapituloFin(e.target.value === '' ? '' : Number(e.target.value))
                            }}
                            placeholder="Inicio"
                            disabled={disabled || !selectedLibroObj}
                            className="w-full h-14 bg-muted/30 border border-border/50 rounded-2xl px-5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm font-black shadow-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Versículos (Rango)</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max={getMaxVerses(capituloInicio)}
                                value={versiculoInicio}
                                onChange={(e) => {
                                    setVersiculoInicio(e.target.value === '' ? '' : Number(e.target.value))
                                    setError(null)
                                }}
                                placeholder="Desde"
                                disabled={disabled || !selectedLibroObj || capituloInicio === ''}
                                className="flex-1 h-14 bg-muted/30 border border-border/50 rounded-2xl px-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm font-black shadow-sm text-center"
                            />
                            <span className="text-muted-foreground font-black">—</span>
                            <input
                                type="number"
                                min={capituloFin === capituloInicio ? (Number(versiculoInicio) || 1) : 1}
                                max={getMaxVerses(capituloFin || capituloInicio)}
                                value={versiculoFin}
                                onChange={(e) => {
                                    setVersiculoFin(e.target.value === '' ? '' : Number(e.target.value))
                                    setError(null)
                                }}
                                placeholder="Hasta"
                                disabled={disabled || !selectedLibroObj || capituloInicio === ''}
                                className="flex-1 h-14 bg-muted/30 border border-border/50 rounded-2xl px-4 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm font-black shadow-sm text-center"
                            />
                        </div>
                    </div>
                </div>

                {/* Switch para Cambio de Capítulo (Caso especial raro) */}
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            if (capituloFin === capituloInicio) {
                                setCapituloFin(Math.min(Number(capituloInicio) + 1, getMaxChapters()))
                            } else {
                                setCapituloFin(capituloInicio)
                            }
                        }}
                        className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all border ${
                            capituloFin !== capituloInicio 
                                ? 'bg-primary/10 border-primary text-primary' 
                                : 'bg-muted/30 border-border text-muted-foreground'
                        }`}
                    >
                        {capituloFin !== capituloInicio ? 'Varios Capítulos' : '+ Diferente Capítulo'}
                    </button>
                </div>

                {capituloFin !== capituloInicio && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 pt-1"
                    >
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Capítulo Final</label>
                            <input
                                type="number"
                                min={capituloInicio || 1}
                                max={getMaxChapters()}
                                value={capituloFin}
                                onChange={(e) => setCapituloFin(e.target.value === '' ? '' : Number(e.target.value))}
                                disabled={disabled || !selectedLibroObj || capituloInicio === ''}
                                className="w-full h-14 bg-primary/5 border border-primary/20 rounded-2xl px-5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm font-black shadow-sm"
                            />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-x-3 items-center text-red-600 text-xs font-bold animate-in shake duration-300 shadow-sm">
                    <div className="p-1.5 bg-red-500/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                    </div>
                    <p>{error}</p>
                </div>
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
                            {(capituloFin || versiculoFin) && (
                                <span className="text-primary/40 ml-2 not-italic">
                                    — {capituloFin || capituloInicio}:{versiculoFin || versiculoInicio}
                                </span>
                            )}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={disabled || !selectedLibroObj || capituloInicio === '' || versiculoInicio === ''}
                className="w-full h-16 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl flex items-center justify-center gap-3 mt-4"
            >
                <BookOpen className="w-5 h-5" />
                Registrar Lectura Bíblica
            </button>
        </div>
    )
}
