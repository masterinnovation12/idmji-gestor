import { useState, useEffect } from 'react'
import { Search, ChevronDown, BookOpen, AlertCircle } from 'lucide-react'
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
        <div className="space-y-4">
            {/* Libro */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Libro de la Biblia</label>
                <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
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
                        className="w-full bg-background/50 border border-border/50 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm md:text-base"
                    />

                    {showDropdown && filteredLibros.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 glass-premium rounded-xl shadow-2xl max-h-64 overflow-y-auto border border-border/50 animate-in fade-in zoom-in duration-200">
                            {filteredLibros.map((libro) => (
                                <button
                                    key={libro.id}
                                    onClick={() => handleSelectLibro(libro)}
                                    className="w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors flex items-center justify-between group"
                                >
                                    <div>
                                        <p className="font-bold text-sm md:text-base group-hover:text-primary transition-colors">{libro.nombre}</p>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">{libro.testamento} • {libro.capitulos.length} Capítulos</p>
                                    </div>
                                    <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground font-mono">{libro.abreviatura}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Capítulo y Versículo Inicio */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Capítulo</label>
                    <input
                        type="number"
                        min="1"
                        max={getMaxChapters()}
                        value={capituloInicio}
                        onChange={(e) => {
                            setCapituloInicio(e.target.value === '' ? '' : Number(e.target.value))
                            setError(null)
                        }}
                        placeholder={`1-${getMaxChapters()}`}
                        disabled={disabled || !selectedLibroObj}
                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm md:text-base"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Versículo</label>
                    <input
                        type="number"
                        min="1"
                        max={getMaxVerses(capituloInicio)}
                        value={versiculoInicio}
                        onChange={(e) => {
                            setVersiculoInicio(e.target.value === '' ? '' : Number(e.target.value))
                            setError(null)
                        }}
                        placeholder={`1-${getMaxVerses(capituloInicio)}`}
                        disabled={disabled || !selectedLibroObj || capituloInicio === ''}
                        className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm md:text-base"
                    />
                </div>
            </div>

            {/* Opción de rango */}
            <div className="pt-2">
                <details className="group">
                    <summary className="text-xs font-medium text-primary cursor-pointer flex items-center gap-1 list-none hover:underline">
                        <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                        ¿Es un rango de versículos/capítulos?
                    </summary>
                    <div className="grid grid-cols-2 gap-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Capítulo Fin</label>
                            <input
                                type="number"
                                min={capituloInicio || 1}
                                max={getMaxChapters()}
                                value={capituloFin}
                                onChange={(e) => setCapituloFin(e.target.value === '' ? '' : Number(e.target.value))}
                                disabled={disabled || !selectedLibroObj || capituloInicio === ''}
                                className="w-full bg-background/30 border border-border/30 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Versículo Fin</label>
                            <input
                                type="number"
                                min="1"
                                max={getMaxVerses(capituloFin || capituloInicio)}
                                value={versiculoFin}
                                onChange={(e) => setVersiculoFin(e.target.value === '' ? '' : Number(e.target.value))}
                                disabled={disabled || !selectedLibroObj || capituloInicio === ''}
                                className="w-full bg-background/30 border border-border/30 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                            />
                        </div>
                    </div>
                </details>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-x-2 items-center text-red-500 text-xs md:text-sm animate-in shake duration-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {/* Preview */}
            {selectedLibroObj && capituloInicio && versiculoInicio && !error && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-tighter">Vista previa de la cita:</p>
                    <p className="text-base md:text-lg font-bold text-primary">
                        {selectedLibroObj.nombre} {capituloInicio}:{versiculoInicio}
                        {(capituloFin || versiculoFin) && (
                            <span className="text-primary/70 ml-1">
                                — {capituloFin || capituloInicio}:{versiculoFin || versiculoInicio}
                            </span>
                        )}
                    </p>
                </div>
            )}

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={disabled || !selectedLibroObj || capituloInicio === '' || versiculoInicio === ''}
                className="w-full bg-primary text-white py-3 md:py-4 rounded-xl font-bold hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
            >
                <BookOpen className="w-5 h-5" />
                Registrar Lectura Bíblica
            </button>
        </div>
    )
}
