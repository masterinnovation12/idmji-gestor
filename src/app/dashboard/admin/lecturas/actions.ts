'use server'

import { requireAdmin } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResponse, Sede } from '@/types/database'

/**
 * Analítica de lecturas bíblicas multi-sede (solo ADMIN): qué libro se lee más
 * en cada sede y en el global. Usa el cliente service-role porque el ADMIN
 * consulta datos de TODAS las sedes a la vez; el acceso queda protegido por
 * requireAdmin(). El resto de la app aísla las lecturas por sede activa; esta
 * vista es la excepción explícita para comparar entre sedes.
 */

export interface LibroCount {
    libro: string
    count: number
}

export interface SedeLecturasResumen {
    sedeId: string
    nombre: string
    slug: string
    activo: boolean
    totalLecturas: number
    librosDistintos: number
    topLibros: LibroCount[]
    topLibro: LibroCount | null
}

export interface LecturasPorSedeData {
    /** Año aplicado (null = histórico completo). */
    year: number | null
    /** Agregado del ámbito seleccionado (una sede o todas). */
    global: { totalLecturas: number; librosDistintos: number; topLibros: LibroCount[] }
    /** Desglose por sede (ordenado por total de lecturas). */
    porSede: SedeLecturasResumen[]
    /** Años con datos disponibles, descendente, para el selector. */
    years: number[]
    generadoEn: string
}

const TOP_LIMIT = 8

function rankLibros(counts: Map<string, number>, limit = TOP_LIMIT): LibroCount[] {
    return Array.from(counts.entries())
        .map(([libro, count]) => ({ libro, count }))
        .sort((a, b) => b.count - a.count || a.libro.localeCompare(b.libro))
        .slice(0, limit)
}

export async function getLecturasPorSede(
    sedeId: string | null,
    year: number | null,
): Promise<ActionResponse<LecturasPorSedeData>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    try {
        const admin = createAdminClient()

        // 1. Sedes del ámbito
        const { data: sedes, error: sedesError } = await admin
            .from('sedes')
            .select('id, nombre, slug, activo, es_principal')
            .order('es_principal', { ascending: false })
            .order('nombre')
        if (sedesError) throw sedesError
        const sedesScope = (sedes ?? []).filter(s => !sedeId || s.id === sedeId)
        const sedeIds = sedesScope.map(s => s.id)
        if (sedeIds.length === 0) {
            return {
                success: true,
                data: {
                    year,
                    global: { totalLecturas: 0, librosDistintos: 0, topLibros: [] },
                    porSede: [],
                    years: [],
                    generadoEn: new Date().toISOString(),
                },
            }
        }

        // 2. Cultos del ámbito (sin filtro de año: sirve para deducir los años
        //    disponibles y para mapear cada lectura a su sede).
        const { data: cultosRaw, error: cultosError } = await admin
            .from('cultos')
            .select('id, sede_id, fecha')
            .in('sede_id', sedeIds)
        if (cultosError) throw cultosError
        const cultos = cultosRaw ?? []

        const years = Array.from(
            new Set(cultos.map(c => Number((c.fecha as string).slice(0, 4))).filter(Number.isFinite)),
        ).sort((a, b) => b - a)

        // Mapa culto -> sede solo para los cultos del año seleccionado
        const cultoSede = new Map<string, string>()
        for (const c of cultos) {
            if (year && Number((c.fecha as string).slice(0, 4)) !== year) continue
            cultoSede.set(c.id as string, c.sede_id as string)
        }

        // 3. Lecturas de esos cultos
        const cultoIds = Array.from(cultoSede.keys())
        const porSedeCounts = new Map<string, Map<string, number>>()
        const globalCounts = new Map<string, number>()
        for (const sid of sedeIds) porSedeCounts.set(sid, new Map())

        if (cultoIds.length > 0) {
            // Trocear el .in() por si hubiese muchos cultos (URL/limits).
            const CHUNK = 300
            for (let i = 0; i < cultoIds.length; i += CHUNK) {
                const slice = cultoIds.slice(i, i + CHUNK)
                const { data: lecturas, error: lecturasError } = await admin
                    .from('lecturas_biblicas')
                    .select('libro, culto_id')
                    .in('culto_id', slice)
                if (lecturasError) throw lecturasError
                for (const l of lecturas ?? []) {
                    const sid = cultoSede.get(l.culto_id as string)
                    if (!sid) continue
                    const libro = (l.libro as string)?.trim()
                    if (!libro) continue
                    const sedeMap = porSedeCounts.get(sid)
                    if (sedeMap) sedeMap.set(libro, (sedeMap.get(libro) ?? 0) + 1)
                    globalCounts.set(libro, (globalCounts.get(libro) ?? 0) + 1)
                }
            }
        }

        const porSede: SedeLecturasResumen[] = sedesScope
            .map(s => {
                const counts = porSedeCounts.get(s.id) ?? new Map<string, number>()
                const total = Array.from(counts.values()).reduce((n, v) => n + v, 0)
                const topLibros = rankLibros(counts)
                return {
                    sedeId: s.id,
                    nombre: s.nombre,
                    slug: s.slug,
                    activo: s.activo,
                    totalLecturas: total,
                    librosDistintos: counts.size,
                    topLibros,
                    topLibro: topLibros[0] ?? null,
                }
            })
            .sort((a, b) => b.totalLecturas - a.totalLecturas || a.nombre.localeCompare(b.nombre))

        const globalTotal = Array.from(globalCounts.values()).reduce((n, v) => n + v, 0)

        return {
            success: true,
            data: {
                year,
                global: {
                    totalLecturas: globalTotal,
                    librosDistintos: globalCounts.size,
                    topLibros: rankLibros(globalCounts, 12),
                },
                porSede,
                years,
                generadoEn: new Date().toISOString(),
            },
        }
    } catch (e) {
        console.error('getLecturasPorSede:', e)
        return { success: false, error: 'Error al cargar el historial de lecturas por sede' }
    }
}

/** Sedes para el selector (solo ADMIN). */
export async function getLecturasSedes(): Promise<ActionResponse<Pick<Sede, 'id' | 'nombre' | 'slug' | 'activo'>[]>> {
    const { ctx, error } = await requireAdmin()
    if (error || !ctx) return { success: false, error: error ?? 'Sin permisos' }

    const { data, error: qError } = await ctx.supabase
        .from('sedes')
        .select('id, nombre, slug, activo')
        .order('es_principal', { ascending: false })
        .order('nombre')
    if (qError) return { success: false, error: qError.message }
    return { success: true, data: data ?? [] }
}
