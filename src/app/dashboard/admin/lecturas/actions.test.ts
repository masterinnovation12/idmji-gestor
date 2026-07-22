import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Analítica admin de lecturas por sede: agregación y desglose por sede. */

const requireAdminMock = vi.fn()
vi.mock('@/lib/auth/guards', () => ({
    requireAdmin: () => requireAdminMock(),
}))

const createAdminClientMock = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => createAdminClientMock(),
}))

type Row = Record<string, unknown>

/** Cadena que aplica .eq/.in sobre un dataset y resuelve al hacer await. */
function tableChain(rows: Row[]) {
    let current = rows
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    chain.eq = vi.fn((f: string, v: unknown) => { current = current.filter(r => r[f] === v); return chain })
    chain.in = vi.fn((f: string, vals: unknown[]) => { current = current.filter(r => vals.includes(r[f])); return chain })
    ;(chain as { then: unknown }).then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve({ data: current, error: null }).then(onF, onR)
    return chain
}

const SEDES: Row[] = [
    { id: 's1', nombre: 'Sabadell', slug: 'sabadell', activo: true, es_principal: true },
    { id: 's2', nombre: 'Terrassa', slug: 'terrassa', activo: true, es_principal: false },
]
const CULTOS: Row[] = [
    { id: 'c1', sede_id: 's1', fecha: '2026-01-05' },
    { id: 'c2', sede_id: 's2', fecha: '2026-02-10' },
    { id: 'c3', sede_id: 's1', fecha: '2025-12-01' },
]
const LECTURAS: Row[] = [
    { libro: 'Salmos', culto_id: 'c1' },
    { libro: 'Salmos', culto_id: 'c1' },
    { libro: 'Juan', culto_id: 'c1' },
    { libro: 'Mateo', culto_id: 'c2' },
    { libro: 'Salmos', culto_id: 'c3' },
]

function datasetFor(table: string): Row[] {
    if (table === 'sedes') return [...SEDES]
    if (table === 'cultos') return [...CULTOS]
    if (table === 'lecturas_biblicas') return [...LECTURAS]
    return []
}

describe('getLecturasPorSede (admin, cross-sede)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        requireAdminMock.mockResolvedValue({ ctx: {}, error: null })
        createAdminClientMock.mockReturnValue({ from: (table: string) => tableChain(datasetFor(table)) })
    })

    it('todas las sedes, histórico completo: ranking global + desglose por sede', async () => {
        const { getLecturasPorSede } = await import('./actions')
        const res = await getLecturasPorSede(null, null)

        expect(res.success).toBe(true)
        const d = res.data!
        expect(d.global.totalLecturas).toBe(5)
        expect(d.global.topLibros[0]).toEqual({ libro: 'Salmos', count: 3 })
        expect(d.global.librosDistintos).toBe(3)

        // Ordenado por total desc: Sabadell (4) antes que Terrassa (1)
        expect(d.porSede.map(s => s.nombre)).toEqual(['Sabadell', 'Terrassa'])
        const sabadell = d.porSede[0]
        expect(sabadell.totalLecturas).toBe(4)
        expect(sabadell.topLibro).toEqual({ libro: 'Salmos', count: 3 })
        expect(d.porSede[1].topLibro).toEqual({ libro: 'Mateo', count: 1 })

        // Años disponibles, descendente
        expect(d.years).toEqual([2026, 2025])
    })

    it('filtrar por una sede acota el global a esa sede (no cuenta otras)', async () => {
        const { getLecturasPorSede } = await import('./actions')
        const res = await getLecturasPorSede('s1', null)

        expect(res.success).toBe(true)
        const d = res.data!
        expect(d.porSede).toHaveLength(1)
        expect(d.global.totalLecturas).toBe(4)
        // Mateo pertenece a Terrassa: no debe aparecer
        expect(d.global.topLibros.some(l => l.libro === 'Mateo')).toBe(false)
    })

    it('filtrar por año excluye lecturas de cultos de otros años', async () => {
        const { getLecturasPorSede } = await import('./actions')
        const res = await getLecturasPorSede(null, 2026)

        expect(res.success).toBe(true)
        const d = res.data!
        // 2026: c1 (Salmos x2, Juan) + c2 (Mateo) = 4; c3 (2025) excluido
        expect(d.global.totalLecturas).toBe(4)
        expect(d.global.topLibros[0]).toEqual({ libro: 'Salmos', count: 2 })
    })

    it('sin permisos de admin devuelve error', async () => {
        requireAdminMock.mockResolvedValue({ ctx: null, error: 'Sin permisos' })
        const { getLecturasPorSede } = await import('./actions')
        const res = await getLecturasPorSede(null, null)
        expect(res.success).toBe(false)
    })
})
