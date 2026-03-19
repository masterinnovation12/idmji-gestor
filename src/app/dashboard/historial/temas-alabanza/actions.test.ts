import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    getAllTemasAlabanza,
    getTemasAlabanzaStats,
    getHermanosConTemas,
    getTemasAlabanzaKeys
} from './actions'

const mockCultoTypesData = { id: 'alabanza-id' }
const mockCultosData = [
    {
        id: 'c1',
        fecha: '2025-03-15',
        hora_inicio: '19:00',
        meta_data: { tema_introduccion_alabanza: 'alabanza.tema.serReverentes' },
        tipo_culto: { id: '1', nombre: 'Alabanza' },
        usuario_intro: { id: 'u1', nombre: 'Jeffrey', apellidos: 'Bolaños' }
    }
]

const mockLecturasData = [
    {
        culto_id: 'c1',
        libro: 'Salmos',
        capitulo_inicio: 100,
        versiculo_inicio: 1,
        capitulo_fin: 100,
        versiculo_fin: 5
    }
]

function makeResolvableChain(resolveValue: { data: any[]; error?: any; count?: number }) {
    const chain = {
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(resolveValue),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        then: (onFulfilled: (v: any) => any) =>
            Promise.resolve(resolveValue).then(onFulfilled),
        catch: (onRejected: (e: any) => any) =>
            Promise.resolve(resolveValue).catch(onRejected)
    }
    return {
        select: vi.fn().mockReturnValue(chain),
        ...chain
    }
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn()
}))

vi.mock('next/cache', () => ({
    unstable_noStore: vi.fn()
}))

describe('temas-alabanza actions', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        const { createClient } = await import('@/lib/supabase/server')
        vi.mocked(createClient).mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'culto_types') {
                    return {
                        select: vi.fn().mockReturnValue({
                            ilike: vi.fn().mockReturnValue({
                                limit: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({ data: mockCultoTypesData })
                                })
                            })
                        })
                    }
                }
                if (table === 'cultos') {
                    return makeResolvableChain({
                        data: mockCultosData,
                        error: null,
                        count: mockCultosData.length
                    })
                }
                if (table === 'lecturas_biblicas') {
                    return makeResolvableChain({
                        data: mockLecturasData,
                        error: null
                    })
                }
                return { select: vi.fn() }
            })
        } as any)
    })

    describe('getAllTemasAlabanza', () => {
        it('returns data and totalPages when cultos exist', async () => {
            const result = await getAllTemasAlabanza(1, 20)

            expect(result).not.toHaveProperty('error')
            expect(result.data).toHaveLength(1)
            expect(result.data![0].tema_key).toBe('alabanza.tema.serReverentes')
            expect(result.data![0].usuario_intro?.nombre).toBe('Jeffrey')
            expect(result.totalPages).toBe(1)
        })

        it('includes lectura_intro when introduccion reading exists', async () => {
            const result = await getAllTemasAlabanza(1, 20)
            expect(result.data![0].lectura_intro).toBeDefined()
            expect(result.data![0].lectura_intro?.libro).toBe('Salmos')
            expect(result.data![0].lectura_intro?.capitulo_inicio).toBe(100)
        })

        it('returns empty when no alabanza type exists', async () => {
            const { createClient } = await import('@/lib/supabase/server')
            vi.mocked(createClient).mockResolvedValueOnce({
                from: vi.fn((table: string) => {
                    if (table === 'culto_types') {
                        return {
                            select: vi.fn().mockReturnValue({
                                ilike: vi.fn().mockReturnValue({
                                    limit: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({ data: null })
                                    })
                                })
                            })
                        }
                    }
                    return { select: vi.fn() }
                })
            } as any)

            const result = await getAllTemasAlabanza(1, 20)
            expect(result.data).toEqual([])
            expect(result.totalPages).toBe(0)
        })
    })

    describe('getTemasAlabanzaStats', () => {
        it('returns stats with totalUsos and temaMasUsado', async () => {
            const result = await getTemasAlabanzaStats()
            expect(result.totalUsos).toBe(1)
            expect(result.temaMasUsado?.temaKey).toBe('alabanza.tema.serReverentes')
            expect(result.temaMasUsado?.count).toBe(1)
        })
    })

    describe('getHermanosConTemas', () => {
        it('returns data array', async () => {
            const { createClient } = await import('@/lib/supabase/server')
            vi.mocked(createClient).mockResolvedValueOnce({
                from: vi.fn((table: string) => {
                    if (table === 'culto_types') {
                        return {
                            select: vi.fn().mockReturnValue({
                                ilike: vi.fn().mockReturnValue({
                                    limit: vi.fn().mockReturnValue({
                                        single: vi.fn().mockResolvedValue({ data: { id: 'ab' } })
                                    })
                                })
                            })
                        }
                    }
                    if (table === 'cultos') {
                        const c = makeResolvableChain({
                            data: [{ id_usuario_intro: 'u1', usuario_intro: { id: 'u1', nombre: 'Jeffrey', apellidos: 'Bolaños' } }],
                            error: null
                        })
                        c.not = vi.fn().mockReturnValue(c)
                        return c
                    }
                    return { select: vi.fn() }
                })
            } as any)

            const { data } = await getHermanosConTemas()
            expect(data).toBeDefined()
            expect(Array.isArray(data)).toBe(true)
        })
    })

    describe('getTemasAlabanzaKeys', () => {
        it('returns array of 6 tema keys', async () => {
            const keys = await getTemasAlabanzaKeys()
            expect(Array.isArray(keys)).toBe(true)
            expect(keys.length).toBe(6)
            expect(keys).toContain('alabanza.tema.serReverentes')
            expect(keys).toContain('alabanza.tema.prepararnos')
        })
    })
})
