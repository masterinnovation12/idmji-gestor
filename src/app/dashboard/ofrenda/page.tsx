import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveSedeIdForCurrentUser } from '@/lib/sede/activeSede'
import { getMiembros, getPlan } from './actions'
import { can } from '@/lib/auth/permissions'
import OfrendaPageClient from './OfrendaPageClient'

export const dynamic = 'force-dynamic'

export default async function OfrendaPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol, permisos')
        .eq('id', user.id)
        .single()

    const canEdit = profile?.rol === 'ADMIN' || profile?.rol === 'EDITOR'
    const isAdmin = profile?.rol === 'ADMIN'

    // Permisos granulares por sección (overrides en profiles.permisos)
    const perms = {
        laborGeneral: can(profile, 'laborGeneral.gestionar'),
        miembros: can(profile, 'hermanos.gestionar') || can(profile, 'laborGeneral.gestionar'),
        plano: can(profile, 'laborPlano.gestionar'),
        planoPersonas: can(profile, 'hermanos.gestionar') || can(profile, 'laborPlano.gestionar'),
        pulpito: can(profile, 'cultos.asignarHermanos'),
    }

    // Cargar datos del mes actual
    const now = new Date()
    const anioActual = now.getFullYear()
    const mesActual = now.getMonth() + 1

    const [miembrosResult, planResult, sedeId] = await Promise.all([
        getMiembros(),
        getPlan(anioActual, mesActual),
        getActiveSedeIdForCurrentUser(),
    ])

    return (
        // key por sede: al cambiar de sede desde el sidebar todas las labores
        // (generales, ofrenda y púlpito) se remontan con datos de la sede nueva.
        <OfrendaPageClient
            key={sedeId ?? 'propia'}
            initialMiembros={miembrosResult.data ?? []}
            initialPlan={planResult.data ?? null}
            initialAnio={anioActual}
            initialMes={mesActual}
            canEdit={canEdit}
            isAdmin={isAdmin}
            perms={perms}
        />
    )
}
