import { getCultosForMonth } from './actions'
import { getActiveSedeIdForCurrentUser } from '@/lib/sede/activeSede'
import CultosPageClient from './CultosPageClient'

export const dynamic = 'force-dynamic'

export default async function CultosPage() {
    const now = new Date()
    const [{ data: cultos }, sedeId] = await Promise.all([
        getCultosForMonth(now.getFullYear(), now.getMonth()),
        getActiveSedeIdForCurrentUser(),
    ])

    // key por sede: al cambiar de sede desde el sidebar el calendario se
    // remonta y recarga en lugar de conservar los cultos de la sede anterior.
    return <CultosPageClient key={sedeId ?? 'propia'} initialCultos={cultos || []} initialDate={now} />
}
