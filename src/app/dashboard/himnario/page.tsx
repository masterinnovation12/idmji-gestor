import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getHimnos, getCoros, getHimnaryCounts } from './actions'
import HimnarioClient from './HimnarioClient'

export const dynamic = 'force-dynamic'

export default async function HimnarioPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [himnosResult, corosResult, countsResult] = await Promise.all([
        getHimnos(),
        getCoros(),
        getHimnaryCounts()
    ])

    return (
        <HimnarioClient
            initialHimnos={himnosResult.data || []}
            initialCoros={corosResult.data || []}
            counts={countsResult.data || { himnos: 0, coros: 0 }}
        />
    )
}
