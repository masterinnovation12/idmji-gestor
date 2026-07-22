import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regresión del bug de sedes: Historial de Lecturas (y sus consultas de apoyo)
 * DEBE acotar por la sede activa. El ADMIN ve todas las sedes por RLS, así que
 * sin el filtro explícito veía lecturas de todas las sedes.
 */

const createClientMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
    createClient: createClientMock,
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    unstable_noStore: vi.fn(),
}))

const getActiveSedeIdMock = vi.fn()
vi.mock('@/lib/sede/activeSede', () => ({
    getActiveSedeIdForCurrentUser: () => getActiveSedeIdMock(),
}))

/**
 * Cliente Supabase de prueba: toda cadena de consulta registra sus `.eq(...)`
 * en `eqCalls` y es "thenable", de modo que cualquier patrón de `await` resuelve
 * el mismo resultado configurado.
 */
function makeSupabase(result: { data: unknown[]; error: unknown; count?: number }) {
    const eqCalls: [string, unknown][] = []
    const methods = [
        'select', 'eq', 'neq', 'in', 'gte', 'lte', 'lt', 'gt', 'or',
        'ilike', 'not', 'order', 'contains', 'limit', 'range', 'single', 'maybeSingle',
    ] as const
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

const SEDE = 'sede-sabadell'

function sedeEqCalls(eqCalls: [string, unknown][]): [string, unknown][] {
    return eqCalls.filter(([field]) => field.endsWith('sede_id'))
}

describe('Historial Lecturas · aislamiento por sede', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('getAllLecturas filtra por culto.sede_id de la sede activa', async () => {
        getActiveSedeIdMock.mockResolvedValue(SEDE)
        const { supabase, eqCalls } = makeSupabase({ data: [], error: null, count: 0 })
        createClientMock.mockResolvedValue(supabase)

        const { getAllLecturas } = await import('./actions')
        await getAllLecturas(1, 20)

        expect(eqCalls).toContainEqual(['culto.sede_id', SEDE])
    })

    it('getAllLecturas NO añade filtro de sede cuando no hay sede activa', async () => {
        getActiveSedeIdMock.mockResolvedValue(null)
        const { supabase, eqCalls } = makeSupabase({ data: [], error: null, count: 0 })
        createClientMock.mockResolvedValue(supabase)

        const { getAllLecturas } = await import('./actions')
        await getAllLecturas(1, 20)

        expect(sedeEqCalls(eqCalls)).toHaveLength(0)
    })

    it('getLecturasStats acota las 3 consultas por cultos.sede_id', async () => {
        getActiveSedeIdMock.mockResolvedValue(SEDE)
        const { supabase, eqCalls } = makeSupabase({ data: [], error: null, count: 0 })
        createClientMock.mockResolvedValue(supabase)

        const { getLecturasStats } = await import('./actions')
        await getLecturasStats()

        const sede = sedeEqCalls(eqCalls)
        expect(sede.length).toBeGreaterThanOrEqual(3)
        expect(sede.every(([, value]) => value === SEDE)).toBe(true)
        expect(eqCalls).toContainEqual(['cultos.sede_id', SEDE])
    })

    it('getLectores filtra el desplegable por cultos.sede_id', async () => {
        getActiveSedeIdMock.mockResolvedValue(SEDE)
        const { supabase, eqCalls } = makeSupabase({ data: [], error: null })
        createClientMock.mockResolvedValue(supabase)

        const { getLectores } = await import('./actions')
        await getLectores()

        expect(eqCalls).toContainEqual(['cultos.sede_id', SEDE])
    })

    it('checkCapituloEnHistorial acota el aviso de "capítulo ya leído" a la sede activa', async () => {
        getActiveSedeIdMock.mockResolvedValue(SEDE)
        const { supabase, eqCalls } = makeSupabase({ data: [], error: null })
        createClientMock.mockResolvedValue(supabase)

        const { checkCapituloEnHistorial } = await import('./actions')
        await checkCapituloEnHistorial('Juan', 3)

        expect(eqCalls).toContainEqual(['cultos.sede_id', SEDE])
    })

    it('saveLectura acota la detección de "repetida" a la sede del culto (no a otras sedes)', async () => {
        const eqCalls: [string, unknown][] = []
        const lecturaChain: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'neq', 'limit'] as const) {
            lecturaChain[m] = vi.fn((...a: unknown[]) => {
                if (m === 'eq') eqCalls.push([a[0] as string, a[1]])
                return lecturaChain
            })
        }
        lecturaChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
        lecturaChain.insert = vi.fn(() => ({
            select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: 'nueva' }, error: null }) }),
        }))

        createClientMock.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'cultos') {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: vi.fn().mockResolvedValue({
                                    data: { id_usuario_intro: null, id_usuario_finalizacion: null, sede_id: SEDE },
                                    error: null,
                                }),
                            }),
                        }),
                    }
                }
                return lecturaChain
            }),
        })

        const { saveLectura } = await import('./actions')
        await saveLectura('culto-1', 'introduccion', 'Salmos', 23, 1, 23, 6, 'user-1')

        expect(eqCalls).toContainEqual(['cultos.sede_id', SEDE])
    })
})
