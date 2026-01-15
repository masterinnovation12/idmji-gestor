'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'

/**
 * Normaliza texto removiendo acentos para búsquedas
 */
function normalizeText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
}

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
 * Soporta filtros avanzados: fechas, tipo culto, lector, testamento, capítulo, búsqueda
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
        lectorId?: string
        testamento?: 'AT' | 'NT'
        capitulo?: number
    }
) {
    const supabase = await createClient()

    // Si hay filtros de fecha o tipo de culto, primero obtener IDs de cultos que los cumplan
    let cultosIds: string[] | null = null
    
    if (filters?.startDate || filters?.endDate || filters?.tipoCulto) {
        let cultosQuery = supabase
            .from('cultos')
            .select('id')
        
        if (filters?.startDate) {
            cultosQuery = cultosQuery.gte('fecha', filters.startDate)
        }
        if (filters?.endDate) {
            cultosQuery = cultosQuery.lte('fecha', filters.endDate)
        }
        if (filters?.tipoCulto) {
            cultosQuery = cultosQuery.eq('tipo_culto_id', filters.tipoCulto)
        }

        const { data: cultosFiltrados } = await cultosQuery
        cultosIds = cultosFiltrados?.map(c => c.id) || []

        // Si hay filtros de fecha/tipo y no hay cultos que los cumplan, retornar vacío
        if (cultosIds.length === 0) {
            return {
                data: [],
                count: 0,
                totalPages: 0
            }
        }
    }

    let query = supabase
        .from('lecturas_biblicas')
        .select(`
      *,
      culto:cultos!inner(fecha, tipo_culto:culto_types(nombre, id)),
      lector:profiles!id_usuario_lector(id, nombre, apellidos)
    `, { count: 'exact' })
        .order('created_at', { ascending: false })

    // Aplicar filtro de cultos si hay filtros de fecha/tipo
    if (cultosIds && cultosIds.length > 0) {
        query = query.in('culto_id', cultosIds)
    }

    // Filtro por lector
    if (filters?.lectorId) {
        query = query.eq('id_usuario_lector', filters.lectorId)
    }

    // Filtro por tipo de lectura
    if (filters?.tipoLectura) {
        query = query.eq('tipo_lectura', filters.tipoLectura)
    }

    // Filtro por lecturas repetidas
    if (filters?.soloRepetidas) {
        query = query.eq('es_repetida', true)
    }

    // Filtro por capítulo
    if (filters?.capitulo) {
        query = query.eq('capitulo_inicio', filters.capitulo)
    }

    // Búsqueda avanzada: libro, lector, o capítulo
    if (filters?.search) {
        const searchTerm = filters.search.trim()
        console.log('Searching lecturas with term:', searchTerm)
        
        // Intentar detectar si es búsqueda por capítulo (número)
        const capituloMatch = searchTerm.match(/^(\d+)$/)
        if (capituloMatch) {
            query = query.eq('capitulo_inicio', parseInt(capituloMatch[1]))
        } else {
            // Búsqueda por libro (insensible a mayúsculas/minúsculas y acentos)
            // Crear variantes: original y sin acentos
            const variants: string[] = [searchTerm]
            
            // Agregar variante sin acentos
            const withoutAccents = searchTerm
                .replace(/[éÉ]/g, 'e')
                .replace(/[áÁ]/g, 'a')
                .replace(/[íÍ]/g, 'i')
                .replace(/[óÓ]/g, 'o')
                .replace(/[úÚ]/g, 'u')
                .replace(/[ñÑ]/g, 'n')
                .replace(/[üÜ]/g, 'u')
            
            if (withoutAccents !== searchTerm) {
                variants.push(withoutAccents)
            }
            
            // Mapeo de variantes comunes conocidas (ej: Genesis -> Génesis)
            const commonVariants: Record<string, string[]> = {
                'genesis': ['Génesis', 'Genesis'],
                'exodo': ['Éxodo', 'Exodo'],
                'levitico': ['Levítico', 'Levitico'],
                'numeros': ['Números', 'Numeros'],
                'deuteronomio': ['Deuteronomio'],
                'jose': ['Josué', 'Jose'],
                'jueces': ['Jueces'],
                'rut': ['Rut'],
                'samuel': ['Samuel'],
                'reyes': ['Reyes'],
                'cronicas': ['Crónicas', 'Cronicas'],
                'esdras': ['Esdras'],
                'nehemias': ['Nehemías', 'Nehemias'],
                'ester': ['Ester'],
                'job': ['Job'],
                'salmos': ['Salmos'],
                'proverbios': ['Proverbios'],
                'eclesiastes': ['Eclesiastés', 'Eclesiastes'],
                'cantares': ['Cantares'],
                'isaias': ['Isaías', 'Isaias'],
                'jeremias': ['Jeremías', 'Jeremias'],
                'lamentaciones': ['Lamentaciones'],
                'ezequiel': ['Ezequiel'],
                'daniel': ['Daniel'],
                'oseas': ['Oseas'],
                'joel': ['Joel'],
                'amos': ['Amós', 'Amos'],
                'abdias': ['Abdías', 'Abdias'],
                'jonas': ['Jonás', 'Jonas'],
                'miqueas': ['Miqueas'],
                'nahum': ['Nahúm', 'Nahum'],
                'habacuc': ['Habacuc'],
                'sofonias': ['Sofonías', 'Sofonias'],
                'hageo': ['Hageo'],
                'zacarias': ['Zacarías', 'Zacarias'],
                'malaquias': ['Malaquías', 'Malaquias'],
                'mateo': ['Mateo'],
                'marcos': ['Marcos'],
                'lucas': ['Lucas'],
                'juan': ['Juan'],
                'hechos': ['Hechos'],
                'romanos': ['Romanos'],
                'corintios': ['Corintios'],
                'galatas': ['Gálatas', 'Galatas'],
                'efesios': ['Efesios'],
                'filipenses': ['Filipenses'],
                'colosenses': ['Colosenses'],
                'tesalonicenses': ['Tesalonicenses'],
                'timoteo': ['Timoteo'],
                'tito': ['Tito'],
                'filemon': ['Filemón', 'Filemon'],
                'hebreos': ['Hebreos'],
                'santiago': ['Santiago'],
                'pedro': ['Pedro'],
                'judas': ['Judas'],
                'apocalipsis': ['Apocalipsis']
            }
            
            // Buscar variantes comunes
            const normalizedSearch = withoutAccents.toLowerCase()
            if (commonVariants[normalizedSearch]) {
                commonVariants[normalizedSearch].forEach(variant => {
                    if (!variants.includes(variant)) {
                        variants.push(variant)
                    }
                })
            }
            
            // Eliminar duplicados
            const uniqueVariants = [...new Set(variants)]
            
            // Buscar con OR para cualquiera de las variantes
            if (uniqueVariants.length === 1) {
                query = query.ilike('libro', `%${uniqueVariants[0]}%`)
            } else {
                // Construir condición OR para Supabase
                const orConditions = uniqueVariants.map(v => `libro.ilike.%${v}%`).join(',')
                query = query.or(orConditions)
            }
        }
    }

    // Filtro por testamento (requiere join con biblia)
    if (filters?.testamento) {
        // Necesitamos hacer un join con la tabla biblia para obtener el testamento
        // Esto requiere una subquery o un join adicional
        // Por ahora, usamos una lista de libros conocidos por testamento
        const librosAT = [
            'Génesis', 'Éxodo', 'Levítico', 'Números', 'Deuteronomio', 'Josué', 'Jueces', 'Rut',
            '1 Samuel', '2 Samuel', '1 Reyes', '2 Reyes', '1 Crónicas', '2 Crónicas', 'Esdras',
            'Nehemías', 'Ester', 'Job', 'Salmos', 'Proverbios', 'Eclesiastés', 'Cantares',
            'Isaías', 'Jeremías', 'Lamentaciones', 'Ezequiel', 'Daniel', 'Oseas', 'Joel', 'Amós',
            'Abdías', 'Jonás', 'Miqueas', 'Nahúm', 'Habacuc', 'Sofonías', 'Hageo', 'Zacarías', 'Malaquías'
        ]
        const librosNT = [
            'Mateo', 'Marcos', 'Lucas', 'Juan', 'Hechos', 'Romanos', '1 Corintios', '2 Corintios',
            'Gálatas', 'Efesios', 'Filipenses', 'Colosenses', '1 Tesalonicenses', '2 Tesalonicenses',
            '1 Timoteo', '2 Timoteo', 'Tito', 'Filemón', 'Hebreos', 'Santiago', '1 Pedro', '2 Pedro',
            '1 Juan', '2 Juan', '3 Juan', 'Judas', 'Apocalipsis'
        ]
        
        const librosFiltro = filters.testamento === 'AT' ? librosAT : librosNT
        query = query.in('libro', librosFiltro)
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
 * Obtener tipos de culto para filtros
 */
export async function getCultoTypes() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('culto_types')
        .select('id, nombre, color')
        .order('nombre', { ascending: true })

    if (error) {
        console.error('Error fetching culto types:', error)
        return { error: error.message }
    }

    return { data: data || [] }
}

/**
 * Obtener lectores (usuarios que han leído) para filtros
 */
export async function getLectores() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('lecturas_biblicas')
        .select('id_usuario_lector, lector:profiles!id_usuario_lector(id, nombre, apellidos)')
        .order('created_at', { ascending: false })

    if (error) {
        return { error: error.message }
    }

    // Obtener lectores únicos
    const lectoresMap = new Map<string, { id: string; nombre: string; apellidos: string }>()
    data?.forEach((lectura: any) => {
        if (lectura.lector && !lectoresMap.has(lectura.id_usuario_lector)) {
            lectoresMap.set(lectura.id_usuario_lector, {
                id: lectura.id_usuario_lector,
                nombre: lectura.lector.nombre || '',
                apellidos: lectura.lector.apellidos || ''
            })
        }
    })

    return { data: Array.from(lectoresMap.values()).sort((a, b) => 
        `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`)
    ) }
}

/**
 * Obtener estadísticas de lecturas (con soporte para filtros)
 */
export async function getLecturasStats(filters?: {
    startDate?: string
    endDate?: string
    tipoCulto?: string
    tipoLectura?: string
    soloRepetidas?: boolean
    search?: string
    lectorId?: string
    testamento?: 'AT' | 'NT'
    capitulo?: number
}) {
    const supabase = await createClient()

    // Si hay filtros de fecha o tipo de culto, primero obtener IDs de cultos que los cumplan
    let cultosIds: string[] | null = null
    
    if (filters?.startDate || filters?.endDate || filters?.tipoCulto) {
        let cultosQuery = supabase
            .from('cultos')
            .select('id')
        
        if (filters?.startDate) {
            cultosQuery = cultosQuery.gte('fecha', filters.startDate)
        }
        if (filters?.endDate) {
            cultosQuery = cultosQuery.lte('fecha', filters.endDate)
        }
        if (filters?.tipoCulto) {
            cultosQuery = cultosQuery.eq('tipo_culto_id', filters.tipoCulto)
        }

        const { data: cultosFiltrados } = await cultosQuery
        cultosIds = cultosFiltrados?.map(c => c.id) || []

        // Si hay filtros de fecha/tipo y no hay cultos que los cumplan, retornar estadísticas vacías
        if (cultosIds.length === 0) {
            return {
                totalLecturas: 0,
                librosMasLeidos: [],
                repetidasCount: 0
            }
        }
    }

    // Construir query base para estadísticas
    let queryTotal = supabase
        .from('lecturas_biblicas')
        .select('*', { count: 'exact', head: true })

    let queryLibros = supabase
        .from('lecturas_biblicas')
        .select('libro')

    let queryRepetidas = supabase
        .from('lecturas_biblicas')
        .select('*', { count: 'exact', head: true })
        .eq('es_repetida', true)

    // Aplicar filtro de cultos si hay filtros de fecha/tipo
    if (cultosIds && cultosIds.length > 0) {
        queryTotal = queryTotal.in('culto_id', cultosIds)
        queryLibros = queryLibros.in('culto_id', cultosIds)
        queryRepetidas = queryRepetidas.in('culto_id', cultosIds)
    }

    // Filtro por lector
    if (filters?.lectorId) {
        queryTotal = queryTotal.eq('id_usuario_lector', filters.lectorId)
        queryLibros = queryLibros.eq('id_usuario_lector', filters.lectorId)
        queryRepetidas = queryRepetidas.eq('id_usuario_lector', filters.lectorId)
    }

    // Filtro por tipo de lectura
    if (filters?.tipoLectura) {
        queryTotal = queryTotal.eq('tipo_lectura', filters.tipoLectura)
        queryLibros = queryLibros.eq('tipo_lectura', filters.tipoLectura)
        queryRepetidas = queryRepetidas.eq('tipo_lectura', filters.tipoLectura)
    }

    // Filtro por lecturas repetidas (solo para total y libros, no para repetidasCount)
    if (filters?.soloRepetidas) {
        queryTotal = queryTotal.eq('es_repetida', true)
        queryLibros = queryLibros.eq('es_repetida', true)
        // queryRepetidas ya tiene .eq('es_repetida', true), así que no necesita este filtro adicional
    }

    // Filtro por capítulo
    if (filters?.capitulo) {
        queryTotal = queryTotal.eq('capitulo_inicio', filters.capitulo)
        queryLibros = queryLibros.eq('capitulo_inicio', filters.capitulo)
        queryRepetidas = queryRepetidas.eq('capitulo_inicio', filters.capitulo)
    }

    // Búsqueda avanzada: libro, lector, o capítulo
    if (filters?.search) {
        const searchTerm = filters.search.trim()
        
        // Intentar detectar si es búsqueda por capítulo (número)
        const capituloMatch = searchTerm.match(/^(\d+)$/)
        if (capituloMatch) {
            const capituloNum = parseInt(capituloMatch[1])
            queryTotal = queryTotal.eq('capitulo_inicio', capituloNum)
            queryLibros = queryLibros.eq('capitulo_inicio', capituloNum)
            queryRepetidas = queryRepetidas.eq('capitulo_inicio', capituloNum)
        } else {
            // Búsqueda por libro (insensible a mayúsculas/minúsculas)
            queryTotal = queryTotal.ilike('libro', `%${searchTerm}%`)
            queryLibros = queryLibros.ilike('libro', `%${searchTerm}%`)
            queryRepetidas = queryRepetidas.ilike('libro', `%${searchTerm}%`)
        }
    }

    // Filtro por testamento
    if (filters?.testamento) {
        const librosAT = [
            'Génesis', 'Éxodo', 'Levítico', 'Números', 'Deuteronomio', 'Josué', 'Jueces', 'Rut',
            '1 Samuel', '2 Samuel', '1 Reyes', '2 Reyes', '1 Crónicas', '2 Crónicas', 'Esdras',
            'Nehemías', 'Ester', 'Job', 'Salmos', 'Proverbios', 'Eclesiastés', 'Cantares',
            'Isaías', 'Jeremías', 'Lamentaciones', 'Ezequiel', 'Daniel', 'Oseas', 'Joel', 'Amós',
            'Abdías', 'Jonás', 'Miqueas', 'Nahúm', 'Habacuc', 'Sofonías', 'Hageo', 'Zacarías', 'Malaquías'
        ]
        const librosNT = [
            'Mateo', 'Marcos', 'Lucas', 'Juan', 'Hechos', 'Romanos', '1 Corintios', '2 Corintios',
            'Gálatas', 'Efesios', 'Filipenses', 'Colosenses', '1 Tesalonicenses', '2 Tesalonicenses',
            '1 Timoteo', '2 Timoteo', 'Tito', 'Filemón', 'Hebreos', 'Santiago', '1 Pedro', '2 Pedro',
            '1 Juan', '2 Juan', '3 Juan', 'Judas', 'Apocalipsis'
        ]
        
        const librosFiltro = filters.testamento === 'AT' ? librosAT : librosNT
        queryTotal = queryTotal.in('libro', librosFiltro)
        queryLibros = queryLibros.in('libro', librosFiltro)
        queryRepetidas = queryRepetidas.in('libro', librosFiltro)
    }

    // Ejecutar consultas
    const { count: totalLecturas } = await queryTotal

    const { data: librosData } = await queryLibros
    
    const librosCount = new Map<string, number>()
    librosData?.forEach((lectura) => {
        const count = librosCount.get(lectura.libro) || 0
        librosCount.set(lectura.libro, count + 1)
    })

    const librosMasLeidos = Array.from(librosCount.entries())
        .map(([libro, count]) => ({ libro, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

    const { count: repetidasCount } = await queryRepetidas

    return {
        totalLecturas: totalLecturas || 0,
        librosMasLeidos,
        repetidasCount: repetidasCount || 0
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
