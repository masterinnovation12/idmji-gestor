'use client'

import { useState } from 'react'
import { generateCultosForMonth } from './actions'
import { Loader2, CalendarPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function GenerateCultosButton() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    async function handleGenerate() {
        if (!confirm('¿Generar cultos para este mes? Esto creará cultos los martes, jueves y domingos.')) return

        setIsLoading(true)
        try {
            await generateCultosForMonth(new Date())
            router.refresh()
        } catch (error) {
            console.error(error)
            alert('Error al generar cultos')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="bg-secondary text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-secondary/20 hover:shadow-secondary/40 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
        >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarPlus className="w-5 h-5" />}
            Generar Mes
        </button>
    )
}
