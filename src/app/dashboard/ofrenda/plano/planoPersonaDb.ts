import type { PlanoCapacidad } from './planoTypes'
import type { PlanoGenero } from './planoPersonaTurnos'
import {
    normalizeMiembroDisponibilidad,
    type MiembroDisponibilidadTurnos,
} from '../ofrendaMemberAvailability'

export interface PlanoPersonaFull {
    id: string
    nombre: string
    capacidad: PlanoCapacidad
    activo: boolean
    puede_jueves: boolean
    puede_domingo_manana: boolean
    puede_domingo_tarde: boolean
    genero: PlanoGenero | null
    prioridad_ofrendario: boolean
    parejaNombre: string | null
    parejaId: string | null
    /** Total de asignaciones (todo el histórico) — usado para avisar al borrar. */
    asignaciones: number
    /** Veces como ofrendario desde el arranque del histórico (PLANO_HISTORIAL_DESDE). */
    asignacionesOfrendario: number
    /** Veces como apoyo desde el arranque del histórico (PLANO_HISTORIAL_DESDE). */
    asignacionesApoyo: number
}

function readCapacidad(row: Record<string, unknown>): PlanoCapacidad {
    const c = row.capacidad
    return c === 'ofrendario' || c === 'apoyo' || c === 'ambos' ? c : 'ambos'
}

function readGenero(row: Record<string, unknown>): PlanoGenero | null {
    const g = row.genero
    return g === 'mujer' || g === 'hombre' ? g : null
}

export function readPlanoPersonaRow(
    row: Record<string, unknown>,
): Omit<PlanoPersonaFull, 'asignaciones' | 'asignacionesOfrendario' | 'asignacionesApoyo' | 'parejaNombre' | 'parejaId'> {
    const turnos = normalizeMiembroDisponibilidad({
        puede_jueves: row.puede_jueves as boolean | undefined,
        puede_domingo_manana: row.puede_domingo_manana as boolean | undefined,
        puede_domingo_tarde: row.puede_domingo_tarde as boolean | undefined,
    })
    return {
        id: row.id as string,
        nombre: row.nombre as string,
        capacidad: readCapacidad(row),
        activo: (row.activo as boolean) ?? true,
        ...turnos,
        genero: readGenero(row),
        prioridad_ofrendario: (row.prioridad_ofrendario as boolean) ?? false,
    }
}

export type PlanoPersonaTurnosPatch = MiembroDisponibilidadTurnos
