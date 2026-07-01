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
    it('arranca la primera semana de julio de 2026', () => {
        expect(PLANO_HISTORIAL_DESDE).toBe('2026-07-01')
    })
})

describe('contarRolesPorPersona', () => {
    const rows: AsignacionRolRow[] = [
        { persona_id: 'a', rol: 'ofrendario', servicio_id: 's-jul-1' },
        { persona_id: 'a', rol: 'apoyo', servicio_id: 's-jul-2' },
        { persona_id: 'a', rol: 'apoyo', servicio_id: 's-jul-3' },
        { persona_id: 'b', rol: 'ofrendario', servicio_id: 's-jul-1' },
        { persona_id: 'a', rol: 'ofrendario', servicio_id: 's-jun' }, // fuera de corte
        { persona_id: null, rol: 'apoyo', servicio_id: 's-jul-1' }, // manual sin persona
    ]

    it('separa ofrendario y apoyo por persona', () => {
        const valid = new Set(['s-jul-1', 's-jul-2', 's-jul-3', 's-jun'])
        const counts = contarRolesPorPersona(rows, valid)
        expect(counts.get('a')).toEqual({ ofrendario: 2, apoyo: 2 })
        expect(counts.get('b')).toEqual({ ofrendario: 1, apoyo: 0 })
    })

    it('excluye servicios fuera del histórico válido (junio)', () => {
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
