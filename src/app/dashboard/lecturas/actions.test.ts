import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePathMock = vi.fn()
const noStoreMock = vi.fn()
const createClientMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  unstable_noStore: noStoreMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

function buildSupabaseMock() {
  const buildEqChain = () => {
    const chain: Record<string, any> = {}
    chain.eq = vi.fn(() => chain)
    chain.limit = vi.fn(() => chain)
    chain.single = vi.fn().mockResolvedValue({ data: null })
    return chain
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'lecturas_biblicas') {
        return {
          select: vi.fn((columns?: string) => {
            if (columns === 'id') {
              return buildEqChain()
            }
            return buildEqChain()
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'new-reading' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'updated-reading' }, error: null }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      return {}
    }),
  }
}

describe('lecturas actions revalidate dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createClientMock.mockResolvedValue(buildSupabaseMock())
  })

  it('saveLectura revalida dashboard y culto', async () => {
    const { saveLectura } = await import('./actions')
    await saveLectura('culto-1', 'introduccion', 'Génesis', 1, 1, null, null, 'user-1')
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard/cultos/culto-1')
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard')
  })

  it('confirmRepeatedLectura revalida dashboard y culto', async () => {
    const { confirmRepeatedLectura } = await import('./actions')
    await confirmRepeatedLectura('culto-2', 'finalizacion', 'Juan', 3, 16, null, null, 'user-1', 'orig-1')
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard/cultos/culto-2')
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard')
  })

  it('deleteLectura revalida dashboard y culto cuando llega cultoId', async () => {
    const { deleteLectura } = await import('./actions')
    await deleteLectura('reading-1', 'culto-3')
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard/cultos/culto-3')
    expect(revalidatePathMock).toHaveBeenCalledWith('/dashboard')
  })
})
