import { getCultoDetails } from './actions'
import { notFound } from 'next/navigation'
import CultoDetailClient from './CultoDetailClient'
import { createClient } from '@/lib/supabase/server'
import { isSonidoUser } from '@/lib/utils/isSonido'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function CultoDetailPage({ params }: PageProps) {
    const { id } = await params
    const { data: culto, error } = await getCultoDetails(id)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (error || !culto) {
        notFound()
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol, availability')
        .eq('id', user?.id || '')
        .single()

    const isSonido = isSonidoUser(profile ?? {})

    return <CultoDetailClient culto={culto} userId={user?.id || ''} readOnlyAssignments={isSonido} />
}
