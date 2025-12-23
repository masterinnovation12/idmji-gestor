import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUsers, getUserCounts, getRoles } from './actions'
import UsersClient from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    if (profile?.rol !== 'ADMIN') redirect('/dashboard')

    const [usersResult, countsResult, rolesResult] = await Promise.all([
        getUsers(),
        getUserCounts(),
        getRoles()
    ])

    return (
        <UsersClient
            initialUsers={usersResult.data || []}
            counts={countsResult.data || { total: 0, pulpito: 0, admins: 0 }}
            availableRoles={rolesResult.data || []}
        />
    )
}
