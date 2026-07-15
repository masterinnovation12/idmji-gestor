import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import ControlClient from './ControlClient'
import { getControlData, getControlSedes, getDataHealth, getTendencias } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminControlPage() {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) redirect('/dashboard')

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const [sedes, data, health, tendencias] = await Promise.all([
        getControlSedes(),
        getControlData(null, year, month),
        getDataHealth(null),
        getTendencias(null),
    ])

    if (!sedes.success || !sedes.data || !data.success || !data.data) {
        redirect('/dashboard/admin')
    }

    return (
        <ControlClient
            sedes={sedes.data}
            initialData={data.data}
            initialAlerts={health.success && health.data ? health.data : []}
            initialTendencias={tendencias.success && tendencias.data ? tendencias.data : null}
            initialYear={year}
            initialMonth={month}
        />
    )
}
