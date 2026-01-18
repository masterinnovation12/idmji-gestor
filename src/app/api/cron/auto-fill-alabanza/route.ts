import { NextResponse } from 'next/server'
import { autoFillAlabanzaSequence, autoFillEnsenanzaSequence } from '@/app/dashboard/himnos/actions'
import { addWeeks } from 'date-fns'

/**
 * Endpoint para el cron job de Vercel
 * Se encarga de rellenar la secuencia de Alabanza y Enseñanza para la semana entrante.
 * Frecuencia recomendada: Todos los domingos a las 00:00 (o 01:00)
 */
export async function GET(request: Request) {
    // Protección opcional: Verificar token de Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('No autorizado', { status: 401 })
    }

    try {
        console.log('--- CRON JOB: autoFillSequences ---')
        
        // El domingo a las 00:00, "la semana actual" sigue siendo la que termina hoy.
        // Queremos rellenar la semana que empieza MAÑANA (lunes).
        const nextWeekDate = addWeeks(new Date(), 1)
        
        const resA = await autoFillAlabanzaSequence(nextWeekDate)
        const resE = await autoFillEnsenanzaSequence(nextWeekDate)
        
        if (resA.error || resE.error) {
            console.error('Error en el cron job:', resA.error || resE.error)
            return NextResponse.json({ success: false, error: resA.error || resE.error }, { status: 500 })
        }

        console.log('Cron job completado con éxito')
        return NextResponse.json({ 
            success: true, 
            message: 'Secuencias de la próxima semana generadas correctamente',
            alabanza: resA.data,
            ensenanza: resE.data
        })
    } catch (error: any) {
        console.error('Fallo crítico en cron job:', error.message)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
