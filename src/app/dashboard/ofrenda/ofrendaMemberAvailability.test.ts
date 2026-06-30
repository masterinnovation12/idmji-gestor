import { describe, it, expect } from 'vitest'
import {
    normalizeMiembroDisponibilidad,
    parseDisponibilidadFlag,
    puedeMiembroEnTurno,
    filtrarMiembrosPorTurno,
    disponibilidadFromPreset,
    detectDisponibilidadPreset,
    cuentaTurnosActivos,
    miembroParticipaEnGeneracion,
    validarDisponibilidadParaGenerar,
    DISPONIBILIDAD_TURNOS_DEFAULT,
} from './ofrendaMemberAvailability'

describe('parseDisponibilidadFlag', () => {
    it('respeta false explícito', () => {
        expect(parseDisponibilidadFlag(false, true)).toBe(false)
        expect(parseDisponibilidadFlag('false', true)).toBe(false)
        expect(parseDisponibilidadFlag(0, true)).toBe(false)
    })

    it('usa default solo si el valor es desconocido', () => {
        expect(parseDisponibilidadFlag(undefined, true)).toBe(true)
        expect(parseDisponibilidadFlag(undefined, false)).toBe(false)
    })
})

describe('ofrendaMemberAvailability — normalización y presets', () => {
    it('normaliza valores ausentes a todos los turnos activos', () => {
        expect(normalizeMiembroDisponibilidad(null)).toEqual(DISPONIBILIDAD_TURNOS_DEFAULT)
        expect(normalizeMiembroDisponibilidad({})).toEqual(DISPONIBILIDAD_TURNOS_DEFAULT)
        expect(
            normalizeMiembroDisponibilidad({
                puede_jueves: false,
                puede_domingo_manana: true,
            }),
        ).toEqual({
            puede_jueves: false,
            puede_domingo_manana: true,
            puede_domingo_tarde: true,
        })
    })

    it('presets y detección son simétricos para all, jueves y domingo', () => {
        expect(detectDisponibilidadPreset(disponibilidadFromPreset('all'))).toBe('all')
        expect(detectDisponibilidadPreset(disponibilidadFromPreset('jueves'))).toBe('jueves')
        expect(detectDisponibilidadPreset(disponibilidadFromPreset('domingo'))).toBe('domingo')
        expect(
            detectDisponibilidadPreset({
                puede_jueves: true,
                puede_domingo_manana: false,
                puede_domingo_tarde: true,
            }),
        ).toBe('custom')
    })

    it('cuenta turnos activos', () => {
        expect(cuentaTurnosActivos(disponibilidadFromPreset('jueves'))).toBe(1)
        expect(cuentaTurnosActivos(disponibilidadFromPreset('domingo'))).toBe(2)
        expect(cuentaTurnosActivos(disponibilidadFromPreset('all'))).toBe(3)
    })
})

describe('ofrendaMemberAvailability — puedeMiembroEnTurno', () => {
    const soloJueves = disponibilidadFromPreset('jueves')

    it('mapea dia_tipo a flags correctos', () => {
        expect(puedeMiembroEnTurno(soloJueves, 'jueves')).toBe(true)
        expect(puedeMiembroEnTurno(soloJueves, 'domingo')).toBe(false)
        expect(puedeMiembroEnTurno(soloJueves, 'domingo_tarde')).toBe(false)
    })

    it('filtra lista por turno', () => {
        const miembros = [
            { ...soloJueves, id: 'a' },
            { ...disponibilidadFromPreset('domingo'), id: 'b' },
        ]
        const jueves = filtrarMiembrosPorTurno(miembros, 'jueves')
        expect(jueves.map(m => m.id)).toEqual(['a'])
    })
})

describe('ofrendaMemberAvailability — validarDisponibilidadParaGenerar', () => {
    const fechas = [
        { diaTipo: 'jueves' as const },
        { diaTipo: 'domingo' as const },
        { diaTipo: 'domingo_tarde' as const },
    ]

    const base = [
        {
            grupo: 1 as const,
            activo: true,
            ...disponibilidadFromPreset('all'),
        },
        ...Array.from({ length: 3 }, () => ({
            grupo: 2 as const,
            activo: true,
            ...disponibilidadFromPreset('all'),
        })),
    ]

    it('ok cuando cada grupo tiene elegible en cada turno del mes', () => {
        expect(validarDisponibilidadParaGenerar(fechas, base, null).ok).toBe(true)
    })

    it('falla si G1 no tiene nadie para domingo tarde', () => {
        const miembros = [
            {
                grupo: 1 as const,
                activo: true,
                ...disponibilidadFromPreset('jueves'),
            },
            ...base.filter(m => m.grupo === 2),
        ]
        const r = validarDisponibilidadParaGenerar(fechas, miembros, null)
        expect(r.ok).toBe(false)
        expect(r.problemas.some(p => p.diaTipo === 'domingo' && p.grupo === 1)).toBe(true)
        expect(r.problemas.some(p => p.diaTipo === 'domingo_tarde' && p.grupo === 1)).toBe(true)
    })

    it('al regenerar solo G2 no exige elegibles en G1', () => {
        const miembros = [
            {
                grupo: 1 as const,
                activo: true,
                ...disponibilidadFromPreset('jueves'),
            },
            ...Array.from({ length: 3 }, () => ({
                grupo: 2 as const,
                activo: true,
                ...disponibilidadFromPreset('all'),
            })),
        ]
        expect(validarDisponibilidadParaGenerar(fechas, miembros, 2).ok).toBe(true)
        expect(validarDisponibilidadParaGenerar(fechas, miembros, 1).ok).toBe(false)
    })

    it('ignora miembros sin ningún turno marcado', () => {
        const miembros = [
            {
                grupo: 1 as const,
                activo: true,
                puede_jueves: false,
                puede_domingo_manana: false,
                puede_domingo_tarde: false,
            },
            ...Array.from({ length: 3 }, () => ({
                grupo: 2 as const,
                activo: true,
                ...disponibilidadFromPreset('all'),
            })),
        ]
        expect(miembroParticipaEnGeneracion(miembros[0])).toBe(false)
        const r = validarDisponibilidadParaGenerar(fechas, miembros, null)
        expect(r.ok).toBe(false)
        expect(r.problemas.some(p => p.grupo === 1)).toBe(true)
    })

    it('ignora miembros inactivos', () => {
        const miembros = [
            {
                grupo: 1 as const,
                activo: false,
                ...disponibilidadFromPreset('all'),
            },
            ...Array.from({ length: 3 }, () => ({
                grupo: 2 as const,
                activo: true,
                ...disponibilidadFromPreset('all'),
            })),
        ]
        const r = validarDisponibilidadParaGenerar(fechas, miembros, null)
        expect(r.ok).toBe(false)
        expect(r.problemas.every(p => p.grupo === 1)).toBe(true)
    })

    it('G2 requiere al menos 2 elegibles en jueves y dom tarde, 3 en dom mañana', () => {
        const soloUnoG2 = [
            ...base.filter(m => m.grupo === 1),
            {
                grupo: 2 as const,
                activo: true,
                ...disponibilidadFromPreset('all'),
            },
        ]
        const r = validarDisponibilidadParaGenerar(fechas, soloUnoG2, null)
        expect(r.ok).toBe(false)
        expect(r.problemas.some(p => p.grupo === 2 && p.diaTipo === 'jueves')).toBe(true)
        expect(r.problemas.some(p => p.grupo === 2 && p.diaTipo === 'domingo_tarde')).toBe(true)
        expect(r.problemas.some(p => p.grupo === 2 && p.diaTipo === 'domingo')).toBe(true)
    })

    it('G2 ok con 2 elegibles en jueves/tarde y 3 en dom mañana', () => {
        const g2Minimo = [
            ...base.filter(m => m.grupo === 1),
            ...Array.from({ length: 3 }, (_, i) => ({
                grupo: 2 as const,
                activo: true,
                puede_jueves: i < 2,
                puede_domingo_manana: true,
                puede_domingo_tarde: i < 2,
            })),
        ]
        expect(validarDisponibilidadParaGenerar(fechas, g2Minimo, null).ok).toBe(true)
    })
})
