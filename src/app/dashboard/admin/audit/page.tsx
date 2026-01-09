import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMovimientos, getMovimientosTipos } from './actions'
import AuditClient from './AuditClient'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    if (profile?.rol !== 'ADMIN') redirect('/dashboard')

    const [movimientosResult, tiposResult] = await Promise.all([
        getMovimientos(1, 20),
        getMovimientosTipos()
    ])

    return (
        <AuditClient
            initialData={movimientosResult.data?.data || []}
            initialTotal={movimientosResult.data?.total || 0}
            initialTipos={tiposResult.data || []}
        />
    )
}
