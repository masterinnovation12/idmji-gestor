/**
 * Tests para getInstruccionCulto (backend/lógica).
 * Verifica: respuesta correcta según idioma, culto_type_id inválido, rol sin datos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getInstruccionCulto } from './actions'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

const mockMaybeSingle = vi.fn()

beforeEach(async () => {
  vi.clearAllMocks()
  const chain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: mockMaybeSingle,
  }
  const select = vi.fn().mockReturnValue(chain)
  const from = vi.fn().mockReturnValue({ select })
  const { createClient } = await import('@/lib/supabase/server')
  ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from })
})

describe('getInstruccionCulto', () => {
  it('devuelve título y contenido en español cuando language es es-ES', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        titulo_es: 'Intro Alabanza',
        titulo_ca: 'Intro Alabança',
        contenido_es: 'Texto ES',
        contenido_ca: 'Text CA',
        publicado: true,
      },
      error: null,
    })

    const result = await getInstruccionCulto(5, 'introduccion', 'es-ES')

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ titulo: 'Intro Alabanza', contenido: 'Texto ES' })
  })

  it('devuelve título y contenido en catalán cuando language es ca-ES', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        titulo_es: 'Intro Alabanza',
        titulo_ca: 'Intro Alabança',
        contenido_es: 'Texto ES',
        contenido_ca: 'Text CA',
        publicado: true,
      },
      error: null,
    })

    const result = await getInstruccionCulto(5, 'introduccion', 'ca-ES')

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ titulo: 'Intro Alabança', contenido: 'Text CA' })
  })

  it('devuelve success true y data undefined cuando no hay fila', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const result = await getInstruccionCulto(5, 'ensenanza', 'es-ES')

    expect(result.success).toBe(true)
    expect(result.data).toBeUndefined()
  })

  it('devuelve error cuando culto_type_id es inválido (string no numérico)', async () => {
    const result = await getInstruccionCulto('abc', 'introduccion', 'es-ES')

    expect(result.success).toBe(false)
    expect(result.error).toContain('inválido')
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })

  it('devuelve contenido vacío si publicado es false aunque haya texto en BD', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        titulo_es: 'Intro',
        titulo_ca: 'Intro',
        contenido_es: 'No debe mostrarse',
        contenido_ca: 'No',
        publicado: false,
      },
      error: null,
    })

    const result = await getInstruccionCulto(5, 'introduccion', 'es-ES')

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ titulo: 'Intro', contenido: '' })
  })

  it('lee temas_alabanza cuando está publicado', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        titulo_es: 'Temas alabanza',
        titulo_ca: 'Temes',
        contenido_es: 'Los 6 temas',
        contenido_ca: 'Els 6 temes',
        publicado: true,
      },
      error: null,
    })

    const result = await getInstruccionCulto(5, 'temas_alabanza', 'es-ES')

    expect(result.success).toBe(true)
    expect(result.data?.contenido).toBe('Los 6 temas')
  })

  it('acepta culto_type_id como string numérico', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { titulo_es: 'T', titulo_ca: 'T', contenido_es: 'C', contenido_ca: 'C' },
      error: null,
    })

    const result = await getInstruccionCulto('6', 'testimonios', 'es-ES')

    expect(result.success).toBe(true)
    expect(result.data?.titulo).toBe('T')
  })
})
