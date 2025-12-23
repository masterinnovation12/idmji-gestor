'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Crear o actualizar lectura bíblica
 * Detecta si la lectura ya existe (repetida)
 */
export async function saveLectura(
    cultoId: string,
    tipoLectura: 'introduccion' | 'finalizacion',
    libro: string,
    capituloInicio: number,
    versiculoInicio: number,
    capituloFin: number | null,
    versiculoFin: number | null,
    userId: string
) {
    const supabase = await createClient()

    // Buscar si esta lectura ya existe
    const { data: existente } = await supabase
        .from('lecturas_biblicas')
        .select('id, fecha_hora_registro, culto_id, id_usuario_lector, cultos!inner(fecha)')
        .eq('libro', libro)
        .eq('capitulo_inicio', capituloInicio)
        .eq('versiculo_inicio', versiculoInicio)
        .eq('capitulo_fin', capituloFin || capituloInicio)
        .eq('versiculo_fin', versiculoFin || versiculoInicio)
        .eq('es_repetida', false)
        .limit(1)
        .single()

    let esRepetida = false
    let lecturaOriginalId = null

    if (existente) {
        // La lectura ya existe - es repetida
        esRepetida = true
        lecturaOriginalId = existente.id

        return {
            requiresConfirmation: true,
            existingReading: {
                id: existente.id,
                fecha: Array.isArray(existente.cultos) 
                    ? (existente.cultos[0] as unknown as { fecha: string }).fecha 
                    : (existente.cultos as unknown as { fecha: string }).fecha,
                lector: existente.id_usuario_lector,
            }
        }
    }

    // Insertar la lectura
    const { data, error } = await supabase
        .from('lecturas_biblicas')
        .insert({
            culto_id: cultoId,
            tipo_lectura: tipoLectura,
            libro,
            capitulo_inicio: capituloInicio,
            versiculo_inicio: versiculoInicio,
            capitulo_fin: capituloFin || capituloInicio,
            versiculo_fin: versiculoFin || versiculoInicio,
            id_usuario_lector: userId,
            es_repetida: esRepetida,
            lectura_original_id: lecturaOriginalId,
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true, data }
}

/**
 * Confirmar lectura repetida
 */
export async function confirmRepeatedLectura(
    cultoId: string,
    tipoLectura: 'introduccion' | 'finalizacion',
    libro: string,
    capituloInicio: number,
    versiculoInicio: number,
    capituloFin: number | null,
    versiculoFin: number | null,
    userId: string,
    lecturaOriginalId: string
) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('lecturas_biblicas')
        .insert({
            culto_id: cultoId,
            tipo_lectura: tipoLectura,
            libro,
            capitulo_inicio: capituloInicio,
            versiculo_inicio: versiculoInicio,
            capitulo_fin: capituloFin || capituloInicio,
            versiculo_fin: versiculoFin || versiculoInicio,
            id_usuario_lector: userId,
            es_repetida: true,
            lectura_original_id: lecturaOriginalId,
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true, data }
}

/**
 * Obtener lecturas de un culto
 */
export async function getLecturasByCulto(cultoId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('lecturas_biblicas')
        .select(`
      *,
      lector:profiles!id_usuario_lector(nombre, apellidos),
      lectura_original:lecturas_biblicas!lectura_original_id(
        fecha_hora_registro,
        culto:cultos(fecha)
      )
    `)
        .eq('culto_id', cultoId)
        .order('tipo_lectura', { ascending: true })

    if (error) {
        return { error: error.message }
    }

    return { data }
}

/**
 * Obtener todas las lecturas (para página de lecturas)
 */
export async function getAllLecturas(
    page: number = 1,
    limit: number = 20,
    filters?: {
        startDate?: string
        endDate?: string
        tipoCulto?: string
        tipoLectura?: string
        soloRepetidas?: boolean
    }
) {
    const supabase = await createClient()

    let query = supabase
        .from('lecturas_biblicas')
        .select(`
      *,
      culto:cultos(fecha, tipo_culto:culto_types(nombre)),
      lector:profiles!id_usuario_lector(nombre, apellidos)
    `, { count: 'exact' })
        .order('fecha_hora_registro', { ascending: false })

    if (filters?.soloRepetidas) {
        query = query.eq('es_repetida', true)
    }

    if (filters?.tipoLectura) {
        query = query.eq('tipo_lectura', filters.tipoLectura)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
        return { error: error.message }
    }

    return {
        data,
        count: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0
    }
}

/**
 * Obtener lista de libros de la Biblia
 */
export async function getBibliaLibros() {
    const supabase = await createClient()

    // 1. Fetch all chapters ordered
    const { data: rows, error } = await supabase
        .from('biblia')
        .select('*')
        .order('orden')
        .order('capitulo')

    if (error) {
        return { error: error.message }
    }

    // 2. Aggregate into BibleBook[] structure
    interface BibleBook {
        id: number
        nombre: string
        testamento: string
        abreviatura: string
        capitulos: { n: number, v: number }[]
    }
    const booksMap = new Map<string, BibleBook>()

    rows.forEach((row) => {
        if (!booksMap.has(row.libro)) {
            booksMap.set(row.libro, {
                id: booksMap.size + 1, // Simulated ID for frontend
                nombre: row.libro,
                testamento: row.testamento,
                abreviatura: row.abreviatura,
                capitulos: []
            })
        }
        booksMap.get(row.libro)?.capitulos.push({
            n: row.capitulo,
            v: row.num_versiculos
        })
    })

    return { data: Array.from(booksMap.values()) }
}
