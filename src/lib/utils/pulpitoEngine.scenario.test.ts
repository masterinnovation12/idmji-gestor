import { describe, it, expect } from 'vitest'
import {
    generarAsignacionesPulpito,
    rolesDelCulto,
    type CultoParaAsignar,
    type HermanoPulpito,
} from './pulpitoEngine'
import { PULPITO_ROLES, type PulpitoRol } from './pulpitoAvailability'

/**
 * Escenario realista de "usuario dando a Generar semana", tal como describe el
 * flujo de la iglesia:
 *   - Lunes y sábado: Estudio bíblico (introducción + finalización).
 *   - Martes a viernes: Lloança/Alabanza (introducción + finalización).
 *   - Domingo: Enseñanza (introducción + enseñanza + testimonios).
 *
 * Hermanos del púlpito con disponibilidad parcial declarada en su perfil.
 * Verifica QUÉ se generaría y que el resultado es coherente y respetuoso con
 * la disponibilidad.
 */

const flagsEstudio = { tiene_lectura_introduccion: true, tiene_lectura_finalizacion: true }
const flagsAlabanza = { tiene_lectura_introduccion: true, tiene_lectura_finalizacion: true }
const flagsEnsenanza = { tiene_lectura_introduccion: true, tiene_ensenanza: true, tiene_testimonios: true }

// Semana del 6 (lun) al 12 (dom) de julio de 2026.
function semanaReal(): CultoParaAsignar[] {
    const dias: { fecha: string; flags: Parameters<typeof rolesDelCulto>[0] }[] = [
        { fecha: '2026-07-06', flags: flagsEstudio },   // lunes
        { fecha: '2026-07-07', flags: flagsAlabanza },  // martes
        { fecha: '2026-07-08', flags: flagsAlabanza },  // miércoles
        { fecha: '2026-07-09', flags: flagsAlabanza },  // jueves
        { fecha: '2026-07-10', flags: flagsAlabanza },  // viernes
        { fecha: '2026-07-11', flags: flagsEstudio },   // sábado
        { fecha: '2026-07-12', flags: flagsEnsenanza }, // domingo
    ]
    return dias.map(d => ({
        id: `c-${d.fecha}`,
        fecha: d.fecha,
        horaInicio: '19:00',
        roles: rolesDelCulto(d.flags),
        asignacionesActuales: {},
    }))
}

// Patrón de disponibilidad para todos los días laborables de estudio/alabanza.
const DIARIO_INTRO_FIN = Object.fromEntries(
    ['1', '2', '3', '4', '5', '6'].map(d => [d, { intro: true, finalization: true }]),
)

function hermanos(): HermanoPulpito[] {
    return [
        // Veterano completo: cualquier día, cualquier rol.
        { id: 'h-pablo', nombre: 'Pablo', availability: null },
        // Solo introducción entre semana; domingo enseñanza.
        {
            id: 'h-marcos',
            nombre: 'Marcos',
            availability: {
                template: {
                    ...Object.fromEntries(['1', '2', '3', '4', '5', '6'].map(d => [d, { intro: true }])),
                    '0': { intro: true, teaching: true, testimonies: true },
                },
            },
        },
        // Solo finalización entre semana; domingo testimonios.
        {
            id: 'h-lucas',
            nombre: 'Lucas',
            availability: {
                template: {
                    ...Object.fromEntries(['1', '2', '3', '4', '5', '6'].map(d => [d, { finalization: true }])),
                    '0': { testimonies: true },
                },
            },
        },
        // Disponible intro+fin toda la semana + enseñanza el domingo.
        {
            id: 'h-juan',
            nombre: 'Juan',
            availability: { template: { ...DIARIO_INTRO_FIN, '0': { intro: true, teaching: true, testimonies: true } } },
        },
    ]
}

describe('Escenario: usuario da a «Generar semana»', () => {
    it('cubre todos los puestos de la semana sin dejar huecos', () => {
        const { asignaciones, problemas } = generarAsignacionesPulpito(semanaReal(), hermanos())
        expect(problemas).toEqual([])
        // 6 días intro+fin (12) + domingo intro+enseñanza+testimonios (3) = 15
        expect(asignaciones).toHaveLength(15)
        expect(asignaciones.every(a => a.hermanoId)).toBe(true)
    })

    it('respeta la disponibilidad declarada de cada hermano', () => {
        const { asignaciones } = generarAsignacionesPulpito(semanaReal(), hermanos())

        // Marcos solo hace introducción entre semana (nunca finalización lun-sáb).
        const marcosEntreSemana = asignaciones.filter(
            a => a.hermanoId === 'h-marcos' && a.fecha !== '2026-07-12',
        )
        expect(marcosEntreSemana.every(a => a.rol === 'introduccion')).toBe(true)

        // Lucas solo hace finalización entre semana y testimonios el domingo.
        const lucas = asignaciones.filter(a => a.hermanoId === 'h-lucas')
        expect(lucas.every(a =>
            (a.fecha !== '2026-07-12' && a.rol === 'finalizacion') ||
            (a.fecha === '2026-07-12' && a.rol === 'testimonios'),
        )).toBe(true)
    })

    it('el domingo de enseñanza asigna los tres roles a hermanos capacitados', () => {
        const { asignaciones } = generarAsignacionesPulpito(semanaReal(), hermanos())
        const domingo = asignaciones.filter(a => a.fecha === '2026-07-12')
        const roles = domingo.map(a => a.rol).sort()
        expect(roles).toEqual(['ensenanza', 'introduccion', 'testimonios'])
        // La enseñanza recae en alguien con teaching (Pablo, Marcos o Juan).
        const ensenanza = domingo.find(a => a.rol === 'ensenanza')
        expect(['h-pablo', 'h-marcos', 'h-juan']).toContain(ensenanza?.hermanoId)
    })

    it('produce un reparto imprimible: cada culto lista rol → hermano', () => {
        const { asignaciones } = generarAsignacionesPulpito(semanaReal(), hermanos())
        // Reconstruye la "lista exportable" y valida que no hay rol sin nombre.
        const porCulto = new Map<string, Partial<Record<PulpitoRol, string>>>()
        for (const a of asignaciones) {
            const row = porCulto.get(a.fecha) ?? {}
            if (a.hermanoId) row[a.rol] = a.hermanoId
            porCulto.set(a.fecha, row)
        }
        for (const [, row] of porCulto) {
            for (const rol of PULPITO_ROLES) {
                if (rol in row) expect(row[rol]).toBeTruthy()
            }
        }
        expect(porCulto.size).toBe(7)
    })
})
