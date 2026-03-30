/**
 * Test del API route /api/archivos.
 * Verifica que con auth mockeada devuelve datos para cada source.
 * Las hojas CSV reales no se llaman: se mockea csv-sheets para CI/red estable.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/csv-sheets', () => ({
  getSheetCSVUrl: vi.fn((sourceId: string) => `https://example.com/mock-${sourceId}.csv`),
  fetchAndParseSheetCSV: vi.fn(async () => ({
    data: [{ DIA: '1', TITULO: 'Fila de prueba' }],
    meta: { stale: false },
  })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: 'test-user' } },
            error: null,
          }),
      },
    })
  ),
}))

describe('GET /api/archivos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const sources = ['ensenanzas', 'estudios', 'instituto', 'pastorado'] as const

  for (const source of sources) {
    it(`${source}: devuelve success y data cuando hay URL configurada`, async () => {
      const req = new Request(`http://localhost/api/archivos?source=${source}`)
      const res = await GET(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.stale).toBe(false)
      expect(Array.isArray(json.data)).toBe(true)
      expect(json.data.length).toBeGreaterThan(0)
      const firstRow = json.data[0]
      const keys = Object.keys(firstRow)
      expect(keys.length).toBeGreaterThan(0)
      expect(keys.some((k) => k && !k.startsWith('column_'))).toBe(true)
    })
  }

  it('sin auth: devuelve 401', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    } as any)

    const req = new Request('http://localhost/api/archivos?source=ensenanzas')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toContain('autenticado')
  })

  it('source inválido: devuelve 400', async () => {
    const req = new Request('http://localhost/api/archivos?source=invalid')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })
})
