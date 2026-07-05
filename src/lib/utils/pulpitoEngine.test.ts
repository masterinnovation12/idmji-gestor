import { describe, it, expect } from 'vitest'
import {
    generarAsignacionesPulpito,
    validarDisponibilidadPulpito,
    rolesDelCulto,
    cargaHistoricaVacia,
    type CultoParaAsignar,
    type HermanoPulpito,
} from './pulpitoEngine'
import type { PulpitoRol } from './pulpitoAvailability'

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// Semana tipo (julio 2026): lun 6 estudio, mar 7 alabanza, mié 8 alabanza,
// jue 9 alabanza, vie 10 alabanza, sáb 11 estudio, dom 12 enseñanza.

const ESTUDIO: PulpitoRol[] = ['introduccion', 'finalizacion']
const ALABANZA: PulpitoRol[] = ['introduccion', 'finalizacion']
const ENSENANZA: PulpitoRol[] = ['introduccion', 'ensenanza', 'testimonios']

function culto(id: string, fecha: string, roles: PulpitoRol[]): CultoParaAsignar {
    return { id, fecha, horaInicio: '19:00', roles, asignacionesActuales: {} }
}

function semanaCompleta(): CultoParaAsignar[] {
    return [
        culto('c-lun', '2026-07-06', ESTUDIO),
        culto('c-mar', '2026-07-07', ALABANZA),
        culto('c-mie', '2026-07-08', ALABANZA),
        culto('c-jue', '2026-07-09', ALABANZA),
        culto('c-vie', '2026-07-10', ALABANZA),
        culto('c-sab', '2026-07-11', ESTUDIO),
        culto('c-dom', '2026-07-12', ENSENANZA),
    ]
}

/** Hermano disponible todos los días para todos los roles (sin restricciones). */
function hermanoLibre(id: string, nombre: string): HermanoPulpito {
    return { id, nombre, availability: null }
}

/** Hermano con patrón semanal concreto: días → roles marcados. */
function hermanoConPatron(
    id: string,
    nombre: string,
    patron: Record<string, { intro?: boolean; finalization?: boolean; teaching?: boolean; testimonies?: boolean }>,
): HermanoPulpito {
    return { id, nombre, availability: { template: patron } }
}

const TODOS_LOS_DIAS_INTRO_FIN = Object.fromEntries(
    ['0', '1', '2', '3', '4', '5', '6'].map(d => [d, { intro: true, finalization: true }]),
)

// ─── Generar semana ────────────────────────────────────────────────────────────

describe('generarAsignacionesPulpito — semana', () => {
    it('rellena todos los roles de la semana cuando hay hermanos libres', () => {
        const hermanos = ['A', 'B', 'C', 'D'].map(n => hermanoLibre(`h${n}`, `Hermano ${n}`))
        const { asignaciones, problemas } = generarAsignacionesPulpito(semanaCompleta(), hermanos)

        expect(problemas).toHaveLength(0)
        // 6 cultos × 2 roles + 1 culto × 3 roles = 15 asignaciones
        expect(asignaciones).toHaveLength(15)
        expect(asignaciones.every(a => a.hermanoId !== null)).toBe(true)
    })

    it('si solo hay un hermano disponible, hace los dos roles antes que dejar hueco', () => {
        const unico = hermanoLibre('h-unico', 'Único')
        const { asignaciones, problemas } = generarAsignacionesPulpito(
            [culto('c-lun', '2026-07-06', ESTUDIO)],
            [unico],
        )
        expect(problemas).toHaveLength(0)
        expect(asignaciones).toHaveLength(2)
        expect(asignaciones.every(a => a.hermanoId === 'h-unico')).toBe(true)
    })

    it('nunca asigna al mismo hermano dos roles en el mismo culto (si hay alternativa)', () => {
        const hermanos = ['A', 'B', 'C'].map(n => hermanoLibre(`h${n}`, `Hermano ${n}`))
        const { asignaciones } = generarAsignacionesPulpito(semanaCompleta(), hermanos)

        const porCulto = new Map<string, string[]>()
        for (const a of asignaciones) {
            porCulto.set(a.cultoId, [...(porCulto.get(a.cultoId) ?? []), a.hermanoId!])
        }
        for (const [, ids] of porCulto) {
            expect(new Set(ids).size).toBe(ids.length)
        }
    })

    it('respeta la disponibilidad: quien solo puede finalización nunca hace intro', () => {
        const soloFin = hermanoConPatron('h-fin', 'Solo Fin', {
            '1': { finalization: true }, '2': { finalization: true }, '3': { finalization: true },
            '4': { finalization: true }, '5': { finalization: true }, '6': { finalization: true },
            '0': { finalization: true },
        })
        const libres = ['A', 'B'].map(n => hermanoLibre(`h${n}`, `Hermano ${n}`))
        const { asignaciones } = generarAsignacionesPulpito(semanaCompleta(), [soloFin, ...libres])

        const deSoloFin = asignaciones.filter(a => a.hermanoId === 'h-fin')
        expect(deSoloFin.length).toBeGreaterThan(0)
        expect(deSoloFin.every(a => a.rol === 'finalizacion')).toBe(true)
    })

    it('respeta una excepción de fecha (ese día no puede)', () => {
        const conExcepcion: HermanoPulpito = {
            id: 'h-exc',
            nombre: 'Con Excepción',
            availability: {
                template: TODOS_LOS_DIAS_INTRO_FIN,
                exceptions: { '2026-07-06': {} }, // el lunes no puede nada
            },
        }
        const otro = hermanoLibre('h-otro', 'Otro')
        const { asignaciones } = generarAsignacionesPulpito(
            [culto('c-lun', '2026-07-06', ESTUDIO)],
            [conExcepcion, otro],
        )
        expect(asignaciones.every(a => a.hermanoId === 'h-otro')).toBe(true)
    })

    it('reporta problema cuando nadie puede un rol y lo deja vacío', () => {
        const soloIntro = hermanoConPatron('h-intro', 'Solo Intro', {
            '1': { intro: true },
        })
        const { asignaciones, problemas } = generarAsignacionesPulpito(
            [culto('c-lun', '2026-07-06', ESTUDIO)],
            [soloIntro],
        )
        expect(problemas).toEqual([{ fecha: '2026-07-06', rol: 'finalizacion' }])
        const fin = asignaciones.find(a => a.rol === 'finalizacion')
        expect(fin?.hermanoId).toBeNull()
        const intro = asignaciones.find(a => a.rol === 'introduccion')
        expect(intro?.hermanoId).toBe('h-intro')
    })

    it('evita repetir hermanos del culto inmediatamente anterior si hay alternativa', () => {
        const hermanos = ['A', 'B', 'C', 'D', 'E', 'F'].map(n => hermanoLibre(`h${n}`, `H ${n}`))
        const { asignaciones } = generarAsignacionesPulpito(semanaCompleta(), hermanos)

        const cultosOrden = ['c-lun', 'c-mar', 'c-mie', 'c-jue', 'c-vie', 'c-sab', 'c-dom']
        for (let i = 1; i < cultosOrden.length; i++) {
            const prev = new Set(
                asignaciones.filter(a => a.cultoId === cultosOrden[i - 1]).map(a => a.hermanoId),
            )
            const hoy = asignaciones.filter(a => a.cultoId === cultosOrden[i]).map(a => a.hermanoId)
            // Con 6 hermanos y 2-3 roles por culto siempre hay alternativa
            for (const id of hoy) expect(prev.has(id)).toBe(false)
        }
    })
})

// ─── Generar mes ───────────────────────────────────────────────────────────────

describe('generarAsignacionesPulpito — mes', () => {
    /** 4 semanas completas de julio 2026 (lunes 6 a domingo 2 de agosto). */
    function mesCompleto(): CultoParaAsignar[] {
        const cultos: CultoParaAsignar[] = []
        const inicio = new Date('2026-07-06T00:00:00')
        for (let semana = 0; semana < 4; semana++) {
            for (let dia = 0; dia < 7; dia++) {
                const d = new Date(inicio)
                d.setDate(d.getDate() + semana * 7 + dia)
                const fecha = d.toISOString().slice(0, 10)
                const dow = d.getDay()
                let roles: PulpitoRol[]
                if (dow === 0) roles = ENSENANZA
                else if (dow === 1 || dow === 6) roles = ESTUDIO
                else roles = ALABANZA
                cultos.push(culto(`c-${fecha}`, fecha, roles))
            }
        }
        return cultos
    }

    it('asigna el mes completo sin huecos y con reparto equilibrado', () => {
        const hermanos = ['A', 'B', 'C', 'D', 'E', 'F'].map(n => hermanoLibre(`h${n}`, `H ${n}`))
        const { asignaciones, problemas } = generarAsignacionesPulpito(mesCompleto(), hermanos)

        expect(problemas).toHaveLength(0)
        // 28 cultos: 4 domingos × 3 roles + 24 resto × 2 roles = 12 + 48 = 60
        expect(asignaciones).toHaveLength(60)

        const conteo = new Map<string, number>()
        for (const a of asignaciones) {
            conteo.set(a.hermanoId!, (conteo.get(a.hermanoId!) ?? 0) + 1)
        }
        const valores = [...conteo.values()]
        // Reparto justo: diferencia máxima de 1-2 asignaciones entre hermanos
        expect(Math.max(...valores) - Math.min(...valores)).toBeLessThanOrEqual(2)
        expect(conteo.size).toBe(6)
    })

    it('la carga histórica influye: el hermano ya cargado recibe menos', () => {
        const hermanos = ['A', 'B', 'C', 'D'].map(n => hermanoLibre(`h${n}`, `H ${n}`))
        const historial = {
            total: { hA: 10 },
            porRol: { hA: { introduccion: 5, finalizacion: 5 } },
        }
        const { asignaciones } = generarAsignacionesPulpito(semanaCompleta(), hermanos, historial)

        const conteo = new Map<string, number>()
        for (const a of asignaciones) {
            conteo.set(a.hermanoId!, (conteo.get(a.hermanoId!) ?? 0) + 1)
        }
        const cargaA = conteo.get('hA') ?? 0
        for (const otro of ['hB', 'hC', 'hD']) {
            expect(cargaA).toBeLessThanOrEqual(conteo.get(otro) ?? 0)
        }
    })
})

// ─── Modo solo_huecos ─────────────────────────────────────────────────────────

describe('generarAsignacionesPulpito — solo_huecos', () => {
    it('conserva las asignaciones manuales existentes y rellena el resto', () => {
        const cultos = [
            {
                ...culto('c-lun', '2026-07-06', ESTUDIO),
                asignacionesActuales: { introduccion: 'hB' } as Partial<Record<PulpitoRol, string | null>>,
            },
            culto('c-mar', '2026-07-07', ALABANZA),
        ]
        const hermanos = ['A', 'B', 'C'].map(n => hermanoLibre(`h${n}`, `H ${n}`))
        const { asignaciones } = generarAsignacionesPulpito(cultos, hermanos, cargaHistoricaVacia(), 'solo_huecos')

        const intro = asignaciones.find(a => a.cultoId === 'c-lun' && a.rol === 'introduccion')
        expect(intro?.hermanoId).toBe('hB')
        // El resto de roles quedan rellenos
        expect(asignaciones.every(a => a.hermanoId !== null)).toBe(true)
        // hB no repite en el mismo culto
        const finLun = asignaciones.find(a => a.cultoId === 'c-lun' && a.rol === 'finalizacion')
        expect(finLun?.hermanoId).not.toBe('hB')
    })

    it("en modo 'todo' ignora las asignaciones previas", () => {
        const soloA = [hermanoLibre('hA', 'H A'), hermanoLibre('hB', 'H B')]
        const cultos = [{
            ...culto('c-lun', '2026-07-06', ESTUDIO),
            asignacionesActuales: { introduccion: 'h-desconocido' } as Partial<Record<PulpitoRol, string | null>>,
        }]
        const { asignaciones } = generarAsignacionesPulpito(cultos, soloA, cargaHistoricaVacia(), 'todo')
        const intro = asignaciones.find(a => a.rol === 'introduccion')
        expect(['hA', 'hB']).toContain(intro?.hermanoId)
    })
})

// ─── Validación previa ─────────────────────────────────────────────────────────

describe('validarDisponibilidadPulpito', () => {
    it('detecta roles sin ningún candidato antes de generar', () => {
        const soloLunes = hermanoConPatron('h1', 'Solo Lunes', { '1': { intro: true, finalization: true } })
        const problemas = validarDisponibilidadPulpito(
            [culto('c-lun', '2026-07-06', ESTUDIO), culto('c-mar', '2026-07-07', ALABANZA)],
            [soloLunes],
        )
        expect(problemas).toEqual([
            { fecha: '2026-07-07', rol: 'introduccion' },
            { fecha: '2026-07-07', rol: 'finalizacion' },
        ])
    })

    it('sin problemas cuando todos los roles tienen candidato', () => {
        const libre = hermanoLibre('h1', 'Libre')
        expect(validarDisponibilidadPulpito(semanaCompleta(), [libre])).toHaveLength(0)
    })
})

// ─── rolesDelCulto ─────────────────────────────────────────────────────────────

describe('rolesDelCulto', () => {
    it('estudio bíblico y alabanza: intro + finalización', () => {
        expect(rolesDelCulto({
            tiene_lectura_introduccion: true,
            tiene_lectura_finalizacion: true,
            tiene_ensenanza: false,
            tiene_testimonios: false,
        })).toEqual(['introduccion', 'finalizacion'])
    })

    it('enseñanza: intro + enseñanza + testimonios (sin finalización)', () => {
        expect(rolesDelCulto({
            tiene_lectura_introduccion: true,
            tiene_lectura_finalizacion: false,
            tiene_ensenanza: true,
            tiene_testimonios: true,
        })).toEqual(['introduccion', 'ensenanza', 'testimonios'])
    })

    it('enseñanza en modo vídeo: no se asigna hermano de enseñanza', () => {
        expect(rolesDelCulto({
            tiene_lectura_introduccion: true,
            tiene_lectura_finalizacion: false,
            tiene_ensenanza: true,
            tiene_testimonios: true,
        }, true)).toEqual(['introduccion', 'testimonios'])
    })

    it('sin flags → sin roles', () => {
        expect(rolesDelCulto(null)).toEqual([])
        expect(rolesDelCulto({})).toEqual([])
    })
})
