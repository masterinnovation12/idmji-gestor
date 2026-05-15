import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidatePathMock = vi.fn()
const noStoreMock = vi.fn()
const createClientMock = vi.fn()
let ops: { insert: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> } | null = null

let mockCultoIntro: string | null = null
let mockCultoFinal: string | null = null

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  unstable_noStore: noStoreMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

function buildEqChain() {
  const filters: Record<string, unknown> = {}
  const chain: Record<string, unknown> = {}
  chain.eq = vi.fn((field: string, value: unknown) => {
    filters[field] = value
    return chain
  })
  chain.neq = vi.fn((field: string, value: unknown) => {
    filters[`neq:${field}`] = value
    return chain
  })
  chain.limit = vi.fn(() => chain)
  chain.single = vi.fn().mockImplementation(async () => {
    if (filters.id) return { data: { id: filters.id } }
    return { data: null }
  })
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  return chain
}

function buildSupabaseMock() {
  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'new-reading' }, error: null }),
    }),
  })
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'updated-reading' }, error: null }),
      }),
    }),
  })
  ops = { insert, update }

  return {
    from: vi.fn((table: string) => {
      if (table === 'cultos') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id_usuario_intro: mockCultoIntro,
                  id_usuario_finalizacion: mockCultoFinal,
                },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'lecturas_biblicas') {
        return {
          select: vi.fn(() => buildEqChain()),
          insert,
          update,
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
    mockCultoIntro = null
    mockCultoFinal = null
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

  it('saveLectura inserta una nueva lectura cuando no hay lecturaId', async () => {
    const { saveLectura } = await import('./actions')
    await saveLectura('culto-1', 'introduccion', 'Jueces', 1, 1, 1, 1, 'user-1')
    expect(ops?.insert).toHaveBeenCalledTimes(1)
    expect(ops?.update).not.toHaveBeenCalled()
  })

  it('saveLectura actualiza lectura existente cuando llega lecturaId', async () => {
    const { saveLectura } = await import('./actions')
    await saveLectura('culto-1', 'introduccion', 'Jueces', 1, 5, 1, 7, 'user-1', 'reading-123')
    expect(ops?.update).toHaveBeenCalledTimes(1)
  })

  it('saveLectura no falla al editar cambiando de libro', async () => {
    const { saveLectura } = await import('./actions')
    const result = await saveLectura('culto-1', 'introduccion', 'Salmos', 23, 1, 23, 2, 'user-1', 'reading-123')
    expect(result).toMatchObject({ success: true })
  })

  it('introducción: aunque guarde Jeffrey, id_usuario_lector queda el del intro (Andres)', async () => {
    mockCultoIntro = 'uuid-andres-intro'
    const { saveLectura } = await import('./actions')
    await saveLectura('culto-1', 'introduccion', 'Rut', 2, 1, 2, 5, 'uuid-jeffrey-registrador')
    expect(ops?.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id_usuario_lector: 'uuid-andres-intro' })
    )
  })

  it('saveLectura usa hermano de finalización para tipo finalizacion', async () => {
    mockCultoFinal = 'hermano-final-uuid'
    const { saveLectura } = await import('./actions')
    await saveLectura('culto-1', 'finalizacion', 'Juan', 1, 1, null, null, 'registrador-uuid')
    expect(ops?.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id_usuario_lector: 'hermano-final-uuid', tipo_lectura: 'finalizacion' })
    )
  })

  it('confirmRepeatedLectura aplica la misma resolución de lector', async () => {
    mockCultoIntro = 'intro-uuid'
    const { confirmRepeatedLectura } = await import('./actions')
    await confirmRepeatedLectura('culto-2', 'introduccion', 'Salmos', 1, 1, 1, 1, 'otro-uuid', 'orig-1')
    expect(ops?.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id_usuario_lector: 'intro-uuid', es_repetida: true })
    )
  })
})
