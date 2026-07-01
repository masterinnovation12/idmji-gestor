import type { DiaTipo } from '@/lib/utils/ofrendaEngine'
import type { PlanoRol } from '@/app/dashboard/ofrenda/plano/planoTypes'
import {
    clonarMapaRoleCounts,
    type PlanoRoleCounts,
} from '@/app/dashboard/ofrenda/plano/planoHistorial'
import {
    puedeRolCapacidad,
    planoPersonaParticipaEnGeneracion,
    type PlanoPersonaTurnos,
} from '@/app/dashboard/ofrenda/plano/planoPersonaTurnos'

export interface PlanoParejaEngine {
    mujerId: string
    hombreId: string
}

export interface PlanoPersonaEngine extends PlanoPersonaTurnos {
    id: string
    nombre: string
}

export interface PlanoAsignacionBorrador {
    bloque: number
    rol: PlanoRol
    persona_id: string
    nombre_snapshot: string
}

export interface PlanoHistorialUso {
    /** Recencia en servicios vecinos ±3 (mismo turno). */
    conteo: Map<string, number>
    ultimaPorTurno: Partial<Record<DiaTipo, string>>
    /** Histórico O/A acumulado (misma fuente que «1O · 2A» en Personas). */
    roles: Map<string, PlanoRoleCounts>
}

export interface VecinoAsignacion {
    persona_id: string | null
    rol: string
}

export function crearHistorialVacio(): PlanoHistorialUso {
    return { conteo: new Map(), ultimaPorTurno: {}, roles: new Map() }
}

/**
 * Combina el histórico global O/A con la recencia de vecinos ±3 antes de
 * asignar un culto. Los roles vienen de BD; los vecinos solo penalizan recencia.
 */
export function construirHistorialParaServicio(
    rolesAcumulado: ReadonlyMap<string, PlanoRoleCounts>,
    vecinos: readonly VecinoAsignacion[],
): PlanoHistorialUso {
    const h = crearHistorialVacio()
    h.roles = clonarMapaRoleCounts(rolesAcumulado)
    for (const v of vecinos) {
        if (v.persona_id) sembrarUso(h, v.persona_id)
    }
    return h
}

/**
 * Añade `veces` usos previos a una persona para sesgar la rotación (equidad).
 * Se usa para sembrar el historial con los servicios vecinos (±3 del mismo turno)
 * cargados desde la base de datos antes de generar.
 */
export function sembrarUso(h: PlanoHistorialUso, id: string, veces = 1): void {
    if (veces <= 0) return
    h.conteo.set(id, (h.conteo.get(id) ?? 0) + veces)
}

function uso(h: PlanoHistorialUso, id: string): number {
    return h.conteo.get(id) ?? 0
}

function registrarUso(h: PlanoHistorialUso, id: string, diaTipo: DiaTipo, rol: PlanoRol): void {
    h.conteo.set(id, uso(h, id) + 1)
    h.ultimaPorTurno[diaTipo] = id
    const cur = h.roles.get(id) ?? { ofrendario: 0, apoyo: 0 }
    if (rol === 'ofrendario') cur.ofrendario++
    else cur.apoyo++
    h.roles.set(id, cur)
}

/** Menor score = más prioritario. Pesa O/A del turno y recencia en vecinos ±3. */
export function scorePersonaRol(
    p: PlanoPersonaEngine,
    h: PlanoHistorialUso,
    diaTipo: DiaTipo,
    rol: PlanoRol,
): number {
    const rc = h.roles.get(p.id) ?? { ofrendario: 0, apoyo: 0 }
    const rolCount = rol === 'ofrendario' ? rc.ofrendario : rc.apoyo
    let s = rolCount * 100
    s += uso(h, p.id) * 50
    if (h.ultimaPorTurno[diaTipo] === p.id) s += 50
    return s
}

function parejaDe(
    parejas: PlanoParejaEngine[],
    personaId: string,
): { otroId: string } | null {
    for (const par of parejas) {
        if (par.mujerId === personaId) return { otroId: par.hombreId }
        if (par.hombreId === personaId) return { otroId: par.mujerId }
    }
    return null
}

function sonPareja(parejas: PlanoParejaEngine[], a: string, b: string): boolean {
    return parejas.some(p => (p.mujerId === a && p.hombreId === b) || (p.mujerId === b && p.hombreId === a))
}

export function poolElegible(
    personas: PlanoPersonaEngine[],
    diaTipo: DiaTipo,
    yaAsignados: Set<string>,
): PlanoPersonaEngine[] {
    return personas.filter(p => {
        if (!planoPersonaParticipaEnGeneracion(p)) return false
        if (yaAsignados.has(p.id)) return false
        if (diaTipo === 'jueves') return p.puede_jueves
        if (diaTipo === 'domingo') return p.puede_domingo_manana
        return p.puede_domingo_tarde
    })
}

function elegirOfrendarioApoyo(
    a: PlanoPersonaEngine,
    b: PlanoPersonaEngine,
    parejas: PlanoParejaEngine[],
    h: PlanoHistorialUso,
    diaTipo: DiaTipo,
): { ofrendario: PlanoPersonaEngine; apoyo: PlanoPersonaEngine } | null {
    if (sonPareja(parejas, a.id, b.id)) {
        const hombre = a.genero === 'hombre' ? a : b.genero === 'hombre' ? b : null
        const mujer = a.genero === 'mujer' ? a : b.genero === 'mujer' ? b : null
        if (!hombre || !mujer) return null
        if (!puedeRolCapacidad(hombre.capacidad, 'ofrendario')) return null
        if (!puedeRolCapacidad(mujer.capacidad, 'apoyo')) return null
        return { ofrendario: hombre, apoyo: mujer }
    }

    if (a.genero !== b.genero) return null

    const starA = a.prioridad_ofrendario && puedeRolCapacidad(a.capacidad, 'ofrendario')
    const starB = b.prioridad_ofrendario && puedeRolCapacidad(b.capacidad, 'ofrendario')

    if (starA && !starB && puedeRolCapacidad(b.capacidad, 'apoyo')) {
        return { ofrendario: a, apoyo: b }
    }
    if (starB && !starA && puedeRolCapacidad(a.capacidad, 'apoyo')) {
        return { ofrendario: b, apoyo: a }
    }

    const aOf = puedeRolCapacidad(a.capacidad, 'ofrendario')
    const bOf = puedeRolCapacidad(b.capacidad, 'ofrendario')
    const aAp = puedeRolCapacidad(a.capacidad, 'apoyo')
    const bAp = puedeRolCapacidad(b.capacidad, 'apoyo')

    if (
        aOf &&
        bAp &&
        scorePersonaRol(a, h, diaTipo, 'ofrendario') <= scorePersonaRol(b, h, diaTipo, 'ofrendario')
    ) {
        return { ofrendario: a, apoyo: b }
    }
    if (
        bOf &&
        aAp &&
        scorePersonaRol(b, h, diaTipo, 'ofrendario') < scorePersonaRol(a, h, diaTipo, 'ofrendario')
    ) {
        return { ofrendario: b, apoyo: a }
    }
    if (aOf && bAp) return { ofrendario: a, apoyo: b }
    if (bOf && aAp) return { ofrendario: b, apoyo: a }
    return null
}

function paresCandidatos(
    pool: PlanoPersonaEngine[],
    parejas: PlanoParejaEngine[],
): Array<[PlanoPersonaEngine, PlanoPersonaEngine, number]> {
    const out: Array<[PlanoPersonaEngine, PlanoPersonaEngine, number]> = []
    const used = new Set<string>()

    for (const p of pool) {
        const par = parejaDe(parejas, p.id)
        if (par) {
            const otro = pool.find(x => x.id === par.otroId)
            if (otro && !used.has(p.id) && !used.has(otro.id)) {
                used.add(p.id)
                used.add(otro.id)
                out.push([p, otro, 0])
            }
        }
    }

    for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
            const a = pool[i]
            const b = pool[j]
            if (used.has(a.id) || used.has(b.id)) continue
            if (sonPareja(parejas, a.id, b.id)) continue
            if (a.genero !== b.genero) continue
            out.push([a, b, 1])
        }
    }
    return out
}

export function asignarPlanoServicio(
    diaTipo: DiaTipo,
    sacos: number,
    personas: PlanoPersonaEngine[],
    parejas: PlanoParejaEngine[],
    historial: PlanoHistorialUso,
): PlanoAsignacionBorrador[] {
    const asignados = new Set<string>()
    const pool = () => poolElegible(personas, diaTipo, asignados)
    const resultado: PlanoAsignacionBorrador[] = []

    for (let bloque = 1; bloque <= sacos; bloque++) {
        const candidatos = paresCandidatos(pool(), parejas)
            .map(([a, b, tier]) => {
                const par = elegirOfrendarioApoyo(a, b, parejas, historial, diaTipo)
                if (!par) return null
                const score =
                    tier * 1000 +
                    scorePersonaRol(par.ofrendario, historial, diaTipo, 'ofrendario') +
                    scorePersonaRol(par.apoyo, historial, diaTipo, 'apoyo')
                return { par, score }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((x, y) => x.score - y.score)

        const mejor = candidatos[0]
        if (!mejor) break

        const { ofrendario, apoyo } = mejor.par
        asignados.add(ofrendario.id)
        asignados.add(apoyo.id)
        registrarUso(historial, ofrendario.id, diaTipo, 'ofrendario')
        registrarUso(historial, apoyo.id, diaTipo, 'apoyo')

        resultado.push(
            {
                bloque,
                rol: 'ofrendario',
                persona_id: ofrendario.id,
                nombre_snapshot: ofrendario.nombre,
            },
            {
                bloque,
                rol: 'apoyo',
                persona_id: apoyo.id,
                nombre_snapshot: apoyo.nombre,
            },
        )
    }

    return resultado
}

export function validarPoolSuficiente(
    personas: PlanoPersonaEngine[],
    diaTipo: DiaTipo,
    sacos: number,
): boolean {
    const pool = poolElegible(personas, diaTipo, new Set())
    return pool.length >= sacos * 2
}
