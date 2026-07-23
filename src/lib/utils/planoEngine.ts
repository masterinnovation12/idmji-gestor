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
    /** Histórico O/A acumulado (misma fuente que «1O · 2A» en Personas). */
    roles: Map<string, PlanoRoleCounts>
    /** Veces que un par exacto (clave {@link parKey}) salió junto en vecinos ±3. */
    paresRecientes: Map<string, number>
    /** Recencia en cultos de la misma semana en OTROS turnos (jue ↔ dom M ↔ dom T). */
    mismaSemanaOtroTurno: Map<string, number>
    /**
     * Personas del servicio INMEDIATAMENTE anterior del mismo turno
     * (el domingo mañana pasado para un domingo mañana, etc.).
     * Se vetan en la capa 1 de {@link asignarPlanoServicio}.
     */
    servicioAnterior: Set<string>
    /** Pares exactos ({@link parKey}) que salieron juntos en ese servicio anterior. */
    paresServicioAnterior: Set<string>
}

export interface VecinoAsignacion {
    persona_id: string | null
    rol: string
    /** servicio + bloque permiten reconstruir con quién compartió saco. */
    servicio_id?: string
    bloque?: number
}

export function crearHistorialVacio(): PlanoHistorialUso {
    return {
        conteo: new Map(),
        roles: new Map(),
        paresRecientes: new Map(),
        mismaSemanaOtroTurno: new Map(),
        servicioAnterior: new Set(),
        paresServicioAnterior: new Set(),
    }
}

/** Copia independiente: cada capa de relajación se prueba sobre su propio historial. */
export function clonarHistorial(h: PlanoHistorialUso): PlanoHistorialUso {
    return {
        conteo: new Map(h.conteo),
        roles: clonarMapaRoleCounts(h.roles),
        paresRecientes: new Map(h.paresRecientes),
        mismaSemanaOtroTurno: new Map(h.mismaSemanaOtroTurno),
        servicioAnterior: new Set(h.servicioAnterior),
        paresServicioAnterior: new Set(h.paresServicioAnterior),
    }
}

/** Vuelca el estado de la capa ganadora sobre el historial del llamante. */
function volcarHistorial(dst: PlanoHistorialUso, src: PlanoHistorialUso): void {
    dst.conteo = src.conteo
    dst.roles = src.roles
    dst.paresRecientes = src.paresRecientes
    dst.mismaSemanaOtroTurno = src.mismaSemanaOtroTurno
    dst.servicioAnterior = src.servicioAnterior
    dst.paresServicioAnterior = src.paresServicioAnterior
}

/** Clave canónica de un par de personas (orden estable). */
export function parKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Combina el histórico global O/A con la recencia de vecinos ±3 antes de
 * asignar un culto. Los roles vienen de BD; los vecinos penalizan recencia y,
 * si traen servicio+bloque, también la repetición del mismo par. Los cultos de
 * la misma semana en otros turnos penalizan salir dos veces la misma semana.
 */
export function construirHistorialParaServicio(
    rolesAcumulado: ReadonlyMap<string, PlanoRoleCounts>,
    vecinos: readonly VecinoAsignacion[],
    vecinosMismaSemana: readonly VecinoAsignacion[] = [],
    servicioAnteriorId: string | null = null,
): PlanoHistorialUso {
    const h = crearHistorialVacio()
    h.roles = clonarMapaRoleCounts(rolesAcumulado)
    const porBloque = new Map<string, { servicioId: string; ids: string[] }>()
    for (const v of vecinos) {
        if (!v.persona_id) continue
        sembrarUso(h, v.persona_id)
        if (servicioAnteriorId && v.servicio_id === servicioAnteriorId) {
            h.servicioAnterior.add(v.persona_id)
        }
        if (v.servicio_id != null && v.bloque != null) {
            const key = `${v.servicio_id}#${v.bloque}`
            const entry = porBloque.get(key) ?? { servicioId: v.servicio_id, ids: [] }
            entry.ids.push(v.persona_id)
            porBloque.set(key, entry)
        }
    }
    for (const { servicioId, ids } of porBloque.values()) {
        if (ids.length !== 2) continue
        const key = parKey(ids[0], ids[1])
        h.paresRecientes.set(key, (h.paresRecientes.get(key) ?? 0) + 1)
        if (servicioAnteriorId && servicioId === servicioAnteriorId) {
            h.paresServicioAnterior.add(key)
        }
    }
    for (const v of vecinosMismaSemana) {
        if (!v.persona_id) continue
        h.mismaSemanaOtroTurno.set(v.persona_id, (h.mismaSemanaOtroTurno.get(v.persona_id) ?? 0) + 1)
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

function registrarUso(h: PlanoHistorialUso, id: string, rol: PlanoRol): void {
    h.conteo.set(id, uso(h, id) + 1)
    const cur = h.roles.get(id) ?? { ofrendario: 0, apoyo: 0 }
    if (rol === 'ofrendario') cur.ofrendario++
    else cur.apoyo++
    h.roles.set(id, cur)
}

// ─── Pesos del score (menor = más prioritario) ────────────────────────────────
/** Cada vez que ya hizo este rol en el turno (equilibra O contra A en una persona). */
const PESO_ROL_TURNO = 100
/**
 * Cada salida en el turno, sea del rol que sea (equidad de participación).
 * Sin esto, quien acumulaba 2 O y 0 A puntuaba 0 como apoyo y volvía a salir
 * por delante de alguien que no había salido nunca: el reparto quedaba entre
 * 1 y 4 salidas para el mismo periodo.
 */
const PESO_SALIDAS_TURNO = 100
/**
 * Cada aparición en los servicios vecinos ±3 del mismo turno.
 * Por encima de {@link PESO_SALIDAS_TURNO} para que lo reciente pese más que lo
 * antiguo: cuando la paridad de géneros obliga a repetir a alguien del culto
 * anterior (capas 2 y 3), ese comodín va rotando en vez de recaer siempre en la
 * misma persona por tener el acumulado más bajo.
 */
const PESO_RECENCIA_TURNO = 150
/**
 * Estuvo en el servicio INMEDIATAMENTE anterior del mismo turno.
 * Debe dominar al desequilibrio de equidad acumulada (100/salida): si no,
 * alguien con pocas salidas repetía domingo tras domingo. En la capa 1 esas
 * personas ni siquiera entran al pool; este peso solo ordena las capas 2 y 3.
 */
const PESO_SERVICIO_ANTERIOR = 600
/** Cada aparición en otro culto de la MISMA semana (otro turno). */
const PESO_MISMA_SEMANA = 300
/**
 * Cada vez que este par exacto ya salió junto en vecinos ±3.
 * Por encima de {@link PESO_TIER_NO_PAREJA} para que un matrimonio que acaba de
 * salir junto se separe (cada uno con alguien de su mismo género) en vez de
 * monopolizar el mismo saco semana tras semana.
 */
const PESO_PAR_REPETIDO = 400
/**
 * Ventaja de un matrimonio sobre un par del mismo género: preferencia suave,
 * en igualdad de rotación el matrimonio gana el saco.
 *
 * Calibrado a 120 midiendo agosto 2026 sobre datos reales: subirlo a 300 solo
 * ganaba 1 bloque de matrimonio en todo el mes y a cambio metía 2 repeticiones
 * respecto al culto anterior (elegir un par mixto cambia la paridad de géneros
 * que queda en el pool). La prioridad del módulo es no repetir.
 */
const PESO_TIER_NO_PAREJA = 120

/**
 * Menor score = más prioritario. Pesa O/A del turno, recencia ±3, haber estado
 * en el servicio anterior del turno y haber salido ya esta semana en otro turno.
 * El historial que recibe ya es el del turno en curso, por eso no necesita `diaTipo`.
 */
export function scorePersonaRol(
    p: PlanoPersonaEngine,
    h: PlanoHistorialUso,
    rol: PlanoRol,
): number {
    const rc = h.roles.get(p.id) ?? { ofrendario: 0, apoyo: 0 }
    const rolCount = rol === 'ofrendario' ? rc.ofrendario : rc.apoyo
    let s = rolCount * PESO_ROL_TURNO
    s += (rc.ofrendario + rc.apoyo) * PESO_SALIDAS_TURNO
    s += uso(h, p.id) * PESO_RECENCIA_TURNO
    if (h.servicioAnterior.has(p.id)) s += PESO_SERVICIO_ANTERIOR
    s += (h.mismaSemanaOtroTurno.get(p.id) ?? 0) * PESO_MISMA_SEMANA
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

    if (aOf && bAp && scorePersonaRol(a, h, 'ofrendario') <= scorePersonaRol(b, h, 'ofrendario')) {
        return { ofrendario: a, apoyo: b }
    }
    if (bOf && aAp && scorePersonaRol(b, h, 'ofrendario') < scorePersonaRol(a, h, 'ofrendario')) {
        return { ofrendario: b, apoyo: a }
    }
    if (aOf && bAp) return { ofrendario: a, apoyo: b }
    if (bOf && aAp) return { ofrendario: b, apoyo: a }
    return null
}

/**
 * Todos los pares válidos del pool, con su tier (0 = matrimonio, 1 = mismo género).
 *
 * Regla de emparejamiento (invariante del módulo): hombre+hombre o mujer+mujer;
 * mixto **solo** si están registrados como pareja. Nunca se genera un par mixto
 * que no sea matrimonio, así que ningún peso puede colar uno.
 *
 * Un miembro de un matrimonio aparece **además** en los pares de su mismo
 * género: antes quedaba marcado como «usado» tras añadir su pareja y eso lo
 * dejaba fuera de cualquier otra combinación, así que un matrimonio o salía
 * junto o no salía — de ahí que los mismos matrimonios monopolizaran el saco.
 */
function paresCandidatos(
    pool: PlanoPersonaEngine[],
    parejas: PlanoParejaEngine[],
): Array<[PlanoPersonaEngine, PlanoPersonaEngine, number]> {
    const out: Array<[PlanoPersonaEngine, PlanoPersonaEngine, number]> = []
    const vistos = new Set<string>()

    for (const p of pool) {
        const par = parejaDe(parejas, p.id)
        if (!par) continue
        const otro = pool.find(x => x.id === par.otroId)
        if (!otro) continue
        const key = parKey(p.id, otro.id)
        if (vistos.has(key)) continue
        vistos.add(key)
        out.push([p, otro, 0])
    }

    for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
            const a = pool[i]
            const b = pool[j]
            if (sonPareja(parejas, a.id, b.id)) continue // ya añadido como tier 0
            if (a.genero !== b.genero) continue
            out.push([a, b, 1])
        }
    }
    return out
}

/**
 * Capas de relajación de la anti-repetición contra el servicio anterior del
 * mismo turno. Se prueban en orden y gana la primera que llena todos los sacos:
 *  1. Veto duro de personas y de pares del servicio anterior.
 *  2. Veto duro solo del par exacto; las personas pagan {@link PESO_SERVICIO_ANTERIOR}.
 *  3. Sin vetos (solo pesos) — red de seguridad para pools ajustados.
 *
 * Sin capas, un pool corto (p. ej. domingo tarde: 14 personas para 8 plazas,
 * solapamiento mínimo forzado de 2) dejaría sacos vacíos.
 */
export const PLANO_CAPAS_VETO = [1, 2, 3] as const
export type PlanoCapaVeto = (typeof PLANO_CAPAS_VETO)[number]

export interface AsignarPlanoServicioOpts {
    /** Bloques que ya tienen gente en BD (modo «rellenar»): no se regeneran. */
    bloquesOcupados?: readonly number[]
    /** Personas ya asignadas en ese servicio: no pueden repetir dentro del culto. */
    yaAsignados?: Iterable<string>
}

function bloquesPendientes(sacos: number, ocupados: readonly number[] = []): number[] {
    const set = new Set(ocupados)
    const out: number[] = []
    for (let b = 1; b <= sacos; b++) if (!set.has(b)) out.push(b)
    return out
}

function asignarConCapa(
    diaTipo: DiaTipo,
    bloques: readonly number[],
    personas: PlanoPersonaEngine[],
    parejas: PlanoParejaEngine[],
    historial: PlanoHistorialUso,
    capa: PlanoCapaVeto,
    opts: AsignarPlanoServicioOpts,
): PlanoAsignacionBorrador[] {
    const asignados = new Set<string>(opts.yaAsignados ?? [])
    const vetadas = capa === 1 ? historial.servicioAnterior : null
    const pool = () => {
        const base = poolElegible(personas, diaTipo, asignados)
        return vetadas ? base.filter(p => !vetadas.has(p.id)) : base
    }
    const resultado: PlanoAsignacionBorrador[] = []

    for (const bloque of bloques) {
        const candidatos = paresCandidatos(pool(), parejas)
            .map(([a, b, tier]) => {
                const key = parKey(a.id, b.id)
                if (capa !== 3 && historial.paresServicioAnterior.has(key)) return null
                const par = elegirOfrendarioApoyo(a, b, parejas, historial)
                if (!par) return null
                const repes = historial.paresRecientes.get(key) ?? 0
                const score =
                    tier * PESO_TIER_NO_PAREJA +
                    repes * PESO_PAR_REPETIDO +
                    scorePersonaRol(par.ofrendario, historial, 'ofrendario') +
                    scorePersonaRol(par.apoyo, historial, 'apoyo')
                return { par, score }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((x, y) => x.score - y.score)

        const mejor = candidatos[0]
        if (!mejor) break

        const { ofrendario, apoyo } = mejor.par
        asignados.add(ofrendario.id)
        asignados.add(apoyo.id)
        registrarUso(historial, ofrendario.id, 'ofrendario')
        registrarUso(historial, apoyo.id, 'apoyo')

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

export function asignarPlanoServicio(
    diaTipo: DiaTipo,
    sacos: number,
    personas: PlanoPersonaEngine[],
    parejas: PlanoParejaEngine[],
    historial: PlanoHistorialUso,
    opts: AsignarPlanoServicioOpts = {},
): PlanoAsignacionBorrador[] {
    const bloques = bloquesPendientes(sacos, opts.bloquesOcupados)
    if (bloques.length === 0) return []

    const objetivo = bloques.length * 2
    let mejor: { res: PlanoAsignacionBorrador[]; h: PlanoHistorialUso } | null = null

    for (const capa of PLANO_CAPAS_VETO) {
        const h = clonarHistorial(historial)
        const res = asignarConCapa(diaTipo, bloques, personas, parejas, h, capa, opts)
        // Empate → gana la capa más estricta (la primera probada).
        if (!mejor || res.length > mejor.res.length) mejor = { res, h }
        if (res.length === objetivo) break
    }

    if (!mejor) return []
    volcarHistorial(historial, mejor.h)
    return mejor.res
}

export function validarPoolSuficiente(
    personas: PlanoPersonaEngine[],
    diaTipo: DiaTipo,
    sacos: number,
): boolean {
    const pool = poolElegible(personas, diaTipo, new Set())
    return pool.length >= sacos * 2
}
