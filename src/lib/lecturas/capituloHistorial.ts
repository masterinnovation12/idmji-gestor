/**
 * Utilidades para aviso preventivo libro + capítulo en historial.
 */

export interface CapituloHistorialHit {
    id: string
    cultoId: string
    tipoLectura: 'introduccion' | 'finalizacion'
    fecha: string
    horaInicio: string | null
    cultoNombre: string
    lectorNombre: string
    pasaje: string
}

export function formatPasajeLectura(row: {
    libro: string
    capitulo_inicio: number
    versiculo_inicio: number
    capitulo_fin: number
    versiculo_fin: number
}): string {
    if (row.capitulo_inicio === row.capitulo_fin && row.versiculo_inicio === row.versiculo_fin) {
        return `${row.libro} ${row.capitulo_inicio}:${row.versiculo_inicio}`
    }
    if (row.capitulo_inicio === row.capitulo_fin) {
        return `${row.libro} ${row.capitulo_inicio}:${row.versiculo_inicio}-${row.versiculo_fin}`
    }
    return `${row.libro} ${row.capitulo_inicio}:${row.versiculo_inicio} - ${row.capitulo_fin}:${row.versiculo_fin}`
}

export function lecturaIncluyeCapitulo(
    capitulo: number,
    capituloInicio: number,
    capituloFin: number
): boolean {
    return capituloInicio <= capitulo && capituloFin >= capitulo
}

export function buildHistorialCapituloUrl(
    libro: string,
    capitulo: number,
    excludeCultoId?: string
): string {
    const params = new URLSearchParams()
    params.set('search', libro)
    params.set('capitulo', String(capitulo))
    if (excludeCultoId) {
        params.set('excludeCulto', excludeCultoId)
    }
    return `/dashboard/historial/lecturas?${params.toString()}`
}

export function countPreviousReadings(
    totalCount: number,
    excludeCultoId: string | undefined,
    readings: { cultoId: string }[]
): number {
    if (!excludeCultoId) return Math.max(0, totalCount - 1)
    const previous = readings.filter((r) => r.cultoId !== excludeCultoId).length
    return previous
}
