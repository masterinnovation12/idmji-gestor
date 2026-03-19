import {
    getParticipationStats,
    getStatsSummary,
    getBibleReadingStats,
    getCultoTypes
} from './actions'
import StatsClient from './StatsClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Estadísticas - Panel Admin',
}

export default async function AdminStatsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    if (profile?.rol !== 'ADMIN') redirect('/dashboard')

    const currentYear = new Date().getFullYear()

    const [statsRes, summaryRes, bibleRes, typesRes] = await Promise.all([
        getParticipationStats(currentYear),
        getStatsSummary(currentYear),
        getBibleReadingStats(currentYear),
        getCultoTypes()
    ])

    return (
        <StatsClient
            initialStats={statsRes.data || []}
            initialSummary={summaryRes.data ?? { totalCultos: 0, totalParticipaciones: 0, hermanosActivos: 0 }}
            initialBibleStats={bibleRes.data ?? { topReadings: [], readingsByType: [], totalLecturas: 0 }}
            cultoTypes={typesRes.data || []}
            currentYear={currentYear}
        />
    )
}
