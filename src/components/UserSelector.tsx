'use client'

import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import { searchProfiles } from '@/app/dashboard/cultos/[id]/actions'
import { Profile } from '@/types/database'

interface UserSelectorProps {
    selectedUserId: string | null
    onSelect: (userId: string | null) => void
    disabled?: boolean
}

export default function UserSelector({ selectedUserId, onSelect, disabled }: UserSelectorProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Profile[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)

    const debouncedQuery = useDebounce(query, 300)

    useEffect(() => {
        async function search() {
            if (debouncedQuery.length < 2) {
                setResults([])
                return
            }

            setIsSearching(true)
            const { data } = await searchProfiles(debouncedQuery)
            setResults(data as Profile[] || [])
            setIsSearching(false)
            setShowResults(true)
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
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowResults(true)}
                    placeholder="Buscar hermano..."
                    disabled={disabled}
                    className="w-full bg-background/50 border border-border rounded-xl pl-10 pr-10 py-2 outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-50"
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Results dropdown */}
            {showResults && results.length > 0 && (
                <div className="absolute z-10 w-full mt-2 glass rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {results.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => handleSelect(user)}
                            className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        >
                            <p className="font-medium">
                                {user.nombre} {user.apellidos}
                            </p>
                        </button>
                    ))}
                </div>
            )}

            {/* No results */}
            {showResults && query.length >= 2 && results.length === 0 && !isSearching && (
                <div className="absolute z-10 w-full mt-2 glass rounded-xl shadow-lg p-4 text-center text-sm text-muted-foreground">
                    No se encontraron hermanos
                </div>
            )}

            {/* Clear button */}
            {selectedUserId && (
                <button
                    onClick={handleClear}
                    disabled={disabled}
                    className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                >
                    Quitar asignación
                </button>
            )}
        </div>
    )
}
