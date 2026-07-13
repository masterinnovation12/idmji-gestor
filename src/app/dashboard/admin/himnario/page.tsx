import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { can } from '@/lib/auth/permissions'
import { getCatalogo } from './actions'
import HimnarioAdminClient from './HimnarioAdminClient'

export const dynamic = 'force-dynamic'

export default async function HimnarioAdminPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol, permisos')
        .eq('id', user.id)
        .single()

    // ADMIN o usuario con el permiso granular de catálogo
    if (!can(profile, 'himnario.gestionar')) redirect('/dashboard')

    const [himnos, coros] = await Promise.all([getCatalogo('himno'), getCatalogo('coro')])

    return (
        <HimnarioAdminClient
            initialHimnos={himnos.data ?? []}
            initialCoros={coros.data ?? []}
        />
    )
}
