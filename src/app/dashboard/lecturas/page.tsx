import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LecturasRedirectPage({ searchParams }: Props) {
    const params = await searchParams
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
        if (Array.isArray(v)) v.forEach((x) => q.append(k, x))
        else if (v) q.set(k, v)
    })
    const query = q.toString()
    redirect(`/dashboard/historial/lecturas${query ? `?${query}` : ''}`)
}
