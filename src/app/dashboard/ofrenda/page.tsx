import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMiembros, getPlan } from './actions'
import OfrendaPageClient from './OfrendaPageClient'

export const dynamic = 'force-dynamic'

export default async function OfrendaPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single()

    const canEdit = profile?.rol === 'ADMIN' || profile?.rol === 'EDITOR'

    // Cargar datos del mes actual
    const now = new Date()
    const anioActual = now.getFullYear()
    const mesActual = now.getMonth() + 1

    const [miembrosResult, planResult] = await Promise.all([
        getMiembros(),
        getPlan(anioActual, mesActual),
    ])

    return (
        <OfrendaPageClient
            initialMiembros={miembrosResult.data ?? []}
            initialPlan={planResult.data ?? null}
            initialAnio={anioActual}
            initialMes={mesActual}
            canEdit={canEdit}
        />
    )
}
