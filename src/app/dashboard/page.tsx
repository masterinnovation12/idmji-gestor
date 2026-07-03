import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'
import { redirect, unstable_rethrow } from 'next/navigation'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { getUserAssignments } from './cultos/actions'
import DashboardClient from './DashboardClient'

// Revalidation trigger
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            redirect('/login')
        }

        const today = format(new Date(), 'yyyy-MM-dd')

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

            // Get today's cultos
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
            `).eq('fecha', today).order('hora_inicio', { ascending: true }),

            // Get user assignments for current week
            getUserAssignments(user.id, format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')),

        ])

        const profile = profileRes.data
        const cultosData = cultosDataRes.data || []
        const initialAssignments = initialAssignmentsRes.data
        let cultoMostrado = null
        let esCultoHoy = true

        if (cultosData.length > 0) {
            if (cultosData.length === 1) {
                cultoMostrado = cultosData[0]
            } else {
                const currentHour = new Date().getHours()
                if (currentHour < 10) {
                    // Antes de las 10:00 -> Mostramos el de las 10h
                    cultoMostrado = cultosData.find(c => c.hora_inicio.startsWith('10')) || cultosData[0]
                } else if (currentHour >= 10 && currentHour < 17) {
                    // Entre las 10:00 y las 17:00 -> Si el de las 10h ya se completó (realizado), mostramos el de las 17h
                    const c10 = cultosData.find(c => c.hora_inicio.startsWith('10'))
                    if (c10?.estado === 'realizado') {
                        cultoMostrado = cultosData.find(c => c.hora_inicio.startsWith('17')) || c10
                    } else {
                        cultoMostrado = c10 || cultosData[0]
                    }
                } else {
                    // Después de las 17:00 -> Mostramos el de las 17h
                    cultoMostrado = cultosData.find(c => c.hora_inicio.startsWith('17')) || cultosData[1]
                }
            }
        }

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
                .order('hora_inicio', { ascending: true })
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
        // redirect() funciona lanzando NEXT_REDIRECT: hay que relanzarlo para que
        // Next ejecute la redirección en vez de pintar el fallback de error.
        unstable_rethrow(error)
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
