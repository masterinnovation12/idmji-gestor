import { getAllLecturas } from './actions'
import LecturasPageClient from './LecturasPageClient'

export const dynamic = 'force-dynamic'

interface Props {
    searchParams: { [key: string]: string | string[] | undefined }
}

export default async function LecturasPage({ searchParams }: Props) {
    const page = Number(searchParams['page']) || 1
    const soloRepetidas = searchParams['soloRepetidas'] === 'true'

    const { data: lecturas, count, totalPages } = await getAllLecturas(page, 20, {
        soloRepetidas
    })

    return (
        <LecturasPageClient
            initialLecturas={lecturas || []}
            initialTotalPages={totalPages || 1}
            initialPage={page}
        />
    )
}
