import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { getUserAssignments } from './cultos/actions'
import nextDynamic from 'next/dynamic'
const DashboardClient = nextDynamic(() => import('./DashboardClient'))


// Revalidation trigger
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            redirect('/login')
        }

        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Madrid',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date())

        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

        // 1. DISPATCH CONCURRENT REQUESTS (Paralelización de llamadas para reducir TTFB)
        const [
            profileRes,
            cultosDataRes,
            initialAssignmentsRes
        ] = await Promise.all([
            // Get user profile
            supabase.from('profiles').select('*').eq('id', user.id).single(),

            // Get today's culto
            supabase.from('cultos').select(`
                *,
                lecturas:lecturas_biblicas(*),
                plan_himnos_coros(
                    *,
                    himno:himnos(numero, titulo, duracion_segundos),
                    coro:coros(numero, titulo, duracion_segundos)
                ),
                tipo_culto:culto_types(nombre, color, tiene_ensenanza, tiene_testimonios, tiene_lectura_introduccion, tiene_lectura_finalizacion, tiene_himnos_y_coros),
                usuario_intro:profiles!id_usuario_intro(nombre, apellidos, avatar_url),
                usuario_finalizacion:profiles!id_usuario_finalizacion(nombre, apellidos, avatar_url),
                usuario_ensenanza:profiles!id_usuario_ensenanza(nombre, apellidos, avatar_url),
                usuario_testimonios:profiles!id_usuario_testimonios(nombre, apellidos, avatar_url)
            `).eq('fecha', today).order('hora_inicio', { ascending: true }).limit(1),

            // Get user assignments for current week
            getUserAssignments(user.id, format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')),

        ])

        const profile = profileRes.data
        const cultosData = cultosDataRes.data
        const initialAssignments = initialAssignmentsRes.data
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

        return (
            <Suspense fallback={<div className="p-4 md:p-8 animate-pulse rounded-2xl bg-muted/30 h-[220px]" />}>
                <DashboardClient
                    user={{ ...profile, id: user.id }}
                    culto={cultoMostrado}
                    esHoy={esCultoHoy}
                    initialAssignments={initialAssignments || []}
                    initialDate={cultoMostrado?.fecha || today}
                />
            </Suspense>
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
