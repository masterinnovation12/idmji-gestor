'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'

/**
 * Crear o actualizar lectura bíblica
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
    noStore()
    const supabase = await createClient()

    // 1. Verificar si ya existe una lectura de este TIPO para este CULTO
    // Si existe, la actualizamos en lugar de insertar una nueva
    const { data: existenteMismoTipo } = await supabase
        .from('lecturas_biblicas')
        .select('id')
        .eq('culto_id', cultoId)
        .eq('tipo_lectura', tipoLectura)
        .limit(1)
        .single()

    // 2. Buscar si esta CITAS ya existe en otro culto (detección de repetida)
    const { data: existenteCita } = await supabase
        .from('lecturas_biblicas')
        .select('id, created_at, culto_id, id_usuario_lector, cultos!inner(fecha)')
        .eq('libro', libro)
        .eq('capitulo_inicio', capituloInicio)
        .eq('versiculo_inicio', versiculoInicio)
        .eq('capitulo_fin', capituloFin || capituloInicio)
        .eq('versiculo_fin', versiculoFin || versiculoInicio)
        .eq('es_repetida', false)
        .limit(1)
        .single()

    if (existenteCita && (!existenteMismoTipo || existenteCita.id !== existenteMismoTipo.id)) {
        return {
            requiresConfirmation: true,
            existingReading: {
                id: existenteCita.id,
                fecha: Array.isArray(existenteCita.cultos)
                    ? (existenteCita.cultos[0] as unknown as { fecha: string })?.fecha
                    : (existenteCita.cultos as unknown as { fecha: string })?.fecha,
                lector: existenteCita.id_usuario_lector,
            }
        }
    }

    const lecturaData = {
        culto_id: cultoId,
        tipo_lectura: tipoLectura,
        libro,
        capitulo_inicio: capituloInicio,
        versiculo_inicio: versiculoInicio,
        capitulo_fin: capituloFin || capituloInicio,
        versiculo_fin: versiculoFin || versiculoInicio,
        id_usuario_lector: userId,
        es_repetida: false,
        lectura_original_id: null,
    }

    let result
    if (existenteMismoTipo) {
        // Actualizar existente
        result = await supabase
            .from('lecturas_biblicas')
            .update(lecturaData)
            .eq('id', existenteMismoTipo.id)
            .select()
            .single()
    } else {
        // Insertar nueva
        result = await supabase
            .from('lecturas_biblicas')
            .insert(lecturaData)
            .select()
            .single()
    }

    if (result.error) {
        return { error: result.error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true, data: result.data }
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

    // Verificar si ya existe una para actualizar
    const { data: existente } = await supabase
        .from('lecturas_biblicas')
        .select('id')
        .eq('culto_id', cultoId)
        .eq('tipo_lectura', tipoLectura)
        .limit(1)
        .single()

    const lecturaData = {
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
    }

    let result
    if (existente) {
        result = await supabase
            .from('lecturas_biblicas')
            .update(lecturaData)
            .eq('id', existente.id)
            .select()
            .single()
    } else {
        result = await supabase
            .from('lecturas_biblicas')
            .insert(lecturaData)
            .select()
            .single()
    }

    if (result.error) {
        return { error: result.error.message }
    }

    revalidatePath(`/dashboard/cultos/${cultoId}`)
    return { success: true, data: result.data }
}

/**
 * Eliminar lectura bíblica
 */
export async function deleteLectura(id: string, cultoId?: string) {
    noStore()
    const supabase = await createClient()
    const { error } = await supabase
        .from('lecturas_biblicas')
        .delete()
        .eq('id', id)

    if (error) {
        return { error: error.message }
    }

    if (cultoId) {
        revalidatePath(`/dashboard/cultos/${cultoId}`)
    }

    return { success: true }
}

/**
 * Obtener lecturas de un culto
 */
export async function getLecturasByCulto(cultoId: string) {
    noStore()
    const supabase = await createClient()

    console.log('Buscando lecturas para culto:', cultoId)

    const { data, error } = await supabase
        .from('lecturas_biblicas')
        .select('*') // Primero intentamos sin joins para descartar problemas de relación
        .eq('culto_id', cultoId)
        .order('tipo_lectura', { ascending: true })

    if (error) {
        console.error('Error en query lecturas:', error)
        return { error: error.message }
    }

    console.log('Lecturas encontradas (raw):', data?.length)

    // Si hay datos, intentamos cargar los lectores por separado o con join si es seguro
    if (data && data.length > 0) {
        const { data: dataWithLector, error: errorLector } = await supabase
            .from('lecturas_biblicas')
            .select(`
                *,
                lector:profiles!id_usuario_lector(nombre, apellidos)
            `)
            .eq('culto_id', cultoId)
            .order('tipo_lectura', { ascending: true })

        if (!errorLector) return { data: dataWithLector }
    }

    return { data: data || [] }
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
        search?: string
    }
) {
    const supabase = await createClient()

    let query = supabase
        .from('lecturas_biblicas')
        .select(`
      *,
      culto:cultos!inner(fecha, tipo_culto:culto_types(nombre)),
      lector:profiles!id_usuario_lector(nombre, apellidos)
    `, { count: 'exact' })
        .order('created_at', { ascending: false })

    if (filters?.search) {
        const searchTerm = filters.search.trim()
        console.log('Searching lecturas with term:', searchTerm)
        // Búsqueda insensible a mayúsculas/minúsculas parcial en 'libro'
        query = query.ilike('libro', `%${searchTerm}%`)
    }

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
    try {
        const supabase = await createClient()

        // Optimize: Select ONLY structure columns, NOT the full text if it exists
        // 1189 chapters is small enough to fetch in one request if we exclude text
        const { data, error } = await supabase
            .from('biblia')
            .select('libro, orden, testamento, abreviatura, capitulo, num_versiculos')
            .order('orden', { ascending: true })
            .order('capitulo', { ascending: true })
            .eq('versiculo', 1) // Optimization: Only fetch first verse of each chapter
            .limit(5000) // 1189 chapters fits easily in 5000

        if (error) {
            console.error('Error fetching bible structure:', error)
            return { error: error.message }
        }

        if (!data || data.length === 0) {
            return { data: [] }
        }

        // Agregamos por libro de forma robusta
        const booksMap = new Map<string, {
            id: number
            nombre: string
            testamento: string
            abreviatura: string
            capitulos: { n: number; v: number }[]
        }>()

        data.forEach((row) => {
            const libroNombre = (row.libro as string).trim()
            if (!booksMap.has(libroNombre)) {
                booksMap.set(libroNombre, {
                    id: row.orden as number,
                    nombre: libroNombre,
                    testamento: row.testamento as string,
                    abreviatura: row.abreviatura as string,
                    capitulos: []
                })
            }

            const book = booksMap.get(libroNombre)!
            // Prevent duplicates if DB is messy
            if (!book.capitulos.some((c) => c.n === row.capitulo)) {
                book.capitulos.push({
                    n: row.capitulo as number,
                    v: row.num_versiculos as number
                })
            }
        })

        const finalData = Array.from(booksMap.values()).sort((a, b) => a.id - b.id)
        return { data: finalData }
    } catch (err) {
        console.error('Excepción en getBibliaLibros:', err)
        return { error: 'Error interno del servidor' }
    }
}
