import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const mockGetUser = vi.fn()
const mockSelect = vi.fn()

beforeEach(async () => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  const chain = { order: vi.fn().mockResolvedValue({ data: [], error: null }) }
  mockSelect.mockReturnValue(chain)
  const from = vi.fn().mockReturnValue({ select: mockSelect })
  const { createClient } = await import('@/lib/supabase/server')
  ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: { getUser: mockGetUser },
    from,
  })
})

describe('getAllInstrucciones — orden Alabanza', () => {
  it('ordena roles temas_alabanza, introduccion, finalizacion tras agrupar', async () => {
    mockSelect.mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            rol: 'finalizacion',
            publicado: false,
            titulo_es: 'Fin',
            titulo_ca: 'Fin',
            contenido_es: '',
            contenido_ca: '',
            culto_types: { id: 5, nombre: 'Alabanza', color: '#00f' },
          },
          {
            id: 2,
            rol: 'temas_alabanza',
            publicado: true,
            titulo_es: 'Temas',
            titulo_ca: 'Temes',
            contenido_es: 'Contenido temas',
            contenido_ca: 'Contingut',
            culto_types: { id: 5, nombre: 'Alabanza', color: '#00f' },
          },
          {
            id: 3,
            rol: 'introduccion',
            publicado: false,
            titulo_es: 'Intro',
            titulo_ca: 'Intro',
            contenido_es: '',
            contenido_ca: '',
            culto_types: { id: 5, nombre: 'Alabanza', color: '#00f' },
          },
        ],
        error: null,
      }),
    })

    const { getAllInstrucciones } = await import('./actions')
    const result = await getAllInstrucciones('es-ES')

    expect(result.success).toBe(true)
    expect(result.data?.[0].roles.map((r) => r.rol)).toEqual([
      'temas_alabanza',
      'introduccion',
      'finalizacion',
    ])
    expect(result.data?.[0].roles[0].contenido).toBe('Contenido temas')
  })
})
