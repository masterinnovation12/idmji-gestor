import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import PersonasClient from './PersonasClient'
import { getPersonasBootstrap, getPersonasSede } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminPersonasPage() {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) redirect('/dashboard')

    const bootstrap = await getPersonasBootstrap()
    if (!bootstrap.success || !bootstrap.data || bootstrap.data.length === 0) redirect('/dashboard/admin')

    const sedes = bootstrap.data
    const initialSedeId = sedes.find(s => s.es_principal)?.id ?? sedes[0].id
    const personas = await getPersonasSede(initialSedeId)

    return (
        <PersonasClient
            sedes={sedes}
            initialSedeId={initialSedeId}
            initialPersonas={personas.success && personas.data ? personas.data : { pulpito: [], labor: [], plano: [] }}
        />
    )
}
