/**
 * Rescate de asignaciones del Plano del Templo al regenerar el plan.
 *
 * `ofrenda_plano_asignaciones` cuelga de `ofrenda_servicios` con ON DELETE CASCADE.
 * Al regenerar se borran y recrean los servicios (IDs nuevos), por lo que hay que
 * rescatar las asignaciones por (fecha, dia_tipo, bloque, rol) y reinsertarlas con
 * el nuevo servicio_id. Lógica pura (testeable) separada del server action.
 */

export type PlanoAsigSnapshot = {
    /** Identidad estable del servicio entre regeneraciones: `${fecha}:${dia_tipo}`. */
    key: string
    bloque: number
    rol: string
    persona_id: string | null
    nombre_snapshot: string | null
}

export type PlanoAsigRestoreRow = {
    servicio_id: string
    bloque: number
    rol: string
    persona_id: string | null
    nombre_snapshot: string | null
}

/**
 * Mapea el snapshot a filas listas para insertar, usando el nuevo mapa
 * `${fecha}:${dia_tipo}` → servicio_id. Descarta las cuyo servicio ya no existe.
 */
export function remapPlanoAsignaciones(
    snapshot: PlanoAsigSnapshot[],
    srvMap: Record<string, string>,
): PlanoAsigRestoreRow[] {
    const out: PlanoAsigRestoreRow[] = []
    for (const a of snapshot) {
        const servicio_id = srvMap[a.key]
        if (!servicio_id) continue
        out.push({
            servicio_id,
            bloque: a.bloque,
            rol: a.rol,
            persona_id: a.persona_id,
            nombre_snapshot: a.nombre_snapshot,
        })
    }
    return out
}
