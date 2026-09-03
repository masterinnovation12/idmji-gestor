/**
 * Página Archivos: visible para cualquier usuario autenticado.
 * El CSV de Google no puede bloquear el TTFB (timeout interno ~35s).
 * Si hay caché o Google responde en <2s, pintamos datos; si no, el cliente
 * pide /api/archivos mientras el fetch de servidor sigue calentando caché.
 */
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArchivosClient from './ArchivosClient'
import {
    getSheetCSVUrl,
    fetchAndParseSheetCSV,
    type SheetSourceId,
    type SheetFetchMeta,
} from '@/lib/csv-sheets'

export const dynamic = 'force-dynamic'

const SSR_BUDGET_MS = 2_000

function withBudget<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), ms)
        promise.then(
            (value) => {
                clearTimeout(timer)
                resolve(value)
            },
            () => {
                clearTimeout(timer)
                resolve(null)
            },
        )
    })
}

export default async function ArchivosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const initialData: Partial<Record<SheetSourceId, Record<string, string>[]>> = {}
    const initialMeta: Partial<Record<SheetSourceId, SheetFetchMeta>> = {}

    const url = getSheetCSVUrl('ensenanzas')
    if (url) {
        const raced = await withBudget(fetchAndParseSheetCSV(url), SSR_BUDGET_MS)
        if (raced) {
            initialData.ensenanzas = raced.data
            initialMeta.ensenanzas = raced.meta
        }
    }

    return (
        <ArchivosClient
            initialData={initialData}
            initialMeta={Object.keys(initialMeta).length > 0 ? initialMeta : undefined}
        />
    )
}
