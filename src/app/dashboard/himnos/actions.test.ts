/**
 * Tests para autoFillEnsenanzaSequence - secuencia mismo día
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { autoFillEnsenanzaSequence } from './actions'

const today = '2025-03-18'
const cultoId = 'culto-ensenanza-1'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn((table: string) => {
        if (table === 'cultos') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  ilike: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [{ id: cultoId, fecha: today }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'app_config') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn()
                  .mockResolvedValueOnce({ data: { value: { id: 1, date: today } }, error: null })
                  .mockResolvedValueOnce({ data: { value: { id: 10, date: '2025-03-10' } }, error: null }),
              }),
            }),
            upsert: vi.fn().mockReturnValue({ onConflict: vi.fn().mockResolvedValue({ error: null }) }),
          }
        }
        if (table === 'plan_himnos_coros') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { tipo: 'himno', himno_id: 1, coro_id: null, orden: 1 },
                  ],
                  error: null,
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        if (table === 'himnos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
              }),
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 2 }, { id: 3 }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'coros') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 10 }, error: null }),
              }),
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 11 }, { id: 12 }, { id: 13 }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    })
  ),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('autoFillEnsenanzaSequence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('añade himnos y coros faltantes en mismo día', async () => {
    const result = await autoFillEnsenanzaSequence(new Date(today))

    expect(result.data?.count).toBeGreaterThanOrEqual(1)
    expect(result.error).toBeUndefined()
  })

  it('ejecuta insert aunque cultosToClear esté vacío', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const mockInsertFn = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(createClient).mockResolvedValueOnce({
      from: vi.fn((table: string) => {
        if (table === 'plan_himnos_coros') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ tipo: 'himno', himno_id: 1, coro_id: null, orden: 1 }],
                  error: null,
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            }),
            insert: mockInsertFn,
          }
        }
        if (table === 'cultos') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  ilike: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [{ id: cultoId, fecha: today }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'app_config') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn()
                  .mockResolvedValueOnce({ data: { value: { id: 1, date: today } }, error: null })
                  .mockResolvedValueOnce({ data: { value: { id: 10, date: '2025-03-10' } }, error: null }),
              }),
            }),
            upsert: vi.fn().mockReturnValue({ onConflict: vi.fn().mockResolvedValue({ error: null }) }),
          }
        }
        if (table === 'himnos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
              }),
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 2 }, { id: 3 }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'coros') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 10 }, error: null }),
              }),
              gt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 11 }, { id: 12 }, { id: 13 }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    } as any)

    const result = await autoFillEnsenanzaSequence(new Date(today))

    expect(result.error).toBeUndefined()
    expect(mockInsertFn).toHaveBeenCalled()
  })
})
