import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import HorariosClient from './HorariosClient'
import { getHorariosBootstrap, getHorariosSede } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminHorariosPage() {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) redirect('/dashboard')

    const bootstrap = await getHorariosBootstrap()
    if (!bootstrap.success || !bootstrap.data) redirect('/dashboard/admin')

    const sedes = bootstrap.data.sedes
    const initialSedeId = sedes.find(s => s.es_principal)?.id ?? sedes[0]?.id
    if (!initialSedeId) redirect('/dashboard/admin')

    const horarios = await getHorariosSede(initialSedeId)

    return (
        <HorariosClient
            sedes={sedes}
            tipos={bootstrap.data.tipos}
            initialSedeId={initialSedeId}
            initialHorarios={horarios.success && horarios.data ? horarios.data : []}
        />
    )
}
