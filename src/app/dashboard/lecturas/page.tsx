import { getAllLecturas } from './actions'
import LecturasPageClient from './LecturasPageClient'
import { unstable_noStore as noStore } from 'next/cache'

// Forzar renderizado dinámico para que los searchParams siempre se lean frescos
export const dynamic = 'force-dynamic'

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LecturasPage({ searchParams }: Props) {
    noStore() // Disable caching so searches always work

    const params = await searchParams
    const page = Number(params['page']) || 1
    const soloRepetidas = params['soloRepetidas'] === 'true'
    const search = typeof params['search'] === 'string' ? params['search'] : undefined

    const { data: lecturas, count, totalPages } = await getAllLecturas(page, 20, {
        soloRepetidas,
        search
    })

    return (
        <LecturasPageClient
            initialLecturas={lecturas || []}
            initialTotalPages={totalPages || 1}
            initialPage={page}
        />
    )
}
