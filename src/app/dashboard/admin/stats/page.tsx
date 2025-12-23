import { getParticipationStats } from './actions'
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
    const result = await getParticipationStats(currentYear)

    return (
        <StatsClient
            initialStats={result.data || []}
            currentYear={currentYear}
        />
    )
}
