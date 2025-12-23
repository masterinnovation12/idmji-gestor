import { getCultosForMonth } from './actions'
import CultosPageClient from './CultosPageClient'

export const dynamic = 'force-dynamic'

export default async function CultosPage() {
    const now = new Date()
    const { data: cultos } = await getCultosForMonth(now.getFullYear(), now.getMonth())

    return <CultosPageClient initialCultos={cultos || []} />
}
