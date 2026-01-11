import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import { redirect } from 'next/navigation'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { getUserAssignments } from './cultos/actions'


// Revalidation trigger
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            redirect('/login')
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        // Get today's culto
        // Get today's culto (Force Europe/Madrid timezone)
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Madrid',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date())
        const { data: cultosData } = await supabase
            .from('cultos')
            .select(`
                *,
                lecturas:lecturas_biblicas(*),
                tipo_culto:culto_types(nombre, color, tiene_ensenanza, tiene_testimonios, tiene_lectura_introduccion, tiene_lectura_finalizacion, tiene_himnos_y_coros),
                usuario_intro:profiles!id_usuario_intro(nombre, apellidos, avatar_url),
                usuario_finalizacion:profiles!id_usuario_finalizacion(nombre, apellidos, avatar_url),
                usuario_ensenanza:profiles!id_usuario_ensenanza(nombre, apellidos, avatar_url),
                usuario_testimonios:profiles!id_usuario_testimonios(nombre, apellidos, avatar_url)
            `)
            .eq('fecha', today)
            .order('hora_inicio', { ascending: true })
            .limit(1)

        let cultoMostrado = cultosData && cultosData.length > 0 ? cultosData[0] : null
        let esCultoHoy = true

        // Si no hay culto hoy, buscar el PRÓXIMO disponible
        if (!cultoMostrado) {
            const { data: nextCultos } = await supabase
                .from('cultos')
                .select(`
                *,
                lecturas:lecturas_biblicas(*),
                tipo_culto:culto_types(nombre, color, tiene_ensenanza, tiene_testimonios, tiene_lectura_introduccion, tiene_lectura_finalizacion, tiene_himnos_y_coros),
                usuario_intro:profiles!id_usuario_intro(nombre, apellidos, avatar_url),
                usuario_finalizacion:profiles!id_usuario_finalizacion(nombre, apellidos, avatar_url),
                usuario_ensenanza:profiles!id_usuario_ensenanza(nombre, apellidos, avatar_url),
                usuario_testimonios:profiles!id_usuario_testimonios(nombre, apellidos, avatar_url)
                `)
                .gt('fecha', today)
                .order('fecha', { ascending: true })
                .limit(1)

            if (nextCultos && nextCultos.length > 0) {
                cultoMostrado = nextCultos[0]
                esCultoHoy = false
            }
        }

        // Pre-compute reading state on server to avoid hydration mismatch
        let lecturaData: { showAddButton: boolean; lecturaIntro: any } | null = null
        let estudioBiblicoData: {
            esEstudio: boolean
            oracionInicio: boolean
            congregacionPie: boolean
            inicioAnticipado: { activo: boolean; minutos: number; horaReal: string; observaciones?: string } | null
        } | null = null

        if (cultoMostrado) {
            const tipoCulto = cultoMostrado.tipo_culto
            const lecturas = cultoMostrado.lecturas || []
            const debeTenerLectura = tipoCulto?.tiene_lectura_introduccion && !tipoCulto?.nombre?.toLowerCase().includes('estudio')
            const lecturaIntro = debeTenerLectura ? lecturas.find((l: any) => l.tipo_lectura === 'introduccion') : null

            lecturaData = {
                showAddButton: debeTenerLectura && !lecturaIntro,
                lecturaIntro: lecturaIntro || null
            }

            // Pre-compute Estudio Bíblico data (Only for Estudio Bíblico cults)
            const esEstudio = tipoCulto?.nombre?.toLowerCase().includes('estudio') || tipoCulto?.nombre?.toLowerCase().includes('biblico') || false
            if (esEstudio) {
                const metaData = cultoMostrado.meta_data as any
                const inicioAnticipado = metaData?.inicio_anticipado
                let horaReal = cultoMostrado.hora_inicio?.slice(0, 5) || '19:00'

                if (inicioAnticipado?.activo && cultoMostrado.hora_inicio) {
                    try {
                        const [hours, minutes] = cultoMostrado.hora_inicio.split(':').map(Number)
                        const minsBefore = inicioAnticipado.minutos || 5
                        let newMins = minutes - minsBefore
                        let newHours = hours
                        if (newMins < 0) {
                            newMins += 60
                            newHours -= 1
                        }
                        if (newHours < 0) {
                            newHours += 24
                        }
                        horaReal = `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
                    } catch (e) {
                        console.error('Error calculating initiation time:', e)
                        horaReal = cultoMostrado.hora_inicio?.slice(0, 5) || '19:00'
                    }
                }

                estudioBiblicoData = {
                    esEstudio: true,
                    oracionInicio: metaData?.protocolo?.oracion_inicio ?? true,
                    congregacionPie: metaData?.protocolo?.congregacion_pie ?? false,
                    inicioAnticipado: inicioAnticipado?.activo ? {
                        activo: true,
                        minutos: inicioAnticipado.minutos || 5,
                        horaReal,
                        observaciones: inicioAnticipado.observaciones || ''
                    } : null
                }
            }
        }

        // Pre-compute observaciones data (Universal - for ALL cult types)
        const observacionesData = cultoMostrado ?
            ((cultoMostrado.meta_data as any)?.observaciones || '') : ''

        // Get user assignments for current week
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

        const { data: initialAssignments } = await getUserAssignments(
            user.id,
            format(weekStart, 'yyyy-MM-dd'),
            format(weekEnd, 'yyyy-MM-dd')
        )

        // Get stats
        const { count: totalCultos } = await supabase
            .from('cultos')
            .select('*', { count: 'exact', head: true })

        const { count: totalLecturas } = await supabase
            .from('lecturas_biblicas')
            .select('*', { count: 'exact', head: true })

        return (
            <DashboardClient
                user={{ ...profile, id: user.id }}
                culto={cultoMostrado}
                esHoy={esCultoHoy}
                lecturaData={lecturaData}
                estudioBiblicoData={estudioBiblicoData}
                observacionesData={observacionesData}
                initialAssignments={initialAssignments || []}
                stats={{
                    totalCultos: totalCultos || 0,
                    totalLecturas: totalLecturas || 0
                }}
            />
        )
    } catch (error) {
        console.error('CRITICAL ERROR in Dashboard Page:', error)
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white dark:bg-slate-950 rounded-lg">
                <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Error cargando el Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                    Ha ocurrido un error al cargar los datos. Por favor intenta recargar la página.
                </p>
                <div className="w-full max-w-lg bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-4 overflow-x-auto text-left">
                    <pre className="text-xs text-red-500 font-mono whitespace-pre-wrap">
                        {error instanceof Error ? error.message : JSON.stringify(error)}
                    </pre>
                </div>
            </div>
        )
    }
}
