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
import { Search, X, User, Check, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { searchProfiles } from '@/app/dashboard/cultos/[id]/actions'
import { Profile } from '@/types/database'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { motion, AnimatePresence } from 'framer-motion'

interface UserSelectorProps {
    selectedUserId: string | null
    onSelect: (userId: string | null) => void
    disabled?: boolean
}

export default function UserSelector({ selectedUserId, onSelect, disabled }: UserSelectorProps) {
    const { t } = useI18n()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Profile[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const debouncedQuery = useDebounce(query, 300)

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
            if (debouncedQuery.length < 2) {
                setResults([])
                return
            }

            setIsSearching(true)
            try {
                const { data } = await searchProfiles(debouncedQuery)
                setResults(data as Profile[] || [])
                setShowResults(true)
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
    }

    const handleClear = () => {
        onSelect(null)
        setQuery('')
        setShowResults(false)
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
                    onFocus={() => query.length >= 2 && setShowResults(true)}
                    placeholder={t('hermanos.searchPlaceholder')}
                    disabled={disabled}
                    className="w-full bg-muted/30 border border-border/50 rounded-2xl pl-12 pr-12 py-3.5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all disabled:opacity-50 font-medium text-sm placeholder:text-muted-foreground/60"
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
                        className="absolute z-50 w-full mt-3 glass rounded-3xl shadow-2xl border border-white/20 dark:border-white/5 max-h-72 overflow-hidden flex flex-col"
                    >
                        <div className="overflow-y-auto no-scrollbar p-2">
                            {results.length > 0 ? (
                                results.map((user) => {
                                    const isSelected = selectedUserId === user.id
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => handleSelect(user)}
                                            className={`
                                                w-full px-4 py-3 text-left transition-all rounded-2xl flex items-center gap-3 group/item
                                                ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-foreground'}
                                            `}
                                        >
                                            {/* Avatar o Iniciales */}
                                            <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-black text-xs border shadow-sm ${
                                                isSelected ? 'bg-white/20 border-white/20' : 'bg-primary/5 border-primary/10 text-primary'
                                            }`}>
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                                                ) : (
                                                    <span>{user.nombre?.[0]}{user.apellidos?.[0]}</span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate uppercase tracking-tight">
                                                    {user.nombre} {user.apellidos}
                                                </p>
                                            </div>

                                            {isSelected && <Check className="w-4 h-4" strokeWidth={3} />}
                                        </button>
                                    )
                                })
                            ) : (
                                !isSearching && query.length >= 2 && (
                                    <div className="p-8 text-center">
                                        <User className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                            {t('hermanos.noPulpitoFound')}
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Botón para quitar asignación */}
            {selectedUserId && !disabled && (
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
        </div>
    )
}
