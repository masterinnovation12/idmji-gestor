'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createFestivo(formData: FormData) {
    const supabase = await createClient()

    const fecha = formData.get('fecha') as string
    const tipo = formData.get('tipo') as string
    const descripcion = formData.get('descripcion') as string

    const { error } = await supabase.from('festivos').insert({
        fecha,
        tipo,
        descripcion: descripcion || null,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/festivos')
    return { success: true }
}

export async function deleteFestivo(id: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('festivos')
        .delete()
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/festivos')
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
            .lte('fecha', `${year}-12-31`)
    }

    const { data, error } = await query

    if (error) {
        return { error: error.message }
    }

    return { data }
}
