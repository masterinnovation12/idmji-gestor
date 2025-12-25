import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellidos, rol')
        .eq('id', user.id)
        .single()

    // Get today's culto
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data: cultosData, error: cultosError } = await supabase
        .from('cultos')
        .select(`
      *,
      tipo_culto:culto_types(nombre, color, tiene_ensenanza, tiene_testimonios, tiene_lectura_introduccion, tiene_lectura_finalizacion, tiene_himnos_y_coros),
      usuario_intro:profiles!id_usuario_intro(nombre, apellidos, avatar_url),
      usuario_finalizacion:profiles!id_usuario_finalizacion(nombre, apellidos, avatar_url),
      usuario_ensenanza:profiles!id_usuario_ensenanza(nombre, apellidos, avatar_url),
      usuario_testimonios:profiles!id_usuario_testimonios(nombre, apellidos, avatar_url)
    `)
        .eq('fecha', today)
        .order('hora_inicio', { ascending: true })
        .limit(1)

    const cultoHoy = cultosData && cultosData.length > 0 ? cultosData[0] : null

    // Get stats
    const { count: totalCultos } = await supabase
        .from('cultos')
        .select('*', { count: 'exact', head: true })

    const { count: totalLecturas } = await supabase
        .from('lecturas_biblicas')
        .select('*', { count: 'exact', head: true })

    return (
        <DashboardClient
            user={profile}
            cultoHoy={cultoHoy}
            stats={{
                totalCultos: totalCultos || 0,
                totalLecturas: totalLecturas || 0,
            }}
        />
    )
}
