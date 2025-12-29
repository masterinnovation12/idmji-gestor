import { getFestivos } from './actions'
import FestivosPageClient from './FestivosPageClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function FestivosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if user is ADMIN
    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    if (profile?.rol !== 'ADMIN') {
        redirect('/dashboard')
    }

    // Fetch all holidays to avoid missing future ones
    const { data: festivos } = await getFestivos()

    return <FestivosPageClient initialFestivos={festivos || []} />
}
