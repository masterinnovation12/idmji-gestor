/**
 * Histórico y memoria de rotación del plano (Labor ofrenda).
 *
 * Punto de arranque del histórico: el recuento de veces por rol (ofrendario /
 * apoyo) que se muestra en «Personas» y la penalización por vecinos ±3 SOLO
 * consideran servicios con `fecha >= PLANO_HISTORIAL_DESDE`.
 *
 * Al **generar**, el equilibrio O/A usa el histórico **del mismo turno**
 * (jueves / domingo mañana / domingo tarde); Personas sigue mostrando el total
 * global entre turnos.
 *
 * Motivo: las semanas de junio anteriores a S.26 fueron pruebas; el histórico real
 * arranca el jueves 25/06/2026 (última semana de junio). Cambiar esta fecha
 * reajusta ambos cómputos.
 */
export const PLANO_HISTORIAL_DESDE = '2026-06-25'

export interface PlanoRoleCounts {
    ofrendario: number
    apoyo: number
}

export interface AsignacionRolRow {
    persona_id: string | null
    rol: string
    servicio_id: string
}

export interface ServicioTurnoRow {
    id: string
    dia_tipo: string
}

export type PlanoTurnoHistorial = 'jueves' | 'domingo' | 'domingo_tarde'

const TURNOS_HISTORIAL: PlanoTurnoHistorial[] = ['jueves', 'domingo', 'domingo_tarde']

export function servicioIdsPorTurno(
    servicios: readonly ServicioTurnoRow[],
    diaTipo: PlanoTurnoHistorial,
): Set<string> {
    return new Set(servicios.filter(s => s.dia_tipo === diaTipo).map(s => s.id))
}

/**
 * Histórico O/A por turno para generación: cada dia_tipo tiene su propio mapa.
 */
export function construirRolesPorTurno(
    asignaciones: readonly AsignacionRolRow[],
    servicios: readonly ServicioTurnoRow[],
): Map<PlanoTurnoHistorial, Map<string, PlanoRoleCounts>> {
    const out = new Map<PlanoTurnoHistorial, Map<string, PlanoRoleCounts>>()
    for (const dia of TURNOS_HISTORIAL) {
        out.set(dia, contarRolesPorPersona(asignaciones, servicioIdsPorTurno(servicios, dia)))
    }
    return out
}

export function clonarRolesPorTurno(
    src: ReadonlyMap<PlanoTurnoHistorial, Map<string, PlanoRoleCounts>>,
): Map<PlanoTurnoHistorial, Map<string, PlanoRoleCounts>> {
    const out = new Map<PlanoTurnoHistorial, Map<string, PlanoRoleCounts>>()
    for (const dia of TURNOS_HISTORIAL) {
        out.set(dia, clonarMapaRoleCounts(src.get(dia) ?? new Map()))
    }
    return out
}

/**
 * Cuenta cuántas veces cada persona ha sido ofrendario y apoyo, considerando
 * solo las asignaciones cuyo servicio está dentro del histórico válido.
 */
export function contarRolesPorPersona(
    asignaciones: readonly AsignacionRolRow[],
    servicioIdsValidos: ReadonlySet<string>,
): Map<string, PlanoRoleCounts> {
    const out = new Map<string, PlanoRoleCounts>()
    for (const a of asignaciones) {
        if (!a.persona_id) continue
        if (!servicioIdsValidos.has(a.servicio_id)) continue
        sumarRolEnMapa(out, a.persona_id, a.rol)
    }
    return out
}

/** Copia profunda del mapa de conteos O/A (para sesión de generación). */
export function clonarMapaRoleCounts(
    src: ReadonlyMap<string, PlanoRoleCounts>,
): Map<string, PlanoRoleCounts> {
    const out = new Map<string, PlanoRoleCounts>()
    for (const [id, c] of src) out.set(id, { ...c })
    return out
}

/** Incrementa el conteo de un rol en el mapa acumulado. */
export function sumarRolEnMapa(
    map: Map<string, PlanoRoleCounts>,
    personaId: string,
    rol: string,
    delta = 1,
): void {
    if (delta <= 0) return
    const cur = map.get(personaId) ?? { ofrendario: 0, apoyo: 0 }
    if (rol === 'ofrendario') cur.ofrendario += delta
    else if (rol === 'apoyo') cur.apoyo += delta
    map.set(personaId, cur)
}

/** Actualiza el acumulado de sesión tras insertar asignaciones de un culto. */
export function aplicarAsignacionesARolesSesion(
    sesion: Map<string, PlanoRoleCounts>,
    asignaciones: ReadonlyArray<{ persona_id: string; rol: string }>,
): void {
    for (const a of asignaciones) {
        if (a.persona_id) sumarRolEnMapa(sesion, a.persona_id, a.rol)
    }
}
