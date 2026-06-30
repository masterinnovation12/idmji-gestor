import { colaboradoresG2Requeridos, type DiaTipo } from '@/lib/utils/ofrendaEngine'

/** Campos de disponibilidad por turno (alineados con dia_tipo del plan). */
export interface MiembroDisponibilidadTurnos {
    puede_jueves: boolean
    puede_domingo_manana: boolean
    puede_domingo_tarde: boolean
}

export type DisponibilidadPreset = 'all' | 'jueves' | 'domingo' | 'custom'

export const DISPONIBILIDAD_TURNOS_DEFAULT: MiembroDisponibilidadTurnos = {
    puede_jueves: true,
    puede_domingo_manana: true,
    puede_domingo_tarde: true,
}

/** Convierte valor de BD/JSON a boolean; distingue false explícito de ausente. */
export function parseDisponibilidadFlag(value: unknown, defaultValue: boolean): boolean {
    if (value === true || value === false) return value
    if (value === 'true' || value === 1 || value === '1') return true
    if (value === 'false' || value === 0 || value === '0') return false
    return defaultValue
}

export function normalizeMiembroDisponibilidad(
    raw?: Partial<MiembroDisponibilidadTurnos> | null,
): MiembroDisponibilidadTurnos {
    const has = (k: keyof MiembroDisponibilidadTurnos) =>
        raw !== null && raw !== undefined && k in raw

    return {
        puede_jueves: has('puede_jueves')
            ? parseDisponibilidadFlag(raw!.puede_jueves, true)
            : true,
        puede_domingo_manana: has('puede_domingo_manana')
            ? parseDisponibilidadFlag(raw!.puede_domingo_manana, true)
            : true,
        puede_domingo_tarde: has('puede_domingo_tarde')
            ? parseDisponibilidadFlag(raw!.puede_domingo_tarde, true)
            : true,
    }
}

export function puedeMiembroEnTurno(
    m: MiembroDisponibilidadTurnos,
    diaTipo: DiaTipo,
): boolean {
    if (diaTipo === 'jueves') return m.puede_jueves
    if (diaTipo === 'domingo') return m.puede_domingo_manana
    return m.puede_domingo_tarde
}

export function filtrarMiembrosPorTurno<T extends MiembroDisponibilidadTurnos>(
    miembros: T[],
    diaTipo: DiaTipo,
): T[] {
    return miembros.filter(m => puedeMiembroEnTurno(m, diaTipo))
}

export function cuentaTurnosActivos(d: MiembroDisponibilidadTurnos): number {
    return [d.puede_jueves, d.puede_domingo_manana, d.puede_domingo_tarde].filter(Boolean).length
}

/** Activo y con al menos un turno marcado → entra en generación automática. */
export function miembroParticipaEnGeneracion(
    m: MiembroDisponibilidadTurnos & { activo: boolean },
): boolean {
    return m.activo && cuentaTurnosActivos(m) > 0
}

export function disponibilidadFromPreset(preset: DisponibilidadPreset): MiembroDisponibilidadTurnos {
    switch (preset) {
        case 'jueves':
            return { puede_jueves: true, puede_domingo_manana: false, puede_domingo_tarde: false }
        case 'domingo':
            return { puede_jueves: false, puede_domingo_manana: true, puede_domingo_tarde: true }
        case 'all':
            return { ...DISPONIBILIDAD_TURNOS_DEFAULT }
        default:
            return { ...DISPONIBILIDAD_TURNOS_DEFAULT }
    }
}

export function detectDisponibilidadPreset(d: MiembroDisponibilidadTurnos): DisponibilidadPreset {
    if (d.puede_jueves && d.puede_domingo_manana && d.puede_domingo_tarde) return 'all'
    if (d.puede_jueves && !d.puede_domingo_manana && !d.puede_domingo_tarde) return 'jueves'
    if (!d.puede_jueves && d.puede_domingo_manana && d.puede_domingo_tarde) return 'domingo'
    return 'custom'
}

export interface ValidacionGeneracionTurno {
    diaTipo: DiaTipo
    grupo: 1 | 2
    elegibles: number
}

export interface ValidacionGeneracionPlan {
    ok: boolean
    problemas: ValidacionGeneracionTurno[]
}

type MiembroGen = MiembroDisponibilidadTurnos & { grupo: 1 | 2; activo: boolean }

/**
 * Comprueba que cada turno del mes tenga miembros elegibles suficientes por grupo.
 * G1: al menos 1. G2: según {@link colaboradoresG2Requeridos} (2 jueves/tarde, 3 dom mañana).
 * Ignora inactivos y quienes no tienen ningún turno marcado.
 */
export function validarDisponibilidadParaGenerar(
    fechas: Array<{ diaTipo: DiaTipo }>,
    miembros: MiembroGen[],
    regenerarGrupo: 1 | 2 | null,
): ValidacionGeneracionPlan {
    const problemas: ValidacionGeneracionTurno[] = []
    const turnosUnicos = new Map<DiaTipo, true>()
    for (const { diaTipo } of fechas) turnosUnicos.set(diaTipo, true)

    for (const diaTipo of turnosUnicos.keys()) {
        for (const grupo of [1, 2] as const) {
            if (regenerarGrupo !== null && regenerarGrupo !== grupo) continue
            const minimo = grupo === 2 ? colaboradoresG2Requeridos(diaTipo) : 1
            const elegibles = miembros.filter(
                m =>
                    miembroParticipaEnGeneracion(m) &&
                    m.grupo === grupo &&
                    puedeMiembroEnTurno(m, diaTipo),
            ).length
            if (elegibles < minimo) {
                problemas.push({ diaTipo, grupo, elegibles })
            }
        }
    }

    return { ok: problemas.length === 0, problemas }
}
