/**
 * UserSelector - IDMJI Gestor de Púlpito
 * 
 * Componente de búsqueda y selección de hermanos para asignaciones.
 * Filtra automáticamente por usuarios con acceso al púlpito.
 * Usa Portals para garantizar que los resultados sean siempre visibles.
 * 
 * @author Antigravity AI
 * @date 2024-12-25
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, User, Check, Loader2, ChevronDown } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { searchProfiles } from '@/app/dashboard/cultos/[id]/actions'
import { Profile } from '@/types/database'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { motion } from 'framer-motion'

interface UserSelectorProps {
    selectedUserId: string | null
    onSelect: (userId: string | null, confirmed?: boolean) => void
    disabled?: boolean
    isEditing?: boolean
    onEditChange?: (isEditing: boolean) => void
    cultoDate?: string
    assignmentType?: string
    isFestivo?: boolean
}

export default function UserSelector({
    selectedUserId,
    onSelect,
    disabled,
    isEditing: externalIsEditing,
    onEditChange,
    cultoDate,
    assignmentType,
}: UserSelectorProps) {
    const { t } = useI18n()
    const [id] = useState(() => Math.random().toString(36).substring(2, 9))
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Profile[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [internalIsEditing, setInternalIsEditing] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const [dropdownRect, setDropdownRect] = useState<{ top: number, left: number, width: number } | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Sync with external editing state if provided
    const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing
    const setIsEditing = useCallback((val: boolean) => {
        if (onEditChange) onEditChange(val)
        else setInternalIsEditing(val)
    }, [onEditChange])

    const debouncedQuery = useDebounce(query, 300)

    // Reset editing state when selectedUserId changes to null
    useEffect(() => {
        if (!selectedUserId) {
            setIsEditing(true)
        }
    }, [selectedUserId, setIsEditing])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // Si el portal está abierto, también necesitamos verificar si el clic fue dentro del portal
                // Pero como es fixed y está en el body, es más complejo.
                // Usamos un timeout pequeño para permitir clics en los botones de resultados
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
    }, [debouncedQuery, showResults])

    // Posicionamiento dinámico para el dropdown fixed
    const updatePosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            setDropdownRect({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            })
        }
    }

    useEffect(() => {
        if (showResults) {
            updatePosition()
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
            return () => {
                window.removeEventListener('scroll', updatePosition, true)
                window.removeEventListener('resize', updatePosition)
            }
        }
    }, [showResults])

    // Helper to check availability
    const isUserAvailable = (user: Profile) => {
        if (!cultoDate || !assignmentType) return true // If no context, assume available

        // Handle legacy availability (simple array/object) vs new structure (template/exceptions)
        const availabilityData = user.availability as Record<string, unknown> | null

        if (!availabilityData) return true // Default available if no constraints set

        const date = new Date(cultoDate)
        const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
        const dayOfWeek = date.getDay() // 0-6

        // 1. Check Exceptions (Highest Priority)
        // New structure: availability.exceptions['YYYY-MM-DD']
        const exceptions = availabilityData.exceptions as Record<string, Record<string, boolean>> | undefined
        if (exceptions && exceptions[dateStr]) {
            const exception = exceptions[dateStr]
            // If exception exists for this date, IT RULES.
            return exception[assignmentType] === true // Must be explicitly true
        }

        // 2. Check Template (Standard Priority)
        // New structure: availability.template['0'...'6']
        const template = availabilityData.template as Record<string, Record<string, boolean>> | undefined
        if (template) {
            const dayTemplate = template[dayOfWeek.toString()]
            if (dayTemplate) {
                return dayTemplate[assignmentType] === true
            }
            // If no template for this day, assume unavailable? 
            // Or available? Usually 'template' defines availability. Defaults to false.
            return false
        }

        // 3. Fallback to Legacy/Old Structure (if exists)
        // old: availability[dayOfWeek] = { assignments... }
        const legacyDay = availabilityData[dayOfWeek] as Record<string, boolean> | undefined
        if (legacyDay) {
            return legacyDay[assignmentType] !== false
        }

        // If structure exists but no matching rule found, assume unavailable to be safe? 
        // Or if 'availability' is empty object?
        // Let's assume unavailable if they have availability set up but no match.
        // But if availability is completely null (handled at top), they are available.
        return false
    }

    // Sort results: Available first
    const sortedResults = [...results].sort((a, b) => {
        const aAvailable = isUserAvailable(a)
        const bAvailable = isUserAvailable(b)
        if (aAvailable === bAvailable) return 0
        return aAvailable ? -1 : 1
    })

    const handleSelect = (user: Profile, confirmed: boolean = true) => {
        // If not confirmed (unavailable), we pass false to let parent handle the warning
        if (confirmed) {
            onSelect(user.id, true)
            setQuery('')
            setShowResults(false)
            setIsEditing(false)
        } else {
            // Parent will handle the modal
            onSelect(user.id, false)
            setShowResults(false)
        }
    }

    const handleClear = () => {
        onSelect(null, true)
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
                        updatePosition()
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

            {/* Dropdown de Resultados con PORTAL */}
            {mounted && showResults && dropdownRect && createPortal(
                <div key={`user-selector-portal-${id}`} className="fixed inset-0 z-9998" onClick={() => setShowResults(false)}>
                    <motion.div
                        key={`user-selector-dropdown-${id}`}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        style={{
                            position: 'fixed',
                            top: dropdownRect.top + 8,
                            left: dropdownRect.left,
                            width: dropdownRect.width,
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] border border-gray-200 dark:border-white/10 max-h-[450px] overflow-hidden flex flex-col pointer-events-auto"
                    >
                        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
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
                        <div className="overflow-y-auto no-scrollbar p-2 flex-1">
                            {sortedResults.length > 0 ? (
                                <div className="grid grid-cols-1 gap-1">
                                    {sortedResults.map((user, idx) => {
                                        const isSelected = selectedUserId === user.id
                                        const isAvailable = isUserAvailable(user)

                                        return (
                                            <button
                                                key={user.id || `user-result-${idx}`}
                                                onClick={() => {
                                                    if (!isAvailable) {
                                                        // If unavailable, we might want to warn
                                                        // But parent handles the selection, so we pass it up
                                                        handleSelect(user, false) // false = not confirmed yet
                                                        return
                                                    }
                                                    handleSelect(user, true)
                                                }}
                                                className={`
                                                    w-full px-4 py-3.5 text-left transition-all rounded-3xl flex items-center justify-between group/item relative overflow-hidden
                                                    ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/5 text-foreground'}
                                                    ${!isAvailable && !isSelected ? 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0' : ''}
                                                `}
                                            >
                                                <div className="flex items-center gap-4 relative z-10 min-w-0">
                                                    {/* Avatar o Iniciales */}
                                                    <div className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center font-black text-xs border shadow-sm transition-all group-hover/item:scale-105 group-hover/item:rotate-3 ${isSelected ? 'bg-white/20 border-white/20' : 'bg-primary/5 border-primary/10 text-primary'
                                                        }`}>
                                                        {user.avatar_url ? (
                                                            <div className="relative w-full h-full">
                                                                <Image
                                                                    src={user.avatar_url}
                                                                    alt={user.nombre || ''}
                                                                    fill
                                                                    className="object-cover rounded-2xl"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className="uppercase">{user.nombre?.[0]}{user.apellidos?.[0]}</span>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm md:text-base truncate uppercase tracking-tight">
                                                            {user.nombre} {user.apellidos}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : isAvailable ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                            <p className={`text-[10px] uppercase font-black tracking-widest ${isSelected ? 'text-white/60' : isAvailable ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                                                {isSelected ? 'Seleccionado' : isAvailable ? 'Disponible' : 'No disponible'}
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
                                            No se encontró ningún hermano con &quot;{query}&quot;
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                        <div className="p-3 bg-muted/20 border-t border-border/50 text-center shrink-0">
                            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Selecciona un hermano para asignar</p>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}

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
