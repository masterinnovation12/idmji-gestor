import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import Hermano360Client from './Hermano360Client'
import { getHermano360 } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminHermano360Page({ params }: { params: Promise<{ id: string }> }) {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) redirect('/dashboard')

    const { id } = await params
    const res = await getHermano360(id)
    if (!res.success || !res.data) redirect('/dashboard/admin/control')

    return <Hermano360Client hermano={res.data} />
}
