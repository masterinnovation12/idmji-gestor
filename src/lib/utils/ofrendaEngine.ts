/**
 * ofrendaEngine.ts
 * Motor de cálculo para el módulo Labor Ofrenda.
 *
 * Responsabilidades:
 *  1. Generar las fechas (jueves + domingo mañana + domingo tarde) de un mes.
 *  2. Calcular la secuencia de sacos (rango numérico cíclico 01-20).
 *  3. Asignar automáticamente los miembros del Grupo 1 (roles) y Grupo 2
 *     (colaboradores) con rotación cíclica y la regla anti-repetición
 *     entre servicios consecutivos (Jue → Dom M → Dom T → Jue siguiente).
 *
 * Todas las funciones son puras y no dependen de la BD → testeables con Vitest.
 */

import { getISOWeek, getDay, getDaysInMonth } from 'date-fns'

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Número total de sacos en el ciclo. */
export const SACOS_MAX = 20

/** Sacos asignados en un servicio de jueves (por defecto). */
export const SACOS_JUEVES = 4

/** Sacos asignados en un servicio de domingo mañana (por defecto). */
export const SACOS_DOMINGO = 8

/** Sacos asignados en un servicio de domingo tarde (por defecto). */
export const SACOS_DOMINGO_TARDE = 4

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export type DiaTipo = 'jueves' | 'domingo' | 'domingo_tarde'

export type RolGrupo1 =
    | 'realiza'
    | 'apoyo'
    | 'vigilancia'
    | 'primera_vez'
    | 'segunda_tercera_vez'
    | 'imposicion_manos'
export type RolGrupo2 = 'colaborador_1' | 'colaborador_2' | 'colaborador_3'
export type Rol = RolGrupo1 | RolGrupo2

export const ROLES_GRUPO1: RolGrupo1[] = [
    'realiza',
    'apoyo',
    'vigilancia',
    'primera_vez',
    'segunda_tercera_vez',
    'imposicion_manos',
]
export const ROLES_GRUPO2: RolGrupo2[] = ['colaborador_1', 'colaborador_2', 'colaborador_3']

/** Colaboradores G2 por turno (regla fija Labores generales). */
export const COLABORADORES_G2_POR_TURNO: Readonly<Record<DiaTipo, number>> = {
    jueves: 2,
    domingo: 3,
    domingo_tarde: 2,
}

/** Roles G2 que aplican en un turno (p. ej. jueves → solo colaborador_1 y _2). */
export function rolesGrupo2ParaTurno(diaTipo: DiaTipo): readonly RolGrupo2[] {
    const n = COLABORADORES_G2_POR_TURNO[diaTipo]
    return ROLES_GRUPO2.slice(0, n)
}

export function colaboradoresG2Requeridos(diaTipo: DiaTipo): number {
    return COLABORADORES_G2_POR_TURNO[diaTipo]
}

export function rolGrupo2AplicaEnTurno(rol: RolGrupo2, diaTipo: DiaTipo): boolean {
    return rolesGrupo2ParaTurno(diaTipo).includes(rol)
}

/** Estado de anti-repetición G2: mismo turno (jueves↔jueves) + servicio inmediato anterior. */
export interface G2AntiRepeticionState {
    mismoTurno: Set<string>
    inmediato: Set<string>
}

export function crearG2AntiRepeticionVacio(): Record<DiaTipo, Set<string>> {
    return {
        jueves: new Set(),
        domingo: new Set(),
        domingo_tarde: new Set(),
    }
}

/**
 * Predicado G2 por capas (de más estricto a más laxo):
 * 1. No repetir mismo turno anterior ni servicio inmediato ni duplicar hoy.
 * 2. Solo servicio inmediato + hoy.
 * 3. Solo no duplicar hoy.
 */
export function g2CandidatoValido(
    miembroId: string,
    g2Hoy: readonly string[],
    prev: G2AntiRepeticionState,
    capa: 1 | 2 | 3,
): boolean {
    if (g2Hoy.includes(miembroId)) return false
    if (capa >= 3) return true
    if (prev.inmediato.has(miembroId)) return false
    if (capa >= 2) return true
    return !prev.mismoTurno.has(miembroId)
}

/** Roles G1 fijos (puesto fijo por miembro). El resto de G1 se sortea. */
export const ROLES_GRUPO1_FIJABLES: RolGrupo1[] = ['realiza', 'apoyo']

export interface OfrendaMiembro {
    id: string
    nombre: string
    grupo: 1 | 2
    orden: number
    activo: boolean
    puede_jueves: boolean
    puede_domingo_manana: boolean
    puede_domingo_tarde: boolean
    /** Puesto fijo opcional: si ambos están definidos, queda clavado a ese hueco. */
    fijoDiaTipo?: DiaTipo | null
    fijoRol?: RolGrupo1 | null
}

export function miembrosElegiblesParaTurno(
    miembros: OfrendaMiembro[],
    diaTipo: DiaTipo,
): OfrendaMiembro[] {
    return miembros.filter(m => {
        if (diaTipo === 'jueves') return m.puede_jueves
        if (diaTipo === 'domingo') return m.puede_domingo_manana
        return m.puede_domingo_tarde
    })
}

/** Configuración de sacos por tipo de servicio (extraída del plan). */
export interface SacosConfig {
    jueves: number
    domingo: number
    domingoTarde: number
    /** Tamaño del ciclo 1..N (por defecto {@link SACOS_MAX}). */
    secuenciaMax?: number
}

/** Un servicio calculado (antes de persistir). */
export interface ServicioCalculado {
    fecha: string     // 'YYYY-MM-DD'
    diaTipo: DiaTipo
    semanaIso: number
    secuenciaDesde: number
    secuenciaHasta: number
    secuenciaTexto: string
    posicion: number  // índice 0-based en el plan
}

/** Una asignación calculada (antes de persistir). */
export interface AsignacionCalculada {
    servicioFecha: string
    servicioTipo: DiaTipo
    rol: Rol
    miembroId: string
}

/** Resultado completo de generar un plan mensual. */
export interface PlanCalculado {
    servicios: ServicioCalculado[]
    asignaciones: AsignacionCalculada[]
    /** Puntero de saco para el primer servicio del MES SIGUIENTE. */
    punteroFin: number
}

// ─── Utilidades de secuencia ───────────────────────────────────────────────────

/**
 * Devuelve el valor "hasta" del rango dado "desde" y un número de pasos.
 * Los valores son 1-indexed, ciclo de 1 a SACOS_MAX.
 *
 * Ejemplo: desde=17, pasos=8, max=20 → hasta=4  (17→20 + 1→4)
 */
export function calcHasta(desde: number, pasos: number, max = SACOS_MAX): number {
    return ((desde - 1 + pasos - 1) % max) + 1
}

/**
 * Avanza el puntero "desde" en "pasos" posiciones.
 * Devuelve el próximo valor inicial.
 *
 * Ejemplo: desde=17, pasos=8, max=20 → next=5
 */
export function advancePuntero(desde: number, pasos: number, max = SACOS_MAX): number {
    return ((desde - 1 + pasos) % max) + 1
}

/**
 * Genera la cadena de texto para la secuencia de sacos.
 * Ejemplo: desde=9, hasta=12 → "09 al 12"
 * Ejemplo: desde=17, hasta=4 → "17 al 04"
 */
export function formatSecuencia(desde: number, hasta: number): string {
    return `${String(desde).padStart(2, '0')} al ${String(hasta).padStart(2, '0')}`
}

// ─── Generación de fechas del plan ────────────────────────────────────────────

/**
 * Dada una fecha UTC, devuelve el string 'YYYY-MM-DD'.
 */
function toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10)
}

/**
 * Construye una fecha UTC a partir de año, mes (1-based) y día.
 * Usa UTC para evitar problemas de zona horaria en la lógica.
 */
function makeDate(anio: number, mes: number, dia: number): Date {
    return new Date(Date.UTC(anio, mes - 1, dia))
}

/**
 * Devuelve las fechas de todos los jueves de un mes dado.
 */
function juevesDelMes(anio: number, mes: number): Date[] {
    const dias = getDaysInMonth(new Date(anio, mes - 1))
    const jueves: Date[] = []
    for (let d = 1; d <= dias; d++) {
        const fecha = makeDate(anio, mes, d)
        if (getDay(fecha) === 4) jueves.push(fecha) // 4 = Thursday (UTC)
    }
    return jueves
}

/**
 * Genera la lista ordenada de servicios para un mes dado:
 *   jueves → domingo mañana → domingo tarde (3 servicios por semana)
 *
 * Para cada jueves del mes se incluyen siempre los dos cultos del domingo
 * siguiente (3 días después), aunque caigan en el mes siguiente.
 *
 * El domingo tarde usa la MISMA fecha que el domingo mañana, diferenciado
 * únicamente por dia_tipo = 'domingo_tarde'.
 */
export function generarFechasDelPlan(anio: number, mes: number): Array<{ fecha: Date; diaTipo: DiaTipo }> {
    const jueves = juevesDelMes(anio, mes)

    const servicios: Array<{ fecha: Date; diaTipo: DiaTipo }> = []

    for (const juev of jueves) {
        servicios.push({ fecha: juev, diaTipo: 'jueves' })

        const dom = new Date(juev)
        dom.setUTCDate(dom.getUTCDate() + 3)

        servicios.push({ fecha: dom, diaTipo: 'domingo' })
        servicios.push({ fecha: new Date(dom), diaTipo: 'domingo_tarde' })
    }

    // Ordenar cronológicamente (por construcción ya lo están, pero lo garantizamos)
    servicios.sort((a, b) => {
        const timeDiff = a.fecha.getTime() - b.fecha.getTime()
        if (timeDiff !== 0) return timeDiff
        // Mismo día: jueves < domingo < domingo_tarde (no ocurre, pero por robustez)
        const order: Record<DiaTipo, number> = { jueves: 0, domingo: 1, domingo_tarde: 2 }
        return order[a.diaTipo] - order[b.diaTipo]
    })

    return servicios
}

// ─── Helpers de rotación cíclica ──────────────────────────────────────────────

/**
 * Itera sobre los miembros de forma cíclica a partir de un índice inicial.
 * Devuelve el primer candidato que pasa el predicado, o null si ninguno lo pasa.
 */
function findNextCyclical<T>(
    list: T[],
    startIdx: number,
    predicate: (item: T, idx: number) => boolean
): { item: T; nextIdx: number } | null {
    const n = list.length
    if (n === 0) return null
    for (let i = 0; i < n; i++) {
        const idx = (startIdx + i) % n
        if (predicate(list[idx], idx)) {
            return { item: list[idx], nextIdx: (idx + 1) % n }
        }
    }
    return null
}

// ─── Helpers internos de asignación ───────────────────────────────────────────

function asignarGrupo1(
    fecha: string,
    tipo: DiaTipo,
    g1: OfrendaMiembro[],
    getOverride: (rol: RolGrupo1) => string | undefined,
    punteros: Record<RolGrupo1, number>,
    prev: Record<RolGrupo1, string | null>,
    usadosHoy: Set<string>,
    out: AsignacionCalculada[]
): void {
    if (g1.length === 0) return

    for (const rol of ROLES_GRUPO1) {
        const overrideId = getOverride(rol)
        if (overrideId) {
            out.push({ servicioFecha: fecha, servicioTipo: tipo, rol, miembroId: overrideId })
            usadosHoy.add(overrideId)
            continue
        }

        // Intento principal: sin repetir y sin duplicar en el mismo día
        const principal = findNextCyclical(g1, punteros[rol], (m) =>
            m.id !== prev[rol] && !usadosHoy.has(m.id)
        )

        if (principal) {
            punteros[rol] = principal.nextIdx
            usadosHoy.add(principal.item.id)
            prev[rol] = principal.item.id
            out.push({ servicioFecha: fecha, servicioTipo: tipo, rol, miembroId: principal.item.id })
            continue
        }

        // Fallback: relajar restricción de repetición
        const fallback = findNextCyclical(g1, punteros[rol], (m) => !usadosHoy.has(m.id))
        if (fallback) {
            punteros[rol] = fallback.nextIdx
            usadosHoy.add(fallback.item.id)
            prev[rol] = fallback.item.id
            out.push({ servicioFecha: fecha, servicioTipo: tipo, rol, miembroId: fallback.item.id })
        }
    }
}

function asignarGrupo2(
    fecha: string,
    tipo: DiaTipo,
    g2: OfrendaMiembro[],
    getOverride: (rol: RolGrupo2) => string | undefined,
    punteroG2: number,
    prev: G2AntiRepeticionState,
    out: AsignacionCalculada[]
): { punteroG2: number; asignadosHoy: Set<string> } {
    const g2Hoy: string[] = []
    let ptr = punteroG2

    for (const rol of rolesGrupo2ParaTurno(tipo)) {
        const overrideId = getOverride(rol)
        if (overrideId) {
            out.push({ servicioFecha: fecha, servicioTipo: tipo, rol, miembroId: overrideId })
            g2Hoy.push(overrideId)
            continue
        }

        let elegido: { item: OfrendaMiembro; nextIdx: number } | null = null
        for (const capa of [1, 2, 3] as const) {
            elegido = findNextCyclical(g2, ptr, (m) =>
                g2CandidatoValido(m.id, g2Hoy, prev, capa),
            )
            if (elegido) break
        }

        if (elegido) {
            ptr = elegido.nextIdx
            g2Hoy.push(elegido.item.id)
            out.push({ servicioFecha: fecha, servicioTipo: tipo, rol, miembroId: elegido.item.id })
        }
    }

    return { punteroG2: ptr, asignadosHoy: new Set(g2Hoy) }
}

// ─── Generación completa del plan ─────────────────────────────────────────────

/**
 * Genera el plan completo de un mes:
 *  - Fechas y secuencias de sacos.
 *  - Asignaciones automáticas respetando la rotación y anti-repetición.
 *
 * @param anio             Año del plan (ej. 2026)
 * @param mes              Mes del plan 1-12
 * @param punteroInicio    Número de saco desde donde comienza este plan (1-20)
 * @param miembros         Lista completa de miembros activos, ordenados por orden
 * @param overrides        Mapa de asignaciones manuales: "YYYY-MM-DD:tipo:rol" → miembroId
 * @param regenerarGrupo   null = ambos grupos; 1 = solo Grupo 1; 2 = solo Grupo 2
 * @param sacosConfig      Sacos por tipo de servicio (defaults: 4/8/4)
 */
export function generarPlan(
    anio: number,
    mes: number,
    punteroInicio: number,
    miembros: OfrendaMiembro[],
    overrides: Record<string, string> = {},
    regenerarGrupo: 1 | 2 | null = null,
    sacosConfig: Partial<SacosConfig> = {}
): PlanCalculado {
    const config: SacosConfig = {
        jueves:       sacosConfig.jueves       ?? SACOS_JUEVES,
        domingo:      sacosConfig.domingo      ?? SACOS_DOMINGO,
        domingoTarde: sacosConfig.domingoTarde ?? SACOS_DOMINGO_TARDE,
        secuenciaMax: sacosConfig.secuenciaMax,
    }

    const secuenciaMax = config.secuenciaMax ?? SACOS_MAX
    const fechas = generarFechasDelPlan(anio, mes)

    // ── Secuencias de sacos ──────────────────────────────────────────────────
    let puntero = punteroInicio

    const sacosPorTipo: Record<DiaTipo, number> = {
        jueves:        config.jueves,
        domingo:       config.domingo,
        domingo_tarde: config.domingoTarde,
    }

    const servicios: ServicioCalculado[] = fechas.map(({ fecha, diaTipo }, idx) => {
        const sacos = sacosPorTipo[diaTipo]
        const desde = puntero
        const hasta = calcHasta(desde, sacos, secuenciaMax)
        const texto = formatSecuencia(desde, hasta)
        puntero = advancePuntero(desde, sacos, secuenciaMax)
        return {
            fecha: toDateStr(fecha),
            diaTipo,
            semanaIso: getISOWeek(fecha),
            secuenciaDesde: desde,
            secuenciaHasta: hasta,
            secuenciaTexto: texto,
            posicion: idx,
        }
    })

    const punteroFin = puntero

    // ── Asignaciones ──────────────────────────────────────────────────────────
    const participa = (m: OfrendaMiembro) =>
        m.activo &&
        (m.puede_jueves || m.puede_domingo_manana || m.puede_domingo_tarde)

    const g1 = miembros.filter(m => m.grupo === 1 && participa(m)).sort((a, b) => a.orden - b.orden)
    const g2 = miembros.filter(m => m.grupo === 2 && participa(m)).sort((a, b) => a.orden - b.orden)

    // Puestos fijos (coordinador/apoyo siempre la misma persona ese día_tipo).
    // Clave `${diaTipo}:${rol}` → miembroId. Tienen precedencia sobre los overrides.
    const fijos: Record<string, string> = {}
    for (const m of miembros) {
        if (m.activo && m.fijoDiaTipo && m.fijoRol) {
            fijos[`${m.fijoDiaTipo}:${m.fijoRol}`] = m.id
        }
    }

    const asignaciones: AsignacionCalculada[] = []

    // Punteros de rotación independientes por rol G1 (uno por cada rol existente)
    const punterosG1 = Object.fromEntries(ROLES_GRUPO1.map(r => [r, 0])) as Record<RolGrupo1, number>
    // Quién hizo cada rol G1 en el servicio anterior (Jue → Dom M → Dom T → Jue)
    const prevG1 = Object.fromEntries(ROLES_GRUPO1.map(r => [r, null])) as Record<RolGrupo1, string | null>

    // Puntero de rotación G2 (todos comparten uno)
    let punteroG2 = 0
    const prevG2MismoTurno = crearG2AntiRepeticionVacio()
    let prevG2Inmediato: Set<string> = new Set()

    for (const srv of servicios) {
        // La clave del override incluye fecha + tipo para distinguir Dom M vs Dom T
        const key = (rol: Rol) => `${srv.fecha}:${srv.diaTipo}:${rol}`
        // El jueves y los dos domingos son servicios independientes para la anti-repetición;
        // pero los dos domingos del mismo día NO comparten usadosHoy entre sí para G1
        // (pueden repetir personas distintas si hay pocos miembros)
        const usadosHoy = new Set<string>()

        // ── Grupo 1 ────────────────────────────────────────────────────────
        // Los puestos fijos ganan al override manual y a la rotación aleatoria.
        const getG1Override = (rol: RolGrupo1) => fijos[`${srv.diaTipo}:${rol}`] ?? overrides[key(rol)]
        if (regenerarGrupo !== 2) {
            const g1Turno = miembrosElegiblesParaTurno(g1, srv.diaTipo)
            asignarGrupo1(srv.fecha, srv.diaTipo, g1Turno, getG1Override, punterosG1, prevG1, usadosHoy, asignaciones)
        }

        // ── Grupo 2 ────────────────────────────────────────────────────────
        if (regenerarGrupo !== 1 && g2.length > 0) {
            const g2Turno = miembrosElegiblesParaTurno(g2, srv.diaTipo)
            const result = asignarGrupo2(
                srv.fecha,
                srv.diaTipo,
                g2Turno,
                rol => overrides[key(rol)],
                punteroG2,
                {
                    mismoTurno: prevG2MismoTurno[srv.diaTipo],
                    inmediato: prevG2Inmediato,
                },
                asignaciones,
            )
            punteroG2 = result.punteroG2
            prevG2MismoTurno[srv.diaTipo] = result.asignadosHoy
            prevG2Inmediato = result.asignadosHoy
        }
    }

    return { servicios, asignaciones, punteroFin }
}

// ─── Helper: puntero de inicio para un mes dado ────────────────────────────────

/**
 * Calcula el puntero de inicio para un mes a partir del puntero de un plan
 * existente del mes anterior.
 */
export function calcPunteroSiguienteMes(
    punteroInicio: number,
    anio: number,
    mes: number,
    sacosConfig?: Partial<SacosConfig>
): number {
    const { punteroFin } = generarPlan(anio, mes, punteroInicio, [], {}, null, sacosConfig)
    return punteroFin
}

// ─── Helpers: mes anterior / siguiente ────────────────────────────────────────
export function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
    if (mes === 1) return { anio: anio - 1, mes: 12 }
    return { anio, mes: mes - 1 }
}

export function mesSiguiente(anio: number, mes: number): { anio: number; mes: number } {
    if (mes === 12) return { anio: anio + 1, mes: 1 }
    return { anio, mes: mes + 1 }
}
