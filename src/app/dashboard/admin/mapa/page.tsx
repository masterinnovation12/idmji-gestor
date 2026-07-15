import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/guards'
import MapaClient from './MapaClient'
import { getMapaData } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminMapaPage() {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) redirect('/dashboard')

    const data = await getMapaData()
    if (!data.success || !data.data) redirect('/dashboard/admin')

    return <MapaClient initialSedes={data.data} />
}
