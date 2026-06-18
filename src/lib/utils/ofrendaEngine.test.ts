/**
 * ofrendaEngine.test.ts
 * Tests unitarios para el motor de Labor Ofrenda.
 * Cubre: secuencias de sacos, generación de fechas (3 servicios/semana),
 *        rotación de Grupo 1 y 2, regla anti-repetición extendida
 *        (Jue → Dom M → Dom T → Jue siguiente), sacos configurables,
 *        overrides manuales y edge cases.
 */

import { describe, it, expect } from 'vitest'
import {
    calcHasta,
    advancePuntero,
    formatSecuencia,
    generarFechasDelPlan,
    generarPlan,
    calcPunteroSiguienteMes,
    mesAnterior,
    mesSiguiente,
    SACOS_MAX,
    SACOS_JUEVES,
    SACOS_DOMINGO,
    SACOS_DOMINGO_TARDE,
    type OfrendaMiembro,
    type DiaTipo,
} from './ofrendaEngine'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeMiembros(
    n: number,
    grupo: 1 | 2,
    overrides?: Partial<Pick<OfrendaMiembro, 'puede_jueves' | 'puede_domingo_manana' | 'puede_domingo_tarde'>>,
): OfrendaMiembro[] {
    return Array.from({ length: n }, (_, i) => ({
        id: `m${grupo}-${i + 1}`,
        nombre: `Persona${grupo}-${i + 1}`,
        grupo,
        orden: i,
        activo: true,
        puede_jueves: overrides?.puede_jueves ?? true,
        puede_domingo_manana: overrides?.puede_domingo_manana ?? true,
        puede_domingo_tarde: overrides?.puede_domingo_tarde ?? true,
    }))
}

const g1 = makeMiembros(6, 1)
const g2 = makeMiembros(6, 2)
const allMiembros = [...g1, ...g2]

// ─── calcHasta ────────────────────────────────────────────────────────────────

describe('calcHasta', () => {
    it('calcula sin wrap-around', () => {
        expect(calcHasta(1, 4)).toBe(4)
        expect(calcHasta(5, 8)).toBe(12)
        expect(calcHasta(9, 4)).toBe(12)
    })
    it('calcula con wrap-around', () => {
        expect(calcHasta(17, 8)).toBe(4)
        expect(calcHasta(17, 4)).toBe(20)
        expect(calcHasta(18, 4)).toBe(1)  // 18→20 + 1 = hasta=1
        expect(calcHasta(20, 1)).toBe(20)
    })
    it('exactamente en el límite 20', () => {
        expect(calcHasta(13, 8)).toBe(20)
    })
})

// ─── advancePuntero ───────────────────────────────────────────────────────────

describe('advancePuntero', () => {
    it('avanza sin wrap-around', () => {
        expect(advancePuntero(1, 4)).toBe(5)
        expect(advancePuntero(5, 8)).toBe(13)
    })
    it('avanza con wrap-around', () => {
        expect(advancePuntero(17, 8)).toBe(5)   // 17+8=25 → mod20 → 5
        expect(advancePuntero(17, 4)).toBe(1)   // 17+4=21 → mod20 → 1
        expect(advancePuntero(20, 4)).toBe(4)
    })
    it('el ciclo completo de 20 vuelve al inicio', () => {
        expect(advancePuntero(1, 20)).toBe(1)
        expect(advancePuntero(5, 20)).toBe(5)
    })
})

// ─── formatSecuencia ─────────────────────────────────────────────────────────

describe('formatSecuencia', () => {
    it('formatea sin wrap', () => {
        expect(formatSecuencia(9, 12)).toBe('09 al 12')
        expect(formatSecuencia(1, 4)).toBe('01 al 04')
    })
    it('formatea con wrap', () => {
        expect(formatSecuencia(17, 4)).toBe('17 al 04')
        expect(formatSecuencia(18, 1)).toBe('18 al 01')
    })
})

// ─── Constantes ───────────────────────────────────────────────────────────────

describe('constantes', () => {
    it('SACOS_MAX es 20', () => expect(SACOS_MAX).toBe(20))
    it('SACOS_JUEVES es 4', () => expect(SACOS_JUEVES).toBe(4))
    it('SACOS_DOMINGO es 8', () => expect(SACOS_DOMINGO).toBe(8))
    it('SACOS_DOMINGO_TARDE es 4', () => expect(SACOS_DOMINGO_TARDE).toBe(4))
})

// ─── generarFechasDelPlan ─────────────────────────────────────────────────────

describe('generarFechasDelPlan', () => {
    it('mayo 2026 tiene 4 jueves → 12 servicios (4×3)', () => {
        const fechas = generarFechasDelPlan(2026, 5)
        expect(fechas).toHaveLength(12)
    })

    it('el orden siempre es jueves→domingo→domingo_tarde por semana', () => {
        const fechas = generarFechasDelPlan(2026, 5)
        for (let i = 0; i < fechas.length; i += 3) {
            expect(fechas[i].diaTipo).toBe('jueves')
            expect(fechas[i + 1].diaTipo).toBe('domingo')
            expect(fechas[i + 2].diaTipo).toBe('domingo_tarde')
        }
    })

    it('el domingo y el domingo_tarde tienen la misma fecha', () => {
        const fechas = generarFechasDelPlan(2026, 5)
        for (let i = 0; i < fechas.length; i += 3) {
            const domM = fechas[i + 1]
            const domT = fechas[i + 2]
            expect(domM.fecha.toISOString().slice(0, 10))
                .toBe(domT.fecha.toISOString().slice(0, 10))
        }
    })

    it('el domingo está exactamente 3 días después del jueves', () => {
        const fechas = generarFechasDelPlan(2026, 5)
        for (let i = 0; i < fechas.length; i += 3) {
            const jue = fechas[i].fecha.getTime()
            const dom = fechas[i + 1].fecha.getTime()
            expect((dom - jue) / 86_400_000).toBe(3)
        }
    })

    it('primer jueves de mayo 2026 es el 7', () => {
        const fechas = generarFechasDelPlan(2026, 5)
        expect(fechas[0].fecha.toISOString().slice(0, 10)).toBe('2026-05-07')
    })

    it('abril 2026 tiene 5 jueves → 15 servicios', () => {
        // Abril 2026: jueves en 2,9,16,23,30 → 5 semanas
        const fechas = generarFechasDelPlan(2026, 4)
        expect(fechas).toHaveLength(15)
    })

    it('el último jueves de abril 2026 es el 30 y su domingo es el 3 de mayo', () => {
        const fechas = generarFechasDelPlan(2026, 4)
        const ultJue = fechas[12] // índice 12 = semana 5, jueves (5×3 - 3 = 12)
        const ultDom = fechas[13] // índice 13 = semana 5, domingo
        expect(ultJue.fecha.toISOString().slice(0, 10)).toBe('2026-04-30')
        expect(ultDom.fecha.toISOString().slice(0, 10)).toBe('2026-05-03')
    })

    it('febrero de año bisiesto (2028) genera servicios correctamente', () => {
        const fechas = generarFechasDelPlan(2028, 2)
        // Febrero 2028 tiene 29 días; jueves caen en 3,10,17,24 → 4 jueves → 12 servicios
        expect(fechas).toHaveLength(12)
        for (let i = 0; i < fechas.length; i += 3) {
            expect(fechas[i].diaTipo).toBe('jueves')
        }
    })

    it('mes con 5 jueves genera 15 servicios', () => {
        // Octubre 2026: jueves en 1,8,15,22,29 → 5 jueves
        const fechas = generarFechasDelPlan(2026, 10)
        expect(fechas).toHaveLength(15)
    })
})

// ─── generarPlan — secuencias ─────────────────────────────────────────────────

describe('generarPlan — secuencias de sacos', () => {
    it('primera semana con puntero=1: Jue(01-04), DomM(05-12), DomT(13-16)', () => {
        const { servicios } = generarPlan(2026, 5, 1, allMiembros)
        expect(servicios[0].secuenciaTexto).toBe('01 al 04')
        expect(servicios[1].secuenciaTexto).toBe('05 al 12')
        expect(servicios[2].secuenciaTexto).toBe('13 al 16')
    })

    it('segunda semana continúa desde puntero 17', () => {
        const { servicios } = generarPlan(2026, 5, 1, allMiembros)
        expect(servicios[3].secuenciaTexto).toBe('17 al 20')  // Jue2
        expect(servicios[4].secuenciaTexto).toBe('01 al 08')  // DomM2 (wrap)
        expect(servicios[5].secuenciaTexto).toBe('09 al 12')  // DomT2
    })

    it('tercera semana continúa correctamente', () => {
        const { servicios } = generarPlan(2026, 5, 1, allMiembros)
        expect(servicios[6].secuenciaTexto).toBe('13 al 16')  // Jue3
        expect(servicios[7].secuenciaTexto).toBe('17 al 04')  // DomM3 (wrap)
        expect(servicios[8].secuenciaTexto).toBe('05 al 08')  // DomT3
    })

    it('cuarta semana cierra el ciclo', () => {
        const { servicios } = generarPlan(2026, 5, 1, allMiembros)
        expect(servicios[9].secuenciaTexto).toBe('09 al 12')   // Jue4
        expect(servicios[10].secuenciaTexto).toBe('13 al 20')  // DomM4
        expect(servicios[11].secuenciaTexto).toBe('01 al 04')  // DomT4 (wrap)
    })

    it('punteroFin es correcto: 1 + 4×(4+8+4) = 1 + 64 → mod20 → posición 5', () => {
        const { punteroFin } = generarPlan(2026, 5, 1, allMiembros)
        // 4 semanas × 16 sacos = 64; (1+64-1)%20+1 = 65%20+1 = 5+1 = 6
        // puntero empieza en 1, 4×16=64 avances → (1-1+64)%20+1 = 64%20+1 = 4+1 = 5
        expect(punteroFin).toBe(5)
    })

    it('domingo_tarde siempre tiene la misma fecha que domingo', () => {
        const { servicios } = generarPlan(2026, 5, 1, allMiembros)
        for (let i = 0; i < servicios.length; i += 3) {
            expect(servicios[i + 1].fecha).toBe(servicios[i + 2].fecha)
        }
    })
})

// ─── generarPlan — sacos configurables ───────────────────────────────────────

describe('generarPlan — sacos configurables', () => {
    it('config personalizada cambia las secuencias correctamente', () => {
        const { servicios } = generarPlan(2026, 5, 1, allMiembros, {}, null, {
            jueves: 5,
            domingo: 6,
            domingoTarde: 3,
        })
        // Jue: 01 al 05 (5 sacos)
        expect(servicios[0].secuenciaTexto).toBe('01 al 05')
        // DomM: 06 al 11 (6 sacos)
        expect(servicios[1].secuenciaTexto).toBe('06 al 11')
        // DomT: 12 al 14 (3 sacos)
        expect(servicios[2].secuenciaTexto).toBe('12 al 14')
    })

    it('calcPunteroSiguienteMes respeta sacosConfig', () => {
        const p1 = calcPunteroSiguienteMes(1, 2026, 5) // default 4+8+4=16/sem × 4sem = 64
        const p2 = calcPunteroSiguienteMes(1, 2026, 5, { jueves: 4, domingo: 8, domingoTarde: 8 })
        // Con domingoTarde=8: 4+8+8=20/sem × 4sem = 80 → mod20 = 0 → puntero = 1
        expect(p1).toBe(5)
        expect(p2).toBe(1) // ciclo perfecto
    })
})

// ─── generarPlan — asignaciones Grupo 1 ──────────────────────────────────────

describe('generarPlan — Grupo 1 anti-repetición', () => {
    it('nadie hace el mismo rol en dos servicios consecutivos (Jue→DomM→DomT)', () => {
        const { servicios, asignaciones } = generarPlan(2026, 5, 1, allMiembros)

        for (let i = 1; i < servicios.length; i++) {
            const prev = servicios[i - 1]
            const curr = servicios[i]
            for (const rol of ['realiza', 'apoyo', 'vigilancia']) {
                const asPrev = asignaciones.find(a =>
                    a.servicioFecha === prev.fecha && a.servicioTipo === prev.diaTipo && a.rol === rol
                )
                const asCurr = asignaciones.find(a =>
                    a.servicioFecha === curr.fecha && a.servicioTipo === curr.diaTipo && a.rol === rol
                )
                if (asPrev && asCurr) {
                    expect(asPrev.miembroId).not.toBe(asCurr.miembroId)
                }
            }
        }
    })

    it('nadie tiene dos roles distintos el mismo día+tipo', () => {
        const { servicios, asignaciones } = generarPlan(2026, 5, 1, allMiembros)
        for (const srv of servicios) {
            const asigsSrv = asignaciones.filter(
                a => a.servicioFecha === srv.fecha && a.servicioTipo === srv.diaTipo
            )
            const ids = asigsSrv.map(a => a.miembroId)
            // Si hay 6 miembros G1, los 3 roles deben tener IDs distintos
            if (g1.length >= 3) {
                const g1Asigs = asigsSrv.filter(a =>
                    ['realiza', 'apoyo', 'vigilancia'].includes(a.rol)
                )
                const uniqueIds = new Set(g1Asigs.map(a => a.miembroId))
                expect(uniqueIds.size).toBe(g1Asigs.length)
            }
            void ids
        }
    })

    it('con solo Grupo 1 (regenerarGrupo=2), solo hay asignaciones G1', () => {
        const { asignaciones } = generarPlan(2026, 5, 1, allMiembros, {}, 2)
        for (const a of asignaciones) {
            expect(['realiza', 'apoyo', 'vigilancia']).not.toContain(a.rol)
        }
    })
})

// ─── generarPlan — asignaciones Grupo 2 ──────────────────────────────────────

describe('generarPlan — Grupo 2 anti-repetición', () => {
    it('los 3 colaboradores son distintos en cada servicio', () => {
        const { servicios, asignaciones } = generarPlan(2026, 5, 1, allMiembros)
        for (const srv of servicios) {
            const cols = asignaciones
                .filter(a => a.servicioFecha === srv.fecha && a.servicioTipo === srv.diaTipo
                    && a.rol.startsWith('colaborador'))
                .map(a => a.miembroId)
            expect(new Set(cols).size).toBe(cols.length)
        }
    })

    it('nadie repite de un servicio al siguiente en G2 (Jue→DomM→DomT→Jue)', () => {
        const { servicios, asignaciones } = generarPlan(2026, 5, 1, allMiembros)
        for (let i = 1; i < servicios.length; i++) {
            const prev = servicios[i - 1]
            const curr = servicios[i]
            const idsPrev = new Set(
                asignaciones
                    .filter(a => a.servicioFecha === prev.fecha && a.servicioTipo === prev.diaTipo
                        && a.rol.startsWith('colaborador'))
                    .map(a => a.miembroId)
            )
            const idsCurr = asignaciones
                .filter(a => a.servicioFecha === curr.fecha && a.servicioTipo === curr.diaTipo
                    && a.rol.startsWith('colaborador'))
                .map(a => a.miembroId)
            for (const id of idsCurr) {
                expect(idsPrev.has(id)).toBe(false)
            }
        }
    })
})

// ─── generarPlan — overrides ──────────────────────────────────────────────────

describe('generarPlan — overrides manuales', () => {
    it('un override se respeta y no se sobreescribe', () => {
        const overrides: Record<string, string> = {
            '2026-05-07:jueves:realiza': 'm1-3',
        }
        const { asignaciones } = generarPlan(2026, 5, 1, allMiembros, overrides)
        const a = asignaciones.find(
            x => x.servicioFecha === '2026-05-07' && x.servicioTipo === 'jueves' && x.rol === 'realiza'
        )
        expect(a?.miembroId).toBe('m1-3')
    })

    it('override en domingo_tarde se respeta independientemente del domingo', () => {
        const overrides: Record<string, string> = {
            '2026-05-10:domingo_tarde:realiza': 'm1-5',
        }
        const { asignaciones } = generarPlan(2026, 5, 1, allMiembros, overrides)
        const a = asignaciones.find(
            x => x.servicioFecha === '2026-05-10' && x.servicioTipo === 'domingo_tarde' && x.rol === 'realiza'
        )
        expect(a?.miembroId).toBe('m1-5')
    })

    it('regenerarGrupo=1 preserva asignaciones G2 (solo rota G1)', () => {
        const { asignaciones: aOrig } = generarPlan(2026, 5, 1, allMiembros)
        const { asignaciones: aRegen } = generarPlan(2026, 5, 1, allMiembros, {}, 1)
        // Con regenerarGrupo=1 solo hay asignaciones de G1 (no G2)
        const g2Orig = aOrig.filter(a => a.rol.startsWith('colaborador'))
        const g2Regen = aRegen.filter(a => a.rol.startsWith('colaborador'))
        expect(g2Regen).toHaveLength(0)
        expect(g2Orig.length).toBeGreaterThan(0)
    })
})

// ─── generarPlan — tipos de día ───────────────────────────────────────────────

describe('generarPlan — tipos de día', () => {
    it('cada servicio tiene un diaTipo válido', () => {
        const { servicios } = generarPlan(2026, 5, 1, allMiembros)
        const tipos: DiaTipo[] = ['jueves', 'domingo', 'domingo_tarde']
        for (const s of servicios) {
            expect(tipos).toContain(s.diaTipo)
        }
    })

    it('los servicios de tipo domingo y domingo_tarde tienen la misma semanaIso', () => {
        const { servicios } = generarPlan(2026, 5, 1, allMiembros)
        for (let i = 0; i < servicios.length; i += 3) {
            expect(servicios[i + 1].semanaIso).toBe(servicios[i + 2].semanaIso)
        }
    })
})

// ─── calcPunteroSiguienteMes ──────────────────────────────────────────────────

describe('calcPunteroSiguienteMes', () => {
    it('mayo 2026 con puntero 1 devuelve 5 (4×16=64 sacos)', () => {
        expect(calcPunteroSiguienteMes(1, 2026, 5)).toBe(5)
    })

    it('encadenando mayo→junio→julio, el puntero avanza consistentemente', () => {
        const pJun = calcPunteroSiguienteMes(1, 2026, 5)
        const pJul = calcPunteroSiguienteMes(pJun, 2026, 6)
        // Junio 2026 tiene 4 jueves → 64 sacos → +4
        expect(pJun).toBe(5)
        expect(typeof pJul).toBe('number')
        expect(pJul).toBeGreaterThanOrEqual(1)
        expect(pJul).toBeLessThanOrEqual(20)
    })
})

// ─── mesAnterior / mesSiguiente ───────────────────────────────────────────────

describe('mesAnterior / mesSiguiente', () => {
    it('enero → diciembre anterior', () => {
        expect(mesAnterior(2026, 1)).toEqual({ anio: 2025, mes: 12 })
    })
    it('diciembre → enero siguiente', () => {
        expect(mesSiguiente(2026, 12)).toEqual({ anio: 2027, mes: 1 })
    })
    it('mes intermedio', () => {
        expect(mesAnterior(2026, 6)).toEqual({ anio: 2026, mes: 5 })
        expect(mesSiguiente(2026, 6)).toEqual({ anio: 2026, mes: 7 })
    })
})

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
    it('sin miembros no genera asignaciones pero sí servicios', () => {
        const { servicios, asignaciones } = generarPlan(2026, 5, 1, [])
        expect(servicios.length).toBeGreaterThan(0)
        expect(asignaciones).toHaveLength(0)
    })

    it('un solo miembro G1 se asigna en todos los roles (fallback activo)', () => {
        const one = [{
            id: 'solo', nombre: 'Solo', grupo: 1 as const, orden: 0, activo: true,
            puede_jueves: true, puede_domingo_manana: true, puede_domingo_tarde: true,
        }]
        const { asignaciones } = generarPlan(2026, 5, 1, one)
        const g1Asigs = asignaciones.filter(a => ['realiza', 'apoyo', 'vigilancia'].includes(a.rol))
        // Todos los roles G1 deben tener al único miembro
        for (const a of g1Asigs) {
            expect(a.miembroId).toBe('solo')
        }
    })

    it('miembros inactivos no reciben asignaciones automáticas', () => {
        const mixtos = [
            {
                id: 'activo', nombre: 'Activo', grupo: 1 as const, orden: 0, activo: true,
                puede_jueves: true, puede_domingo_manana: true, puede_domingo_tarde: true,
            },
            {
                id: 'inactivo', nombre: 'Inactivo', grupo: 1 as const, orden: 1, activo: false,
                puede_jueves: true, puede_domingo_manana: true, puede_domingo_tarde: true,
            },
        ]
        const { asignaciones } = generarPlan(2026, 5, 1, mixtos)
        const g1Asigs = asignaciones.filter(a => ['realiza', 'apoyo', 'vigilancia'].includes(a.rol))
        for (const a of g1Asigs) {
            expect(a.miembroId).not.toBe('inactivo')
        }
    })

    it('con sacos_domingo_tarde=8, ciclo de 20 se cierra perfectamente cada semana', () => {
        const config = { jueves: 4, domingo: 8, domingoTarde: 8 }
        const { punteroFin } = generarPlan(2026, 5, 1, [], {}, null, config)
        // 4 semanas × 20 sacos = 80 → mod20 = 0 → puntero regresa a 1
        expect(punteroFin).toBe(1)
    })
})

describe('disponibilidad por turno — sin turnos marcados', () => {
    it('miembro con cero turnos no recibe asignaciones automáticas', () => {
        const sinTurnos: OfrendaMiembro = {
            ...makeMiembros(1, 1)[0],
            id: 'sin-turnos',
            puede_jueves: false,
            puede_domingo_manana: false,
            puede_domingo_tarde: false,
        }
        const otros = makeMiembros(3, 1)
        const { asignaciones } = generarPlan(2026, 5, 1, [sinTurnos, ...otros], {}, null)
        expect(asignaciones.filter(a => a.miembroId === sinTurnos.id)).toHaveLength(0)
    })
})

describe('disponibilidad por turno', () => {
    it('miembro solo jueves nunca se asigna en domingo', () => {
        const jeffrey: OfrendaMiembro = {
            ...makeMiembros(1, 1, {
                puede_jueves: true,
                puede_domingo_manana: false,
                puede_domingo_tarde: false,
            })[0],
            id: 'solo-jueves',
            nombre: 'Solo Jueves',
            orden: 0,
        }
        const otros = makeMiembros(3, 1).map((m, i) => ({ ...m, orden: i + 1 }))
        const { asignaciones } = generarPlan(2026, 5, 1, [jeffrey, ...otros], {}, null)
        const jeffreyDom = asignaciones.filter(
            a => a.miembroId === jeffrey.id && a.servicioTipo !== 'jueves',
        )
        expect(jeffreyDom).toHaveLength(0)
        const jeffreyJue = asignaciones.filter(
            a => a.miembroId === jeffrey.id && a.servicioTipo === 'jueves',
        )
        expect(jeffreyJue.length).toBeGreaterThan(0)
    })

    it('rota entre varios miembros solo-jueves en distintos jueves del mes', () => {
        const soloJueves = {
            puede_jueves: true,
            puede_domingo_manana: false,
            puede_domingo_tarde: false,
        } as const
        const a: OfrendaMiembro = {
            ...makeMiembros(1, 2, soloJueves)[0],
            id: 'g2-jueves-a',
            nombre: 'A',
            orden: 0,
        }
        const b: OfrendaMiembro = {
            ...makeMiembros(1, 2, soloJueves)[0],
            id: 'g2-jueves-b',
            nombre: 'B',
            orden: 1,
        }
        const { asignaciones } = generarPlan(2026, 5, 1, [a, b], {}, 2)
        const juevesIds = new Set(
            asignaciones
                .filter(x => x.servicioTipo === 'jueves')
                .map(x => x.miembroId),
        )
        expect(juevesIds.has(a.id)).toBe(true)
        expect(juevesIds.has(b.id)).toBe(true)
    })
})

// ─── Puestos fijos (coordinador/apoyo siempre la misma persona ese día) ─────────

describe('generarPlan — puestos fijos', () => {
    const fijoCoord: OfrendaMiembro = {
        ...makeMiembros(1, 1)[0],
        id: 'fijo-coord',
        nombre: 'Coord Fijo',
        fijoDiaTipo: 'jueves',
        fijoRol: 'realiza',
    }
    const fijoApoyo: OfrendaMiembro = {
        ...makeMiembros(1, 1)[0],
        id: 'fijo-apoyo',
        nombre: 'Apoyo Fijo',
        fijoDiaTipo: 'jueves',
        fijoRol: 'apoyo',
    }
    const otros = makeMiembros(5, 1).map((m, i) => ({ ...m, id: `otro-${i}`, orden: i + 10 }))
    const miembros = [fijoCoord, fijoApoyo, ...otros]

    it('asigna SIEMPRE el miembro fijo en su día_tipo y rol', () => {
        const plan = generarPlan(2026, 1, 1, miembros)
        const jueRealiza = plan.asignaciones.filter(a => a.servicioTipo === 'jueves' && a.rol === 'realiza')
        const jueApoyo = plan.asignaciones.filter(a => a.servicioTipo === 'jueves' && a.rol === 'apoyo')
        expect(jueRealiza.length).toBeGreaterThan(0)
        expect(jueRealiza.every(a => a.miembroId === 'fijo-coord')).toBe(true)
        expect(jueApoyo.every(a => a.miembroId === 'fijo-apoyo')).toBe(true)
    })

    it('el fijo gana incluso sobre un override manual de esa fecha', () => {
        // 2026-01-01 es jueves
        const overrides = { '2026-01-01:jueves:realiza': 'otro-0' }
        const plan = generarPlan(2026, 1, 1, miembros, overrides)
        const realiza0101 = plan.asignaciones.find(
            a => a.servicioFecha === '2026-01-01' && a.rol === 'realiza',
        )
        expect(realiza0101?.miembroId).toBe('fijo-coord')
    })

    it('la vigilancia (no fija) sigue siendo aleatoria/rotativa', () => {
        const plan = generarPlan(2026, 1, 1, miembros)
        const jueVigilancia = plan.asignaciones.filter(a => a.servicioTipo === 'jueves' && a.rol === 'vigilancia')
        expect(jueVigilancia.length).toBeGreaterThan(0)
        // nunca el coordinador fijo (ya usado ese día) en vigilancia del mismo jueves
        expect(jueVigilancia.every(a => a.miembroId !== 'fijo-coord')).toBe(true)
    })

    it('el domingo:realiza NO queda forzado al fijo de jueves', () => {
        const plan = generarPlan(2026, 1, 1, miembros)
        const domRealiza = plan.asignaciones.filter(a => a.servicioTipo === 'domingo' && a.rol === 'realiza')
        expect(domRealiza.length).toBeGreaterThan(0)
        // el fijo de jueves no debe acaparar el domingo (al menos algún domingo es de otro)
        expect(domRealiza.some(a => a.miembroId !== 'fijo-coord')).toBe(true)
    })
})

// ─── Roles nuevos de Grupo 1 (aleatorios) ──────────────────────────────────────

describe('generarPlan — roles nuevos G1 (primera_vez, segunda_tercera_vez, imposicion_manos)', () => {
    it('se asignan automáticamente como el resto de G1', () => {
        const plan = generarPlan(2026, 1, 1, allMiembros)
        for (const rol of ['primera_vez', 'segunda_tercera_vez', 'imposicion_manos'] as const) {
            const asigs = plan.asignaciones.filter(a => a.rol === rol)
            expect(asigs.length).toBeGreaterThan(0)
            expect(asigs.every(a => a.miembroId.startsWith('m1-'))).toBe(true) // miembros de Grupo 1
        }
    })

    it('no rompen la detección de Grupo 2 (no empiezan por "colaborador")', () => {
        const plan = generarPlan(2026, 1, 1, allMiembros)
        const g2 = plan.asignaciones.filter(a => a.rol.startsWith('colaborador'))
        expect(g2.every(a => a.miembroId.startsWith('m2-'))).toBe(true)
    })
})
