/**
 * pulpitoEngine.ts
 * Motor de cálculo para el módulo Labor Púlpito.
 *
 * Dado un conjunto de cultos (con sus roles), los hermanos del púlpito con su
 * disponibilidad y la carga histórica reciente, asigna hermanos a cada rol con:
 *  1. Respeto estricto de la disponibilidad (patrón semanal + excepciones).
 *  2. Reparto equitativo (menor carga por rol primero, luego carga total).
 *  3. Anti-repetición por capas (no repetir en el mismo culto; evitar el culto
 *     inmediatamente anterior si hay alternativa).
 *
 * Todas las funciones son puras y no dependen de la BD → testeables con Vitest.
 */

import {
    isHermanoDisponible,
    PULPITO_ROLES,
    type PulpitoAvailability,
    type PulpitoRol,
} from './pulpitoAvailability'

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface HermanoPulpito {
    id: string
    nombre: string
    availability: PulpitoAvailability | null
}

/** Un culto a asignar (ya resuelto qué roles aplican según su tipo). */
export interface CultoParaAsignar {
    id: string
    fecha: string // 'YYYY-MM-DD'
    horaInicio: string
    /** Roles que aplican en este culto (según flags del tipo de culto). */
    roles: PulpitoRol[]
    /** Asignaciones actuales (para modo 'solo_huecos' y para carga). */
    asignacionesActuales: Partial<Record<PulpitoRol, string | null>>
}

/** Carga histórica reciente por hermano (para reparto justo entre períodos). */
export interface CargaHistorica {
    /** Total de asignaciones recientes por hermano. */
    total: Record<string, number>
    /** Asignaciones recientes por hermano y rol. */
    porRol: Record<string, Partial<Record<PulpitoRol, number>>>
}

export type ModoGeneracion = 'todo' | 'solo_huecos'

export interface AsignacionPulpito {
    cultoId: string
    fecha: string
    rol: PulpitoRol
    hermanoId: string | null
}

/** Rol de un culto que quedó sin candidato disponible. */
export interface ProblemaAsignacion {
    fecha: string
    rol: PulpitoRol
}

export interface ResultadoPulpito {
    asignaciones: AsignacionPulpito[]
    problemas: ProblemaAsignacion[]
}

export function cargaHistoricaVacia(): CargaHistorica {
    return { total: {}, porRol: {} }
}

// ─── Motor ─────────────────────────────────────────────────────────────────────

interface EstadoCarga {
    total: Map<string, number>
    porRol: Map<string, Map<PulpitoRol, number>>
}

function crearEstadoCarga(hermanos: HermanoPulpito[], historial: CargaHistorica): EstadoCarga {
    const total = new Map<string, number>()
    const porRol = new Map<string, Map<PulpitoRol, number>>()
    for (const h of hermanos) {
        total.set(h.id, historial.total[h.id] ?? 0)
        const rolMap = new Map<PulpitoRol, number>()
        for (const rol of PULPITO_ROLES) {
            rolMap.set(rol, historial.porRol[h.id]?.[rol] ?? 0)
        }
        porRol.set(h.id, rolMap)
    }
    return { total, porRol }
}

function sumarCarga(estado: EstadoCarga, hermanoId: string, rol: PulpitoRol): void {
    estado.total.set(hermanoId, (estado.total.get(hermanoId) ?? 0) + 1)
    const rolMap = estado.porRol.get(hermanoId)
    if (rolMap) rolMap.set(rol, (rolMap.get(rol) ?? 0) + 1)
}

/**
 * Ordena candidatos por equidad: menor carga en ese rol, luego menor carga
 * total, luego orden alfabético estable (para determinismo en tests).
 */
function ordenarPorEquidad(
    candidatos: HermanoPulpito[],
    rol: PulpitoRol,
    estado: EstadoCarga,
): HermanoPulpito[] {
    return [...candidatos].sort((a, b) => {
        const rolA = estado.porRol.get(a.id)?.get(rol) ?? 0
        const rolB = estado.porRol.get(b.id)?.get(rol) ?? 0
        if (rolA !== rolB) return rolA - rolB
        const totA = estado.total.get(a.id) ?? 0
        const totB = estado.total.get(b.id) ?? 0
        if (totA !== totB) return totA - totB
        return a.nombre.localeCompare(b.nombre)
    })
}

/**
 * Genera las asignaciones de púlpito para los cultos dados.
 *
 * @param cultos    Cultos ordenados cronológicamente con sus roles aplicables
 * @param hermanos  Hermanos del púlpito activos con su disponibilidad
 * @param historial Carga reciente (asignaciones previas al período) para equidad
 * @param modo      'todo' reasigna todos los roles; 'solo_huecos' respeta las
 *                  asignaciones existentes y solo rellena los roles vacíos
 */
export function generarAsignacionesPulpito(
    cultos: CultoParaAsignar[],
    hermanos: HermanoPulpito[],
    historial: CargaHistorica = cargaHistoricaVacia(),
    modo: ModoGeneracion = 'todo',
): ResultadoPulpito {
    const ordenados = [...cultos].sort((a, b) =>
        a.fecha === b.fecha
            ? a.horaInicio.localeCompare(b.horaInicio)
            : a.fecha.localeCompare(b.fecha),
    )

    const estado = crearEstadoCarga(hermanos, historial)
    const hermanoIds = new Set(hermanos.map(h => h.id))
    const asignaciones: AsignacionPulpito[] = []
    const problemas: ProblemaAsignacion[] = []

    /** Hermanos asignados en el culto inmediatamente anterior (anti-repetición). */
    let asignadosCultoAnterior = new Set<string>()

    for (const culto of ordenados) {
        const asignadosHoy = new Set<string>()
        const asignadosEsteCulto = new Set<string>()

        // En modo solo_huecos las asignaciones existentes se conservan y cuentan.
        const existentesConservadas = new Map<PulpitoRol, string>()
        if (modo === 'solo_huecos') {
            for (const rol of culto.roles) {
                const actual = culto.asignacionesActuales[rol]
                if (actual && hermanoIds.has(actual)) {
                    existentesConservadas.set(rol, actual)
                    asignadosEsteCulto.add(actual)
                    asignadosHoy.add(actual)
                }
            }
        }

        for (const rol of PULPITO_ROLES) {
            if (!culto.roles.includes(rol)) continue

            const conservada = existentesConservadas.get(rol)
            if (conservada) {
                sumarCarga(estado, conservada, rol)
                asignaciones.push({ cultoId: culto.id, fecha: culto.fecha, rol, hermanoId: conservada })
                continue
            }

            const disponibles = hermanos.filter(h =>
                isHermanoDisponible(h.availability, culto.fecha, rol),
            )

            // Capas de relajación: 1) evita repetir el culto anterior,
            // 2) solo evita duplicar dentro del mismo culto, 3) último recurso:
            // permite que el mismo hermano haga dos roles del culto (p. ej.
            // intro y finalización) antes que dejar el hueco vacío.
            const capa1 = disponibles.filter(h =>
                !asignadosEsteCulto.has(h.id) && !asignadosCultoAnterior.has(h.id),
            )
            const capa2 = disponibles.filter(h => !asignadosEsteCulto.has(h.id))
            let candidatos = capa1.length > 0 ? capa1 : capa2
            if (candidatos.length === 0) candidatos = disponibles

            if (candidatos.length === 0) {
                asignaciones.push({ cultoId: culto.id, fecha: culto.fecha, rol, hermanoId: null })
                problemas.push({ fecha: culto.fecha, rol })
                continue
            }

            const elegido = ordenarPorEquidad(candidatos, rol, estado)[0]
            sumarCarga(estado, elegido.id, rol)
            asignadosEsteCulto.add(elegido.id)
            asignadosHoy.add(elegido.id)
            asignaciones.push({ cultoId: culto.id, fecha: culto.fecha, rol, hermanoId: elegido.id })
        }

        asignadosCultoAnterior = asignadosHoy
    }

    return { asignaciones, problemas }
}

// ─── Validación previa (sin asignar) ──────────────────────────────────────────

/**
 * Comprueba, sin asignar, qué roles de qué cultos no tienen ningún hermano
 * disponible. Útil para avisar antes de generar.
 */
export function validarDisponibilidadPulpito(
    cultos: CultoParaAsignar[],
    hermanos: HermanoPulpito[],
): ProblemaAsignacion[] {
    const problemas: ProblemaAsignacion[] = []
    for (const culto of cultos) {
        for (const rol of culto.roles) {
            const alguno = hermanos.some(h =>
                isHermanoDisponible(h.availability, culto.fecha, rol),
            )
            if (!alguno) problemas.push({ fecha: culto.fecha, rol })
        }
    }
    return problemas
}

// ─── Roles aplicables según flags del tipo de culto ───────────────────────────

export interface CultoTypeFlags {
    tiene_lectura_introduccion?: boolean | null
    tiene_lectura_finalizacion?: boolean | null
    tiene_ensenanza?: boolean | null
    tiene_testimonios?: boolean | null
}

/**
 * Deriva los roles asignables de un culto a partir de los flags de su tipo.
 * @param ensenanzaEsVideo si la enseñanza es un vídeo, no se asigna hermano.
 */
export function rolesDelCulto(
    flags: CultoTypeFlags | null | undefined,
    ensenanzaEsVideo = false,
): PulpitoRol[] {
    if (!flags) return []
    const roles: PulpitoRol[] = []
    if (flags.tiene_lectura_introduccion) roles.push('introduccion')
    if (flags.tiene_ensenanza && !ensenanzaEsVideo) roles.push('ensenanza')
    if (flags.tiene_testimonios) roles.push('testimonios')
    if (flags.tiene_lectura_finalizacion) roles.push('finalizacion')
    return roles
}
