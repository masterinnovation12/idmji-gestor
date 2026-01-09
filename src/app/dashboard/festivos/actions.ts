'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createFestivo(formData: FormData) {
    const supabase = await createClient()

    const fecha = formData.get('fecha') as string
    const tipo = formData.get('tipo') as string
    const descripcion = formData.get('descripcion') as string

    // 1. Crear el festivo
    const { error: festivoError } = await supabase.from('festivos').insert({
        fecha,
        tipo,
        descripcion: descripcion || null,
    })

    if (festivoError) {
        return { error: festivoError.message }
    }

    // 2. Sincronizar con cultos: Buscar cultos en esa fecha que NO sean festivos ya
    const { data: cultosToUpdate } = await supabase
        .from('cultos')
        .select('id, hora_inicio')
        .eq('fecha', fecha)
        .eq('es_laborable_festivo', false)

    if (cultosToUpdate && cultosToUpdate.length > 0) {
        for (const culto of cultosToUpdate) {
            // Calcular nueva hora: -1h (lógica de festivo)
            const [h, m] = culto.hora_inicio.split(':').map(Number)
            const newH = (h - 1 + 24) % 24
            const newHora = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')} `

            await supabase
                .from('cultos')
                .update({
                    es_laborable_festivo: true,
                    hora_inicio: newHora
                })
                .eq('id', culto.id)
        }
    }

    revalidatePath('/dashboard/festivos')
    revalidatePath('/dashboard/cultos')
    return { success: true }
}

export async function deleteFestivo(id: number) {
    const supabase = await createClient()

    // 1. Obtener la fecha del festivo antes de borrarlo
    const { data: festivo } = await supabase
        .from('festivos')
        .select('fecha')
        .eq('id', id)
        .single()

    if (!festivo) return { error: 'Festivo no encontrado' }

    // 2. Eliminar el festivo
    const { error: deleteError } = await supabase
        .from('festivos')
        .delete()
        .eq('id', id)

    if (deleteError) {
        return { error: deleteError.message }
    }

    // 3. Sincronizar con cultos: Buscar cultos en esa fecha que SEAN festivos
    // Nota: Solo revertimos si ya no quedan otros festivos en ese día (aunque la UI probablemente solo permita uno)
    const { count } = await supabase
        .from('festivos')
        .select('*', { count: 'exact', head: true })
        .eq('fecha', festivo.fecha)

    if (count === 0) {
        const { data: cultosToUpdate } = await supabase
            .from('cultos')
            .select('id, hora_inicio')
            .eq('fecha', festivo.fecha)
            .eq('es_laborable_festivo', true)

        if (cultosToUpdate && cultosToUpdate.length > 0) {
            for (const culto of cultosToUpdate) {
                // Calcular nueva hora: +1h (restaurar horario normal)
                const [h, m] = culto.hora_inicio.split(':').map(Number)
                const newH = (h + 1) % 24
                const newHora = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')} `

                await supabase
                    .from('cultos')
                    .update({
                        es_laborable_festivo: false,
                        hora_inicio: newHora
                    })
                    .eq('id', culto.id)
            }
        }
    }

    revalidatePath('/dashboard/festivos')
    revalidatePath('/dashboard/cultos')
    return { success: true }
}

export async function getFestivos(year?: number) {
    const supabase = await createClient()

    let query = supabase
        .from('festivos')
        .select('*')
        .order('fecha', { ascending: true })

    if (year) {
        query = query
            .gte('fecha', `${year}-01-01`)
            .lte('fecha', `${year} -12 - 31`)
    }

    const { data: festivosData, error: festivosError } = await query

    if (festivosError) {
        return { error: festivosError.message }
    }

    // Obtener fechas para buscar cultos asociados
    const fechas = festivosData.map((f: { fecha: string }) => f.fecha)

    const cultosMap: Record<string, { id: string; fecha: string; hora_inicio: string; tipo_culto: { nombre: string } }> = {}

    if (fechas.length > 0) {
        const { data: cultosData } = await supabase
            .from('cultos')
            .select(`
id,
    fecha,
    hora_inicio,
    tipo_culto: culto_types(nombre)
            `)
            .in('fecha', fechas)

        if (cultosData) {
            (cultosData as unknown as { id: string; fecha: string; hora_inicio: string; tipo_culto: { nombre: string } }[]).forEach((c) => {
                // Si hay múltiples cultos, cogemos el primero (o podríamos listar todos)
                if (!cultosMap[c.fecha]) {
                    cultosMap[c.fecha] = c
                }
            })
        }
    }

    // Combinar datos
    const formattedData = (festivosData as unknown as { id: number; fecha: string; tipo: string; descripcion: string | null }[]).map((festivo) => {
        const culto = cultosMap[festivo.fecha]
        return {
            ...festivo,
            culto: culto ? {
                id: culto.id,
                hora: culto.hora_inicio,
                tipo: culto.tipo_culto?.nombre || 'Culto General'
            } : null
        }
    })

    return { data: formattedData }
}

export async function seedRandomFestivos(year: number) {
    const supabase = await createClient()

    // Generar 5 fechas aleatorias
    const randomDays = Array.from({ length: 5 }, () => {
        const month = Math.floor(Math.random() * 12) + 1
        const day = Math.floor(Math.random() * 28) + 1
        return `${year} -${String(month).padStart(2, '0')} -${String(day).padStart(2, '0')} `
    })

    const tipos = ['nacional', 'autonomico', 'local', 'laborable_festivo']

    for (const fecha of randomDays) {
        const tipo = tipos[Math.floor(Math.random() * tipos.length)]
        await supabase.from('festivos').insert({
            fecha,
            tipo,
            descripcion: 'Festivo de Prueba (Aleatorio)',
        })

        // No necesitamos sincronizar manualmente aquí ya que es solo prueba, 
        // pero idealmente deberíamos llamar a la lógica de sync si fuera real.
        // Para prueba simple nos vale con insertar.
    }

    revalidatePath('/dashboard/festivos')
    return { success: true }
}
