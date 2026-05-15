/** Supabase suele devolver relación 1:1 como objeto o como array de un elemento */
export function unwrapSupabaseJoin<T>(v: T | T[] | null | undefined): T | null {
    if (v == null) return null
    return Array.isArray(v) ? (v[0] ?? null) : v
}

type PerfilBasico = { id: string; nombre?: string | null; apellidos?: string | null }

type CultoHistorialJoin = {
    usuario_intro?: PerfilBasico | PerfilBasico[] | null
    usuario_finalizacion?: PerfilBasico | PerfilBasico[] | null
} | null

/**
 * En historial global, el nombre mostrado debe ser quien tenía la asignación en el culto
 * (intro / finalización), no solo el FK legacy en lecturas_biblicas.
 */
export function resolveHistorialLectorDisplay(row: {
    tipo_lectura: 'introduccion' | 'finalizacion'
    lector: PerfilBasico | PerfilBasico[] | null
    culto: CultoHistorialJoin
}): { id: string; nombre: string; apellidos: string } {
    const fallback = unwrapSupabaseJoin(row.lector)
    const base = fallback
        ? {
              id: fallback.id,
              nombre: fallback.nombre ?? '',
              apellidos: fallback.apellidos ?? '',
          }
        : { id: '', nombre: '', apellidos: '' }

    const culto = row.culto && typeof row.culto === 'object' ? row.culto : null
    if (!culto) return base

    if (row.tipo_lectura === 'introduccion') {
        const intro = unwrapSupabaseJoin(culto.usuario_intro)
        if (intro?.id) {
            return { id: intro.id, nombre: intro.nombre ?? '', apellidos: intro.apellidos ?? '' }
        }
        return base
    }

    const fin = unwrapSupabaseJoin(culto.usuario_finalizacion)
    if (fin?.id) {
        return { id: fin.id, nombre: fin.nombre ?? '', apellidos: fin.apellidos ?? '' }
    }
    return base
}
