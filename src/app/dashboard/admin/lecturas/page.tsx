import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import LecturasAdminClient from './LecturasAdminClient'
import { getLecturasPorSede, getLecturasSedes } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminLecturasPage() {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) redirect('/dashboard')

    // Por defecto: histórico completo (year = null) y todas las sedes.
    const [sedes, data] = await Promise.all([
        getLecturasSedes(),
        getLecturasPorSede(null, null),
    ])

    if (!sedes.success || !sedes.data || !data.success || !data.data) {
        redirect('/dashboard/admin')
    }

    return (
        <LecturasAdminClient
            sedes={sedes.data}
            initialData={data.data}
        />
    )
}
