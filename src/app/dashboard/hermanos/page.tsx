import { getHermanos, getHermanosStats } from './actions'
import HermanosClient from './HermanosClient'

export default async function HermanosPage() {
    const [hermanosResult, stats] = await Promise.all([
        getHermanos(),
        getHermanosStats()
    ])

    return (
        <HermanosClient
            initialHermanos={hermanosResult.data || []}
            stats={stats}
        />
    )
}
