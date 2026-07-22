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

// La resolución de sede activa se prueba aparte; aquí se neutraliza para
// centrar el test en la lógica de lecturas (sin sede → sin filtro extra).
vi.mock('@/lib/sede/activeSede', () => ({
  getActiveSedeIdForCurrentUser: vi.fn().mockResolvedValue(null),
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

describe('checkCapituloEnHistorial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve found false si no hay coincidencias', async () => {
    createClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })

    const { checkCapituloEnHistorial } = await import('./actions')
    const result = await checkCapituloEnHistorial('Juan', 99)
    expect(result).toEqual({ found: false, totalCount: 0, previousCount: 0 })
  })

  it('devuelve la lectura más reciente y cuenta previas excluyendo culto actual', async () => {
    const rows = [
      {
        id: 'r-old',
        culto_id: 'culto-old',
        tipo_lectura: 'introduccion',
        libro: 'Juan',
        capitulo_inicio: 3,
        capitulo_fin: 3,
        versiculo_inicio: 1,
        versiculo_fin: 5,
        created_at: '2025-01-01T00:00:00Z',
        cultos: { fecha: '2025-01-10', hora_inicio: '10:00', tipo_culto: { nombre: 'Alabanza' } },
        lector: { nombre: 'Pedro', apellidos: 'López' },
      },
      {
        id: 'r-current',
        culto_id: 'culto-actual',
        tipo_lectura: 'introduccion',
        libro: 'Juan',
        capitulo_inicio: 3,
        capitulo_fin: 3,
        versiculo_inicio: 16,
        versiculo_fin: 16,
        created_at: '2025-02-01T00:00:00Z',
        cultos: { fecha: '2025-02-15', hora_inicio: null, tipo_culto: { nombre: 'Estudio' } },
        lector: { nombre: 'Ana', apellidos: 'García' },
      },
    ]

    createClientMock.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: rows, error: null }),
        })),
      })),
    })

    const { checkCapituloEnHistorial } = await import('./actions')
    const result = await checkCapituloEnHistorial('Juan', 3, { cultoId: 'culto-actual' })

    expect(result.found).toBe(true)
    if (result.found) {
      expect(result.mostRecent?.cultoId).toBe('culto-actual')
      expect(result.totalCount).toBe(2)
      expect(result.previousCount).toBe(1)
      expect(result.mostRecent?.pasaje).toContain('Juan 3')
    }
  })
})
