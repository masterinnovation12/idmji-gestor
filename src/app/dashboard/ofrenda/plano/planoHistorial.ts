/**
 * Histórico y memoria de rotación del plano (Labor ofrenda).
 *
 * Punto de arranque del histórico: el recuento de veces por rol (ofrendario /
 * apoyo) que se muestra en «Personas» y la memoria de rotación (±3 servicios del
 * mismo turno) SOLO consideran servicios con `fecha >= PLANO_HISTORIAL_DESDE`.
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
        const cur = out.get(a.persona_id) ?? { ofrendario: 0, apoyo: 0 }
        if (a.rol === 'ofrendario') cur.ofrendario++
        else if (a.rol === 'apoyo') cur.apoyo++
        out.set(a.persona_id, cur)
    }
    return out
}
