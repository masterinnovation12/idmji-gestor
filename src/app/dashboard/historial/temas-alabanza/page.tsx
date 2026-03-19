import { getAllTemasAlabanza } from './actions'
import TemasAlabanzaClient from './TemasAlabanzaClient'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TemasAlabanzaPage({ searchParams }: Props) {
    noStore()

    const params = await searchParams
    const page = Number(params['page']) || 1
    const temaKey = typeof params['temaKey'] === 'string' ? params['temaKey'] : undefined
    const hermanoId = typeof params['hermanoId'] === 'string' ? params['hermanoId'] : undefined
    const startDate = typeof params['startDate'] === 'string' ? params['startDate'] : undefined
    const endDate = typeof params['endDate'] === 'string' ? params['endDate'] : undefined

    const { data, totalPages } = await getAllTemasAlabanza(page, 20, {
        temaKey,
        hermanoId,
        startDate,
        endDate
    })

    return (
        <TemasAlabanzaClient
            initialData={data || []}
            initialTotalPages={totalPages || 1}
            initialPage={page}
        />
    )
}
