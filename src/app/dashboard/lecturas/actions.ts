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
                fecha: Array.isArray(existente.cultos) ? existente.cultos[0]?.fecha : (existente.cultos as any)?.fecha,
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
    try {
        const supabase = await createClient()
        let allRows: any[] = []
        let hasMore = true
        let from = 0
        const step = 400 // Paso pequeño para asegurar bypass de límites
        
        while (hasMore) {
            const to = from + step - 1
            const { data, error } = await supabase
                .from('biblia')
                .select('*')
                .order('orden', { ascending: true })
                .order('capitulo', { ascending: true })
                .range(from, to)

            if (error) {
                console.error(`Error en rango ${from}-${to}:`, error)
                return { error: error.message }
            }

            if (data && data.length > 0) {
                allRows = [...allRows, ...data]
                if (data.length < step) {
                    hasMore = false
                } else {
                    from += step
                }
            } else {
                hasMore = false
            }
            
            // Límite de seguridad
            if (allRows.length > 3000) hasMore = false
        }

        if (allRows.length === 0) {
            return { data: [] }
        }

        // Agregamos por libro de forma robusta
        const booksMap = new Map<string, any>()

        allRows.forEach((row) => {
            const libroNombre = row.libro.trim()
            if (!booksMap.has(libroNombre)) {
                booksMap.set(libroNombre, {
                    id: row.orden,
                    nombre: libroNombre,
                    testamento: row.testamento,
                    abreviatura: row.abreviatura,
                    capitulos: []
                })
            }
            
            const book = booksMap.get(libroNombre)
            if (!book.capitulos.some((c: any) => c.n === row.capitulo)) {
                book.capitulos.push({
                    n: row.capitulo,
                    v: row.num_versiculos
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
