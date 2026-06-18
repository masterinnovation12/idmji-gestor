import { describe, it, expect } from 'vitest'
import { remapPlanoAsignaciones, type PlanoAsigSnapshot } from './planoRescue'

const snap = (over: Partial<PlanoAsigSnapshot> = {}): PlanoAsigSnapshot => ({
    key: '2026-06-14:domingo',
    bloque: 1,
    rol: 'apoyo',
    persona_id: 'p1',
    nombre_snapshot: 'Ana',
    ...over,
})

describe('remapPlanoAsignaciones — rescate al regenerar', () => {
    it('reapunta al nuevo servicio_id por fecha:dia_tipo', () => {
        const srvMap = { '2026-06-14:domingo': 'NEW-ID' }
        const out = remapPlanoAsignaciones([snap()], srvMap)
        expect(out).toEqual([
            { servicio_id: 'NEW-ID', bloque: 1, rol: 'apoyo', persona_id: 'p1', nombre_snapshot: 'Ana' },
        ])
    })

    it('descarta asignaciones cuyo servicio ya no existe tras regenerar', () => {
        const srvMap = { '2026-06-14:domingo': 'NEW-ID' }
        const out = remapPlanoAsignaciones([snap({ key: '2026-06-30:jueves' })], srvMap)
        expect(out).toEqual([])
    })

    it('preserva persona_id null y nombre_snapshot manual', () => {
        const srvMap = { '2026-06-14:domingo': 'X' }
        const out = remapPlanoAsignaciones(
            [snap({ persona_id: null, nombre_snapshot: 'Invitado' })],
            srvMap,
        )
        expect(out[0]).toMatchObject({ persona_id: null, nombre_snapshot: 'Invitado', servicio_id: 'X' })
    })

    it('mapea varias fechas/turnos a sus nuevos IDs', () => {
        const srvMap = {
            '2026-06-14:domingo': 'D14',
            '2026-06-14:domingo_tarde': 'D14T',
            '2026-06-05:jueves': 'J05',
        }
        const out = remapPlanoAsignaciones(
            [
                snap({ key: '2026-06-14:domingo', bloque: 1 }),
                snap({ key: '2026-06-14:domingo_tarde', bloque: 2 }),
                snap({ key: '2026-06-05:jueves', bloque: 3 }),
            ],
            srvMap,
        )
        expect(out.map(r => r.servicio_id)).toEqual(['D14', 'D14T', 'J05'])
    })

    it('lista vacía → sin filas', () => {
        expect(remapPlanoAsignaciones([], { 'x:y': 'z' })).toEqual([])
    })
})
