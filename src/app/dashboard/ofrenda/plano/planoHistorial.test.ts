/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    PLANO_HISTORIAL_DESDE,
    aplicarAsignacionesARolesSesion,
    clonarMapaRoleCounts,
    clonarRolesPorTurno,
    construirRolesPorTurno,
    contarRolesPorPersona,
    servicioIdsPorTurno,
    sumarRolEnMapa,
    type AsignacionRolRow,
} from './planoHistorial'

describe('PLANO_HISTORIAL_DESDE', () => {
    it('arranca la última semana de junio 2026 (S.26, jueves 25/06)', () => {
        expect(PLANO_HISTORIAL_DESDE).toBe('2026-06-25')
    })
})

describe('contarRolesPorPersona', () => {
    const rows: AsignacionRolRow[] = [
        { persona_id: 'a', rol: 'ofrendario', servicio_id: 's-jul-1' },
        { persona_id: 'a', rol: 'apoyo', servicio_id: 's-jul-2' },
        { persona_id: 'a', rol: 'apoyo', servicio_id: 's-jul-3' },
        { persona_id: 'b', rol: 'ofrendario', servicio_id: 's-jul-1' },
        { persona_id: 'a', rol: 'ofrendario', servicio_id: 's-jun-21' },
        { persona_id: 'a', rol: 'ofrendario', servicio_id: 's-jun-25' },
        { persona_id: null, rol: 'apoyo', servicio_id: 's-jul-1' }, // manual sin persona
    ]

    it('separa ofrendario y apoyo por persona', () => {
        const valid = new Set(['s-jul-1', 's-jul-2', 's-jul-3', 's-jun-25'])
        const counts = contarRolesPorPersona(rows, valid)
        expect(counts.get('a')).toEqual({ ofrendario: 2, apoyo: 2 })
        expect(counts.get('b')).toEqual({ ofrendario: 1, apoyo: 0 })
    })

    it('excluye servicios anteriores a S.26 (junio previo)', () => {
        const valid = new Set(['s-jul-1', 's-jul-2', 's-jul-3', 's-jun-25'])
        const counts = contarRolesPorPersona(rows, valid)
        expect(counts.get('a')).toEqual({ ofrendario: 2, apoyo: 2 })
    })

    it('sin S.26 en el set válido no cuenta jun-25', () => {
        const valid = new Set(['s-jul-1', 's-jul-2', 's-jul-3'])
        const counts = contarRolesPorPersona(rows, valid)
        expect(counts.get('a')).toEqual({ ofrendario: 1, apoyo: 2 })
    })

    it('ignora asignaciones sin persona_id', () => {
        const valid = new Set(['s-jul-1'])
        const counts = contarRolesPorPersona(rows, valid)
        expect(counts.has('')).toBe(false)
        expect(counts.get('a')).toEqual({ ofrendario: 1, apoyo: 0 })
        expect(counts.get('b')).toEqual({ ofrendario: 1, apoyo: 0 })
    })

    it('sin servicios válidos → mapa vacío', () => {
        expect(contarRolesPorPersona(rows, new Set()).size).toBe(0)
    })
})

describe('sumarRolEnMapa y sesión de generación', () => {
    it('sumarRolEnMapa acumula por rol', () => {
        const map = new Map<string, { ofrendario: number; apoyo: number }>()
        sumarRolEnMapa(map, 'x', 'ofrendario', 2)
        sumarRolEnMapa(map, 'x', 'apoyo')
        expect(map.get('x')).toEqual({ ofrendario: 2, apoyo: 1 })
    })

    it('clonarMapaRoleCounts no comparte referencias', () => {
        const src = new Map([['a', { ofrendario: 1, apoyo: 2 }]])
        const clone = clonarMapaRoleCounts(src)
        clone.get('a')!.ofrendario = 99
        expect(src.get('a')!.ofrendario).toBe(1)
    })

    it('aplicarAsignacionesARolesSesion refleja cultos generados en la misma pasada', () => {
        const sesion = new Map<string, { ofrendario: number; apoyo: number }>()
        aplicarAsignacionesARolesSesion(sesion, [
            { persona_id: 'p1', rol: 'ofrendario' },
            { persona_id: 'p2', rol: 'apoyo' },
        ])
        aplicarAsignacionesARolesSesion(sesion, [
            { persona_id: 'p1', rol: 'apoyo' },
        ])
        expect(sesion.get('p1')).toEqual({ ofrendario: 1, apoyo: 1 })
        expect(sesion.get('p2')).toEqual({ ofrendario: 0, apoyo: 1 })
    })
})

describe('construirRolesPorTurno', () => {
    const servicios = [
        { id: 'sj', dia_tipo: 'jueves' },
        { id: 'sd', dia_tipo: 'domingo' },
        { id: 'st', dia_tipo: 'domingo_tarde' },
    ]
    const asig: AsignacionRolRow[] = [
        { persona_id: 'a', rol: 'ofrendario', servicio_id: 'sj' },
        { persona_id: 'a', rol: 'ofrendario', servicio_id: 'sj' },
        { persona_id: 'a', rol: 'ofrendario', servicio_id: 'sd' },
        { persona_id: 'a', rol: 'apoyo', servicio_id: 'sd' },
        { persona_id: 'b', rol: 'ofrendario', servicio_id: 'st' },
    ]

    it('separa conteos por dia_tipo', () => {
        const porTurno = construirRolesPorTurno(asig, servicios)
        expect(porTurno.get('jueves')?.get('a')).toEqual({ ofrendario: 2, apoyo: 0 })
        expect(porTurno.get('domingo')?.get('a')).toEqual({ ofrendario: 1, apoyo: 1 })
        expect(porTurno.get('domingo_tarde')?.get('b')).toEqual({ ofrendario: 1, apoyo: 0 })
    })

    it('servicioIdsPorTurno filtra correctamente', () => {
        expect(servicioIdsPorTurno(servicios, 'jueves')).toEqual(new Set(['sj']))
    })

    it('clonarRolesPorTurno no comparte mapas internos', () => {
        const src = construirRolesPorTurno(asig, servicios)
        const clone = clonarRolesPorTurno(src)
        clone.get('jueves')!.get('a')!.ofrendario = 99
        expect(src.get('jueves')!.get('a')!.ofrendario).toBe(2)
    })
})
