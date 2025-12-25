/**
 * UserSelector - IDMJI Gestor de Púlpito
 * 
 * Componente de búsqueda y selección de hermanos para asignaciones.
 * Filtra automáticamente por usuarios con acceso al púlpito.
 * 
 * @author Antigravity AI
 * @date 2024-12-25
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, User, Check, Loader2, ChevronDown } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { searchProfiles } from '@/app/dashboard/cultos/[id]/actions'
import { Profile } from '@/types/database'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { motion, AnimatePresence } from 'framer-motion'

interface UserSelectorProps {
    selectedUserId: string | null
    onSelect: (userId: string | null) => void
    disabled?: boolean
    isEditing?: boolean
    onEditChange?: (isEditing: boolean) => void
}

export default function UserSelector({ 
    selectedUserId, 
    onSelect, 
    disabled, 
    isEditing: externalIsEditing, 
    onEditChange 
}: UserSelectorProps) {
    const { t } = useI18n()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Profile[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [internalIsEditing, setInternalIsEditing] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Sync with external editing state if provided
    const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing
    const setIsEditing = (val: boolean) => {
        if (onEditChange) onEditChange(val)
        else setInternalIsEditing(val)
    }

    const debouncedQuery = useDebounce(query, 300)

    // Reset editing state when selectedUserId changes to null
    useEffect(() => {
        if (!selectedUserId) {
            setIsEditing(true)
        }
    }, [selectedUserId])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        async function search() {
            setIsSearching(true)
            try {
                const { data } = await searchProfiles(debouncedQuery)
                setResults(data as Profile[] || [])
                if (showResults || debouncedQuery.length > 0) {
                    setShowResults(true)
                }
            } catch (error) {
                console.error('Error searching profiles:', error)
            } finally {
                setIsSearching(false)
            }
        }

        search()
    }, [debouncedQuery])

    const handleSelect = (user: Profile) => {
        onSelect(user.id)
        setQuery('')
        setShowResults(false)
        setIsEditing(false)
    }

    const handleClear = () => {
        onSelect(null)
        setQuery('')
        setShowResults(false)
        setIsEditing(true)
    }

    // If we have a selected user and we're NOT editing, we don't show the search bar
    if (selectedUserId && !isEditing && !disabled) {
        return null
    }

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative group">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-primary' : 'text-muted-foreground group-focus-within:text-primary'}`}>
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        setShowResults(true)
                        // Trigger immediate search if results are empty
                        if (results.length === 0) {
                            searchProfiles('').then(({ data }) => setResults(data as Profile[] || []))
                        }
                    }}
                    placeholder={t('hermanos.searchPlaceholder')}
                    disabled={disabled}
                    className="w-full bg-muted/30 border border-border/50 rounded-2xl pl-12 pr-12 py-3.5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all disabled:opacity-50 font-medium text-sm placeholder:text-muted-foreground/60 shadow-inner"
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown de Resultados */}
            <AnimatePresence>
                {showResults && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-50 w-full top-full mt-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-200 dark:border-white/10 max-h-[450px] overflow-hidden flex flex-col"
                    >
                        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                {query ? 'Resultados de búsqueda' : 'Hermanos sugeridos'}
                            </p>
                            <button 
                                onClick={() => setShowResults(false)}
                                className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-y-auto no-scrollbar p-2">
                            {results.length > 0 ? (
                                <div className="grid grid-cols-1 gap-1">
                                    {results.map((user) => {
                                        const isSelected = selectedUserId === user.id
                                        return (
                                            <button
                                                key={user.id}
                                                onClick={() => handleSelect(user)}
                                                className={`
                                                    w-full px-4 py-3.5 text-left transition-all rounded-[1.5rem] flex items-center justify-between group/item relative overflow-hidden
                                                    ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/5 text-foreground'}
                                                `}
                                            >
                                                <div className="flex items-center gap-4 relative z-10">
                                                    {/* Avatar o Iniciales */}
                                                    <div className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center font-black text-xs border shadow-sm transition-all group-hover/item:scale-105 group-hover/item:rotate-3 ${
                                                        isSelected ? 'bg-white/20 border-white/20' : 'bg-primary/5 border-primary/10 text-primary'
                                                    }`}>
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                                                        ) : (
                                                            <span className="uppercase">{user.nombre?.[0]}{user.apellidos?.[0]}</span>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm md:text-base truncate uppercase tracking-tight">
                                                            {user.nombre} {user.apellidos}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className={`text-[10px] uppercase font-black tracking-widest ${isSelected ? 'text-white/60' : 'text-emerald-500'}`}>
                                                                {isSelected ? 'Seleccionado' : 'Disponible para el púlpito'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all relative z-10 ${isSelected ? 'bg-white/20' : 'bg-primary/0 group-hover/item:bg-primary/10'}`}>
                                                    {isSelected ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <ChevronDown className="w-4 h-4 text-muted-foreground/30 -rotate-90 group-hover/item:text-primary group-hover/item:translate-x-0.5 transition-all" />}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                !isSearching && (
                                    <div className="p-12 text-center">
                                        <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <User className="w-8 h-8 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-sm font-black text-foreground uppercase tracking-widest mb-1">
                                            Sin resultados
                                        </p>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                            No se encontró ningún hermano con "{query}"
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                        <div className="p-3 bg-muted/20 border-t border-border/50 text-center">
                            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Selecciona un hermano para asignar</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Botones de acción en modo edición */}
            <div className="flex items-center gap-3">
                {selectedUserId && isEditing && !disabled && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={handleClear}
                        className="mt-3 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all inline-flex items-center gap-2 border border-transparent hover:border-red-500/10"
                    >
                        <X className="w-3 h-3" strokeWidth={3} />
                        {t('hermanos.removeAssignment')}
                    </motion.button>
                )}
                
                {selectedUserId && isEditing && !disabled && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setIsEditing(false)}
                        className="mt-3 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all inline-flex items-center gap-2"
                    >
                        Cancelar
                    </motion.button>
                )}
            </div>
        </div>
    )
}
