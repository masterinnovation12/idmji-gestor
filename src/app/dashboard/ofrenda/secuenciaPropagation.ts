import {
    advancePuntero,
    calcHasta,
    formatSecuencia,
    type DiaTipo,
} from '@/lib/utils/ofrendaEngine'
import {
    getMaxSacosForDiaTipo,
    type SacosPlanConfig,
} from './secuenciaSacosLimits'

export type SecuenciaApplyScope = 'single' | 'forward'

export interface ServicioSecuenciaRow {
    id: string
    dia_tipo: DiaTipo
    posicion: number
}

export interface SecuenciaRowUpdate {
    id: string
    secuencia_desde: number
    secuencia_hasta: number
    secuencia_texto: string
}

export type SecuenciaPlanConfig = SacosPlanConfig & {
    secuencia_maximo: number
}

export interface PropagateSecuenciaResult {
    updates: SecuenciaRowUpdate[]
    punteroFin: number
}

/** Servicios posteriores en el mes (misma ordenación que la tabla). */
export function countFollowingServicios(
    servicios: ServicioSecuenciaRow[],
    fromPosicion: number,
): number {
    return servicios.filter((s) => s.posicion > fromPosicion).length
}

/**
 * Aplica la secuencia editada en `startIndex` y recalcula en orden los servicios siguientes
 * (misma lógica que {@link generarPlan}).
 */
export function propagateSecuenciasFromIndex(
    servicios: ServicioSecuenciaRow[],
    startIndex: number,
    desde: number,
    hasta: number,
    planConfig: SecuenciaPlanConfig,
): PropagateSecuenciaResult {
    const max = planConfig.secuencia_maximo
    const ordered = [...servicios].sort((a, b) => a.posicion - b.posicion)
    const start = ordered[startIndex]
    if (!start) {
        return { updates: [], punteroFin: desde }
    }

    const updates: SecuenciaRowUpdate[] = [
        {
            id: start.id,
            secuencia_desde: desde,
            secuencia_hasta: hasta,
            secuencia_texto: formatSecuencia(desde, hasta),
        },
    ]

    let puntero = advancePuntero(
        desde,
        getMaxSacosForDiaTipo(start.dia_tipo, planConfig),
        max,
    )

    for (let i = startIndex + 1; i < ordered.length; i++) {
        const srv = ordered[i]
        const pasos = getMaxSacosForDiaTipo(srv.dia_tipo, planConfig)
        const d = puntero
        const h = calcHasta(d, pasos, max)
        updates.push({
            id: srv.id,
            secuencia_desde: d,
            secuencia_hasta: h,
            secuencia_texto: formatSecuencia(d, h),
        })
        puntero = advancePuntero(d, pasos, max)
    }

    return { updates, punteroFin: puntero }
}

export function findServicioIndexById(
    servicios: ServicioSecuenciaRow[],
    servicioId: string,
): number {
    const ordered = [...servicios].sort((a, b) => a.posicion - b.posicion)
    return ordered.findIndex((s) => s.id === servicioId)
}
