import { calcHasta, formatSecuencia, SACOS_MAX, type DiaTipo } from '@/lib/utils/ofrendaEngine'

export type SacosPlanConfig = {
    sacos_jueves: number
    sacos_domingo: number
    sacos_domingo_tarde: number
    secuencia_maximo?: number
}

export function getSecuenciaMaximo(config: SacosPlanConfig, fallback = SACOS_MAX): number {
    const n = config.secuencia_maximo ?? fallback
    return Math.max(1, Math.min(99, n))
}

/** Cantidad de sacos cubiertos por el rango (ciclo 1–max, con wrap si hasta < desde). */
export function countSacosInSequence(
    desde: number,
    hasta: number,
    max = SACOS_MAX
): number {
    if (desde < 1 || hasta < 1 || desde > max || hasta > max) return 0
    if (desde <= hasta) return hasta - desde + 1
    return max - desde + 1 + hasta
}

export function formatSecuenciaRange(desde: number, hasta: number): string {
    return formatSecuencia(desde, hasta)
}

/** Sacos que debe cubrir la secuencia según la configuración del plan. */
export function getMaxSacosForDiaTipo(
    diaTipo: DiaTipo,
    config: SacosPlanConfig
): number {
    switch (diaTipo) {
        case 'jueves':
            return config.sacos_jueves
        case 'domingo':
            return config.sacos_domingo
        case 'domingo_tarde':
            return config.sacos_domingo_tarde
        default: {
            const _exhaustive: never = diaTipo
            return _exhaustive
        }
    }
}

export type SecuenciaLimitValidation =
    | { ok: true; count: number; requiredSacos: number }
    | {
          ok: false
          count: number
          requiredSacos: number
          reason: 'too_few' | 'too_many' | 'bounds'
      }

/**
 * La secuencia debe incluir exactamente los sacos configurados para ese tipo de día
 * (ni más ni menos).
 */
export function validateSecuenciaSacos(
    desde: number,
    hasta: number,
    requiredSacos: number,
    max = SACOS_MAX
): SecuenciaLimitValidation {
    if (
        !Number.isInteger(desde) ||
        !Number.isInteger(hasta) ||
        desde < 1 ||
        hasta < 1 ||
        desde > max ||
        hasta > max
    ) {
        return { ok: false, count: 0, requiredSacos, reason: 'bounds' }
    }
    const count = countSacosInSequence(desde, hasta, max)
    if (count < requiredSacos) {
        return { ok: false, count, requiredSacos, reason: 'too_few' }
    }
    if (count > requiredSacos) {
        return { ok: false, count, requiredSacos, reason: 'too_many' }
    }
    return { ok: true, count, requiredSacos }
}

/** Rango canónico con los sacos requeridos (misma lógica que el motor). */
export function secuenciaAtMaxSacos(desde: number, requiredSacos: number, max = SACOS_MAX): number {
    const d = Math.min(max, Math.max(1, desde))
    return calcHasta(d, requiredSacos, max)
}
