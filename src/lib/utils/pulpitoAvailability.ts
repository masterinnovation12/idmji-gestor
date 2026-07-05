/**
 * pulpitoAvailability.ts
 * Resolución de disponibilidad de hermanos del púlpito para un rol y una fecha.
 *
 * Misma semántica que el filtro de UserSelector (excepciones > patrón > legacy):
 *  - Sin datos de disponibilidad → disponible para todo.
 *  - Excepción para la fecha exacta → manda la excepción (rol ausente = no puede).
 *  - Patrón semanal → template[díaSemana][rol] === true; día sin entrada = no puede.
 *  - Estructura presente sin regla aplicable → no disponible (conservador).
 *
 * Funciones puras y testeables (sin BD ni React).
 */

export type PulpitoRol = 'introduccion' | 'finalizacion' | 'ensenanza' | 'testimonios'

/** Orden canónico de los roles dentro de un culto. */
export const PULPITO_ROLES: readonly PulpitoRol[] = [
    'introduccion',
    'ensenanza',
    'testimonios',
    'finalizacion',
]

/** Clave usada en profiles.availability para cada rol de culto. */
export const ROL_TO_AVAILABILITY_KEY: Readonly<Record<PulpitoRol, string>> = {
    introduccion: 'intro',
    finalizacion: 'finalization',
    ensenanza: 'teaching',
    testimonios: 'testimonies',
}

export interface DisponibilidadRoles {
    intro?: boolean
    finalization?: boolean
    teaching?: boolean
    testimonies?: boolean
}

export interface PulpitoAvailability {
    template?: Record<string, DisponibilidadRoles>
    exceptions?: Record<string, DisponibilidadRoles>
    /** Estructura legacy: availability[díaSemana] = { ... } */
    [key: string]: unknown
}

/** Día de la semana 0-6 (0 = domingo) de una fecha 'YYYY-MM-DD' sin sorpresas de zona horaria. */
export function dayOfWeekFromDateStr(fecha: string): number {
    return new Date(`${fecha}T00:00:00`).getDay()
}

/**
 * ¿Puede este hermano hacer este rol en esta fecha?
 * @param availability  profiles.availability (puede ser null/undefined)
 * @param fecha         'YYYY-MM-DD'
 * @param rol           rol del culto
 */
export function isHermanoDisponible(
    availability: PulpitoAvailability | null | undefined,
    fecha: string,
    rol: PulpitoRol,
): boolean {
    if (!availability) return true

    const rolKey = ROL_TO_AVAILABILITY_KEY[rol]

    // 1. Excepciones por fecha exacta (máxima prioridad)
    const exceptions = availability.exceptions
    if (exceptions && exceptions[fecha]) {
        return exceptions[fecha][rolKey as keyof DisponibilidadRoles] === true
    }

    // 2. Patrón semanal
    const dayOfWeek = dayOfWeekFromDateStr(fecha)
    const template = availability.template
    if (template) {
        const dayTemplate = template[String(dayOfWeek)]
        if (dayTemplate) {
            return dayTemplate[rolKey as keyof DisponibilidadRoles] === true
        }
        return false
    }

    // 3. Estructura legacy: availability[díaSemana] = { rolKey: boolean }
    const legacyDay = availability[dayOfWeek] as Record<string, boolean> | undefined
    if (legacyDay) {
        return legacyDay[rolKey] !== false
    }

    // Estructura presente pero sin regla → no disponible (conservador)
    return false
}

/** ¿Tiene el hermano alguna disponibilidad configurada? (para la pestaña Personas) */
export function tieneDisponibilidadConfigurada(
    availability: PulpitoAvailability | null | undefined,
): boolean {
    if (!availability) return false
    const template = availability.template
    const hasTemplate = !!template && Object.values(template).some(day =>
        Object.values(day ?? {}).some(Boolean),
    )
    const exceptions = availability.exceptions
    const hasExceptions = !!exceptions && Object.keys(exceptions).length > 0
    return hasTemplate || hasExceptions
}
