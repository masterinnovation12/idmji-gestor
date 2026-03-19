import { Suspense } from 'react'
import { getAllLecturas } from '@/app/dashboard/lecturas/actions'
import LecturasPageClient from '@/app/dashboard/lecturas/LecturasPageClient'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HistorialLecturasPage({ searchParams }: Props) {
    noStore()

    const params = await searchParams
    const page = Number(params['page']) || 1
    const soloRepetidas = params['soloRepetidas'] === 'true'
    const search = typeof params['search'] === 'string' ? params['search'] : undefined
    const startDate = typeof params['startDate'] === 'string' ? params['startDate'] : undefined
    const endDate = typeof params['endDate'] === 'string' ? params['endDate'] : undefined
    const tipoCulto = typeof params['tipoCulto'] === 'string' ? params['tipoCulto'] : undefined
    const lectorId = typeof params['lectorId'] === 'string' ? params['lectorId'] : undefined
    const testamento = typeof params['testamento'] === 'string' ? (params['testamento'] as 'AT' | 'NT' | undefined) : undefined
    const tipoLectura = typeof params['tipoLectura'] === 'string' ? params['tipoLectura'] : undefined
    const capitulo = typeof params['capitulo'] === 'string' ? parseInt(params['capitulo']) : undefined

    const { data: lecturas, totalPages } = await getAllLecturas(page, 20, {
        soloRepetidas,
        search,
        startDate,
        endDate,
        tipoCulto,
        lectorId,
        testamento,
        tipoLectura,
        capitulo
    })

    return (
        <Suspense fallback={<div className="p-8 animate-pulse bg-muted/30 rounded-xl" />}>
            <LecturasPageClient
                initialLecturas={lecturas || []}
                initialTotalPages={totalPages || 1}
                initialPage={page}
            />
        </Suspense>
    )
}
