/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    PLANO_HISTORIAL_DESDE,
    contarRolesPorPersona,
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
