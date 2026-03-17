import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateCultoProtocol, updateInicioAnticipado, updateTemaIntroduccionAlabanza } from './actions'

const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
const mockSingle = vi.fn().mockResolvedValue({ data: { meta_data: {} } })
const mockSelectEq = vi.fn().mockReturnValue({ single: mockSingle })

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: mockSelectEq,
        }),
        update: mockUpdate,
      })),
    })
  ),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('updateCultoProtocol', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingle.mockResolvedValue({ data: { meta_data: {} } })
  })

  it('includes protocolo_definido true in meta_data update', async () => {
    const result = await updateCultoProtocol('culto-1', {
      oracion_inicio: true,
      congregacion_pie: false,
    })

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        meta_data: expect.objectContaining({
          protocolo_definido: true,
          protocolo: { oracion_inicio: true, congregacion_pie: false },
        }),
      })
    )
  })
})

describe('updateInicioAnticipado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingle.mockResolvedValue({ data: { meta_data: {} } })
  })

  it('includes inicio_anticipado_definido true in meta_data update', async () => {
    const result = await updateInicioAnticipado('culto-1', {
      activo: true,
      minutos: 5,
      observaciones: '',
    })

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        meta_data: expect.objectContaining({
          inicio_anticipado_definido: true,
          inicio_anticipado: expect.objectContaining({
            activo: true,
            minutos: 5,
          }),
        }),
      })
    )
  })
})

describe('updateTemaIntroduccionAlabanza', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSingle.mockResolvedValue({ data: { meta_data: {} } })
  })

  it('includes tema_introduccion_alabanza in meta_data when temaKey provided', async () => {
    const result = await updateTemaIntroduccionAlabanza('culto-1', 'alabanza.tema.prepararnos')

    expect(result).toEqual({ success: true })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        meta_data: expect.objectContaining({
          tema_introduccion_alabanza: 'alabanza.tema.prepararnos',
        }),
      })
    )
  })

  it('removes tema_introduccion_alabanza from meta_data when temaKey is null', async () => {
    mockSingle.mockResolvedValue({
      data: {
        meta_data: {
          tema_introduccion_alabanza: 'alabanza.tema.prepararnos',
          observaciones: 'test',
        },
      },
    })

    const result = await updateTemaIntroduccionAlabanza('culto-1', null)

    expect(result).toEqual({ success: true })
    const updateCall = mockUpdate.mock.calls[0][0]
    expect(updateCall.meta_data).not.toHaveProperty('tema_introduccion_alabanza')
    expect(updateCall.meta_data.observaciones).toBe('test')
  })
})
