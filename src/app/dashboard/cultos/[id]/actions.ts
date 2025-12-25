'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Actualizar asignación de hermano en un culto
 * Tipos de asignación según tipo de culto:
 * - Estudio Bíblico: introduccion, finalizacion
 * - Alabanza: introduccion, finalizacion
 * - Enseñanza: introduccion, ensenanza, testimonios (NO finalizacion)
 */
export async function updateAssignment(
    cultoId: string,
    tipoAsignacion: 'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios',
    userId: string | null
) {
    const supabase = await createClient()

    const fieldMap = {
        introduccion: 'id_usuario_intro',
        finalizacion: 'id_usuario_finalizacion',
        ensenanza: 'id_usuario_ensenanza',
        testimonios: 'id_usuario_testimonios',
    }

    const field = fieldMap[tipoAsignacion]

    const { error } = await supabase
        .from('cultos')
        .update({ [field]: userId })
        .eq('id', cultoId)

    if (error) {
        return { error: error.message }
    }

    // Registrar en movimientos
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.from('movimientos').insert({
            id_usuario: user.id,
            tipo: 'cambio_asignacion',
            descripcion: `Cambio de ${tipoAsignacion} en culto`,
            culto_id: cultoId,
        })
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true }
}

/**
 * Buscar hermanos con pulpito = true para asignaciones
 */
export async function searchProfiles(query: string = '') {
    const supabase = await createClient()

    let dbQuery = supabase
        .from('profiles')
        .select('id, nombre, apellidos, avatar_url, pulpito')
        .eq('pulpito', true)
        .order('nombre', { ascending: true })

    if (query) {
        dbQuery = dbQuery.or(`nombre.ilike.%${query}%,apellidos.ilike.%${query}%`)
    }

    const { data, error } = await dbQuery.limit(20)

    if (error) {
        return { error: error.message }
    }

    return { data }
}

/**
 * Obtener detalles completos de un culto
 */
export async function getCultoDetails(cultoId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('cultos')
        .select(`
      *,
      tipo_culto:culto_types(*),
      usuario_intro:profiles!id_usuario_intro(id, nombre, apellidos, avatar_url),
      usuario_finalizacion:profiles!id_usuario_finalizacion(id, nombre, apellidos, avatar_url),
      usuario_ensenanza:profiles!id_usuario_ensenanza(id, nombre, apellidos, avatar_url),
      usuario_testimonios:profiles!id_usuario_testimonios(id, nombre, apellidos, avatar_url)
    `)
        .eq('id', cultoId)
        .single()

    if (error) {
        return { error: error.message }
    }

    return { data }
}
