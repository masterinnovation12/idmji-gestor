import type { DiaTipo } from '@/lib/utils/ofrendaEngine'
import type { MiembroDisponibilidadTurnos } from '../ofrendaMemberAvailability'
import {
    cuentaTurnosActivos,
    puedeMiembroEnTurno,
} from '../ofrendaMemberAvailability'

export type PlanoGenero = 'mujer' | 'hombre'

export interface PlanoPersonaTurnos extends MiembroDisponibilidadTurnos {
    activo: boolean
    genero: PlanoGenero | null
    prioridad_ofrendario: boolean
    capacidad: 'ofrendario' | 'apoyo' | 'ambos'
}

export function puedePlanoPersonaEnTurno(
    p: MiembroDisponibilidadTurnos,
    diaTipo: DiaTipo,
): boolean {
    return puedeMiembroEnTurno(p, diaTipo)
}

export function planoPersonaParticipaEnGeneracion(p: PlanoPersonaTurnos): boolean {
    return p.activo && cuentaTurnosActivos(p) > 0
}

export function puedeRolCapacidad(
    capacidad: PlanoPersonaTurnos['capacidad'],
    rol: 'ofrendario' | 'apoyo',
): boolean {
    if (rol === 'ofrendario') return capacidad === 'ofrendario' || capacidad === 'ambos'
    return capacidad === 'apoyo' || capacidad === 'ambos'
}

export type PlanoTurnoSection = 'sin_turno' | 'jueves' | 'domingo_manana' | 'domingo_tarde'

export function clasificarSeccionTurno(p: MiembroDisponibilidadTurnos): PlanoTurnoSection {
    const n = cuentaTurnosActivos(p)
    if (n === 0) return 'sin_turno'
    if (p.puede_jueves && !p.puede_domingo_manana && !p.puede_domingo_tarde) return 'jueves'
    if (!p.puede_jueves && p.puede_domingo_manana && !p.puede_domingo_tarde) return 'domingo_manana'
    if (!p.puede_jueves && !p.puede_domingo_manana && p.puede_domingo_tarde) return 'domingo_tarde'
    return 'sin_turno'
}
