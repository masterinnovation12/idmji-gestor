import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import ComparadorClient from './ComparadorClient'
import { getControlData, getControlSedes } from '../control/actions'

export const dynamic = 'force-dynamic'

export default async function AdminComparadorPage() {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) redirect('/dashboard')

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const [sedes, data] = await Promise.all([
        getControlSedes(),
        getControlData(null, year, month),
    ])

    if (!sedes.success || !sedes.data || !data.success || !data.data) {
        redirect('/dashboard/admin')
    }

    return (
        <ComparadorClient
            sedes={sedes.data}
            initialData={data.data}
            initialYear={year}
            initialMonth={month}
        />
    )
}
