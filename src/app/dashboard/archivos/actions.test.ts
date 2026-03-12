import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSheetData } from './actions'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
  })),
}))

vi.mock('@/lib/csv-sheets', () => ({
  getSheetCSVUrl: vi.fn((id: string) => (id === 'ensenanzas' ? 'https://example.com/sheet.csv' : null)),
  fetchAndParseSheetCSV: vi.fn().mockResolvedValue([{ col1: 'a', col2: 'b' }]),
}))

describe('getSheetData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as any)
    const result = await getSheetData('ensenanzas')
    expect(result.success).toBe(false)
    expect(result.error).toBe('No autenticado')
    expect(result.data).toBeUndefined()
  })

  it('returns error for invalid source id', async () => {
    const result = await getSheetData('invalid' as any)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Origen de hoja no válido')
  })

  it('returns error when URL not configured', async () => {
    const { getSheetCSVUrl } = await import('@/lib/csv-sheets')
    vi.mocked(getSheetCSVUrl).mockReturnValueOnce(null)
    const result = await getSheetData('estudios')
    expect(result.success).toBe(false)
    expect(result.error).toBe('URL de la hoja no configurada')
  })

  it('returns data when authenticated and URL configured', async () => {
    const result = await getSheetData('ensenanzas')
    expect(result.success).toBe(true)
    expect(result.data).toEqual([{ col1: 'a', col2: 'b' }])
  })
})
