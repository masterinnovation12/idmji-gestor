import { beforeEach, describe, expect, it, vi } from 'vitest'

/** El directorio de Hermanos debe mostrar solo la sede activa (profiles.sede_id). */

const createClientMock = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
    createClient: createClientMock,
}))

const getActiveSedeIdMock = vi.fn()
vi.mock('@/lib/sede/activeSede', () => ({
    getActiveSedeIdForCurrentUser: () => getActiveSedeIdMock(),
}))

function makeSupabase(result: { data: unknown[]; error: unknown; count?: number }) {
    const eqCalls: [string, unknown][] = []
    const methods = ['select', 'eq', 'or', 'order'] as const
    const makeChain = () => {
        const chain: Record<string, unknown> = {}
        for (const m of methods) {
            chain[m] = vi.fn((...args: unknown[]) => {
                if (m === 'eq') eqCalls.push([args[0] as string, args[1]])
                return chain
            })
        }
        ;(chain as { then: unknown }).then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
            Promise.resolve(result).then(onF, onR)
        return chain
    }
    return { supabase: { from: vi.fn(() => makeChain()) }, eqCalls }
}

const SEDE = 'sede-terrassa'

describe('Hermanos · aislamiento por sede', () => {
    beforeEach(() => vi.clearAllMocks())

    it('getHermanos filtra profiles por sede_id de la sede activa', async () => {
        getActiveSedeIdMock.mockResolvedValue(SEDE)
        const { supabase, eqCalls } = makeSupabase({ data: [], error: null })
        createClientMock.mockResolvedValue(supabase)

        const { getHermanos } = await import('./actions')
        await getHermanos()

        expect(eqCalls).toContainEqual(['sede_id', SEDE])
    })

    it('getHermanosStats cuenta pulpito y total solo de la sede activa', async () => {
        getActiveSedeIdMock.mockResolvedValue(SEDE)
        const { supabase, eqCalls } = makeSupabase({ data: [], error: null, count: 0 })
        createClientMock.mockResolvedValue(supabase)

        const { getHermanosStats } = await import('./actions')
        await getHermanosStats()

        const sede = eqCalls.filter(([f]) => f === 'sede_id')
        expect(sede.length).toBe(2)
        expect(sede.every(([, v]) => v === SEDE)).toBe(true)
    })

    it('sin sede activa no añade filtro de sede', async () => {
        getActiveSedeIdMock.mockResolvedValue(null)
        const { supabase, eqCalls } = makeSupabase({ data: [], error: null })
        createClientMock.mockResolvedValue(supabase)

        const { getHermanos } = await import('./actions')
        await getHermanos()

        expect(eqCalls.filter(([f]) => f === 'sede_id')).toHaveLength(0)
    })
})
