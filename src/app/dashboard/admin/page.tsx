import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminHubClient from './AdminHubClient'

export const dynamic = 'force-dynamic'

export default async function AdminHubPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    if (profile?.rol !== 'ADMIN') redirect('/dashboard')

    return <AdminHubClient />
}
