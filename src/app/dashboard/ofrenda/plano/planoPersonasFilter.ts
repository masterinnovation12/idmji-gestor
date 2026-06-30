/**
 * Filtros del directorio de personas (Labor ofrenda).
 *
 * Reglas:
 *  - Cada grupo multi-selección filtra SOLO cuando es parcial (0 < seleccionados < total).
 *    Si está completo o vacío → no filtra (no-op), para que «todo marcado» muestre a todas.
 *  - Día = DISPONIBILIDAD: la persona pasa si puede en ALGUNO de los días seleccionados.
 *  - Entre grupos: AND. Dentro del grupo: OR.
 *  - Toggles (estrella, pareja): off = no filtra; on = exige la condición.
 *  - Las personas inactivas NO se excluyen aquí (decisión de producto: se incluyen).
 */

export type PlanoFilterDia = 'jueves' | 'domingo_manana' | 'domingo_tarde'
export type PlanoFilterGenero = 'hombre' | 'mujer'
export type PlanoFilterCapacidad = 'ofrendario' | 'apoyo' | 'ambos'

export const ALL_DIAS: readonly PlanoFilterDia[] = ['jueves', 'domingo_manana', 'domingo_tarde']
export const ALL_GENEROS: readonly PlanoFilterGenero[] = ['hombre', 'mujer']
export const ALL_CAPACIDADES: readonly PlanoFilterCapacidad[] = ['ofrendario', 'apoyo', 'ambos']

export interface PlanoPersonasFilter {
    dias: PlanoFilterDia[]
    generos: PlanoFilterGenero[]
    capacidades: PlanoFilterCapacidad[]
    soloEstrella: boolean
    soloPareja: boolean
}

/** Persona mínima necesaria para filtrar (la implementa PlanoPersonaFull). */
export interface PlanoFilterablePersona {
    puede_jueves: boolean
    puede_domingo_manana: boolean
    puede_domingo_tarde: boolean
    genero: PlanoFilterGenero | null
    capacidad: PlanoFilterCapacidad
    prioridad_ofrendario: boolean
    parejaId: string | null
}

export function defaultPlanoPersonasFilter(): PlanoPersonasFilter {
    return {
        dias: [...ALL_DIAS],
        generos: [...ALL_GENEROS],
        capacidades: [...ALL_CAPACIDADES],
        soloEstrella: false,
        soloPareja: false,
    }
}

/** Un grupo multi-selección filtra solo si es parcial. */
function groupIsActive(selectedCount: number, total: number): boolean {
    return selectedCount > 0 && selectedCount < total
}

function personaPuedeDia(p: PlanoFilterablePersona, dia: PlanoFilterDia): boolean {
    if (dia === 'jueves') return p.puede_jueves
    if (dia === 'domingo_manana') return p.puede_domingo_manana
    return p.puede_domingo_tarde
}

export function matchesPlanoPersonasFilter(
    p: PlanoFilterablePersona,
    f: PlanoPersonasFilter,
): boolean {
    if (groupIsActive(f.dias.length, ALL_DIAS.length)) {
        if (!f.dias.some(d => personaPuedeDia(p, d))) return false
    }
    if (groupIsActive(f.generos.length, ALL_GENEROS.length)) {
        if (!p.genero || !f.generos.includes(p.genero)) return false
    }
    if (groupIsActive(f.capacidades.length, ALL_CAPACIDADES.length)) {
        if (!f.capacidades.includes(p.capacidad)) return false
    }
    if (f.soloEstrella && !p.prioridad_ofrendario) return false
    if (f.soloPareja && !p.parejaId) return false
    return true
}

export function filterPlanoPersonas<T extends PlanoFilterablePersona>(
    list: readonly T[],
    f: PlanoPersonasFilter,
): T[] {
    return list.filter(p => matchesPlanoPersonasFilter(p, f))
}

/** Nº de grupos/toggles que están filtrando activamente (para badge). */
export function countActivePlanoFilters(f: PlanoPersonasFilter): number {
    let n = 0
    if (groupIsActive(f.dias.length, ALL_DIAS.length)) n++
    if (groupIsActive(f.generos.length, ALL_GENEROS.length)) n++
    if (groupIsActive(f.capacidades.length, ALL_CAPACIDADES.length)) n++
    if (f.soloEstrella) n++
    if (f.soloPareja) n++
    return n
}

export function hasActivePlanoFilters(f: PlanoPersonasFilter): boolean {
    return countActivePlanoFilters(f) > 0
}

/** Alterna un valor dentro de un array (inmutable). */
export function toggleInArray<T>(arr: readonly T[], value: T): T[] {
    return arr.includes(value) ? arr.filter(x => x !== value) : [...arr, value]
}
