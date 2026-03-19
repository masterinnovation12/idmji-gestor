/**
 * Tests para actions de Estadísticas (admin/stats).
 * Verifica: getCultoTypes, getStatsSummary, getParticipationStats, getBibleReadingStats.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    getCultoTypes,
    getStatsSummary,
    getParticipationStats,
    getBibleReadingStats
} from './actions'

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}))

describe('getCultoTypes', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
    })

    it('devuelve lista de tipos de culto ordenados', async () => {
        const mockFrom = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                    data: [
                        { id: '1', nombre: 'Alabanza' },
                        { id: '2', nombre: 'Estudio' },
                    ],
                    error: null,
                }),
            }),
        })
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

        const result = await getCultoTypes()

        expect(result.success).toBe(true)
        expect(result.data).toHaveLength(2)
        expect(result.data?.[0].nombre).toBe('Alabanza')
    })

    it('devuelve array vacío cuando no hay tipos', async () => {
        const mockFrom = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
        })
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

        const result = await getCultoTypes()

        expect(result.success).toBe(true)
        expect(result.data).toEqual([])
    })

    it('devuelve error cuando falla la consulta', async () => {
        const mockFrom = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
            }),
        })
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

        const result = await getCultoTypes()

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
    })
})

describe('getStatsSummary', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
    })

    it('calcula totales correctamente', async () => {
        const chain = {
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
        }
        const mockFrom = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue(chain),
        })
        chain.lte.mockResolvedValue({
            data: [
                {
                    id: 'c1',
                    id_usuario_intro: 'u1',
                    id_usuario_finalizacion: 'u2',
                    id_usuario_ensenanza: 'u1',
                    id_usuario_testimonios: null,
                },
            ],
            error: null,
        })

        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

        const result = await getStatsSummary(2025)

        expect(result.success).toBe(true)
        expect(result.data?.totalCultos).toBe(1)
        expect(result.data?.totalParticipaciones).toBe(3)
        expect(result.data?.hermanosActivos).toBe(2)
    })

    it('aplica filtro tipoCultoId cuando se pasa', async () => {
        const result = { data: [] as unknown[], error: null }
        const chain = {
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (cb: (v: typeof result) => unknown) => Promise.resolve(result).then(cb),
            catch: (cb: (e: unknown) => unknown) => Promise.resolve(result).catch(cb),
        }
        const mockFrom = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue(chain),
        })

        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

        await getStatsSummary(2025, 'tipo-1')

        expect(chain.eq).toHaveBeenCalledWith('tipo_culto_id', 'tipo-1')
    })
})

describe('getParticipationStats', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
    })

    it('devuelve stats ordenados por total descendente', async () => {
        const cultosChain = {
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
        }
        const mockFrom = vi.fn().mockImplementation((table: string) => {
            if (table === 'cultos') {
                return {
                    select: vi.fn().mockReturnValue(cultosChain),
                }
            }
            if (table === 'profiles') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            order: vi.fn().mockResolvedValue({
                                data: [
                                    { id: 'u1', nombre: 'Ana', apellidos: 'García', pulpito: true },
                                    { id: 'u2', nombre: 'Pedro', apellidos: 'López', pulpito: true },
                                ],
                                error: null,
                            }),
                        }),
                    }),
                }
            }
            return {}
        })
        cultosChain.lte.mockResolvedValue({
            data: [
                {
                    id: 'c1',
                    id_usuario_intro: 'u1',
                    id_usuario_finalizacion: 'u2',
                    id_usuario_ensenanza: 'u1',
                    id_usuario_testimonios: null,
                },
            ],
            error: null,
        })

        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

        const result = await getParticipationStats(2025)

        expect(result.success).toBe(true)
        expect(result.data).toBeDefined()
        expect(Array.isArray(result.data)).toBe(true)
        const ana = result.data?.find(s => s.user.nombre === 'Ana')
        expect(ana?.total).toBe(2)
        expect(ana?.stats.introduccion).toBe(1)
        expect(ana?.stats.ensenanza).toBe(1)
    })
})

describe('getBibleReadingStats', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
    })

    it('devuelve topReadings y readingsByType', async () => {
        const mockFrom = vi.fn().mockImplementation((table: string) => {
            if (table === 'lecturas_biblicas') {
                return {
                    select: vi.fn().mockResolvedValue({
                        data: [
                            {
                                libro: 'Salmos',
                                capitulo_inicio: 23,
                                versiculo_inicio: 1,
                                capitulo_fin: 23,
                                versiculo_fin: 6,
                                tipo_lectura: 'introduccion',
                                culto_id: 'c1',
                            },
                            {
                                libro: 'Salmos',
                                capitulo_inicio: 23,
                                versiculo_inicio: 1,
                                capitulo_fin: 23,
                                versiculo_fin: 6,
                                tipo_lectura: 'introduccion',
                                culto_id: 'c2',
                            },
                        ],
                        error: null,
                    }),
                }
            }
            if (table === 'cultos') {
                return {
                    select: vi.fn().mockReturnValue({
                        gte: vi.fn().mockReturnValue({
                            lte: vi.fn().mockResolvedValue({
                                data: [{ id: 'c1' }, { id: 'c2' }],
                                error: null,
                            }),
                        }),
                    }),
                }
            }
            return {}
        })

        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

        const result = await getBibleReadingStats(2025)

        expect(result.success).toBe(true)
        expect(result.data?.topReadings).toBeDefined()
        expect(result.data?.readingsByType).toBeDefined()
        expect(result.data?.totalLecturas).toBe(2)
        expect(result.data?.topReadings.some((r: { label: string }) => r.label.includes('Salmos 23'))).toBe(true)
    })

    it('funciona sin filtro de año', async () => {
        const mockFrom = vi.fn().mockImplementation((table: string) => {
            if (table === 'lecturas_biblicas') {
                return {
                    select: vi.fn().mockResolvedValue({
                        data: [],
                        error: null,
                    }),
                }
            }
            return {}
        })

        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from: mockFrom })

        const result = await getBibleReadingStats()

        expect(result.success).toBe(true)
        expect(result.data?.topReadings).toEqual([])
        expect(result.data?.totalLecturas).toBe(0)
    })
})
