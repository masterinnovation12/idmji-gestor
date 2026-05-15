/**
 * Test de integración: parse + fetch con red simulada.
 * El fetch global se mockea para que no dependa de Google Sheets (500/timeout en CI).
 * Para probar URLs reales, ejecutar manualmente con RUN_CSV_LIVE=1 o quitar el mock.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import {
  getSheetCSVUrl,
  fetchAndParseSheetCSV,
  parseAdaptiveCSV,
  type SheetSourceId,
} from './csv-sheets'

const SOURCES: SheetSourceId[] = ['ensenanzas', 'estudios', 'instituto', 'pastorado']

const SAMPLE_CSV_BODY = 'MES,DÍA,TÍTULO,NOTAS\nEnero,1,Fila de prueba,\n'

describe('csv-sheets integration', () => {
  beforeAll(() => {
    if (process.env.RUN_CSV_LIVE === '1') return
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(SAMPLE_CSV_BODY, {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        })
      })
    )
  })

  afterAll(() => {
    if (process.env.RUN_CSV_LIVE === '1') return
    vi.unstubAllGlobals()
  })

  for (const id of SOURCES) {
    it(`${id}: URL configurada y fetch devuelve datos`, async () => {
      const url = getSheetCSVUrl(id)
      if (!url) {
        console.warn(`[skip] ${id}: SHEET_*_CSV_URL no configurada. Crear .env.local con las URLs.`)
        return
      }
      const { data, meta } = await fetchAndParseSheetCSV(url)
      expect(Array.isArray(data)).toBe(true)
      expect(meta.stale).toBe(false)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0]).toBeDefined()
      const keys = Object.keys(data[0])
      expect(keys.length).toBeGreaterThan(0)
      expect(keys.some((k) => k && !k.startsWith('column_'))).toBe(true)
    })
  }

  it('parseAdaptiveCSV: cabecera en fila 3 (Enseñanzas)', () => {
    const csv = [
      ',,,',
      ',  ,  ,',
      'DÍA,N.º,TÍTULO ENSEÑANZA,,,GUIANZA,PREDICADOR',
      '1/1/2026,,El reposo,,,Andrés,Carlos',
    ].join('\n')
    const result = parseAdaptiveCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0]['DÍA']).toBe('1/1/2026')
    expect(result[0]['TÍTULO_ENSEÑANZA']).toBe('El reposo')
  })

  it('parseAdaptiveCSV: cabecera con filas vacías al inicio (Estudios)', () => {
    const csv = [
      ',,,',
      ',,,',
      'MES,DÍA,TÍTULO,NOTAS',
      'Enero,5,Estudio 1,',
      'Enero,12,Estudio 2,',
    ].join('\n')
    const result = parseAdaptiveCSV(csv)
    expect(result).toHaveLength(2)
    expect(result[0]['MES']).toBe('Enero')
    expect(result[0]['TÍTULO']).toBe('Estudio 1')
  })

  it(
    'fetchAndParseSheetCSV: usa variante fallback de URL pub cuando la primaria falla con 500',
    async () => {
    const originalFetch = globalThis.fetch
    const calls: string[] = []
    const csvOk = 'MES,DÍA,TÍTULO\nENERO,5,Estudio prueba\n'

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        let url = ''
        if (typeof input === 'string') {
          url = input
        } else if (input instanceof URL) {
          url = input.toString()
        } else {
          url = input.url
        }
        calls.push(url)
        // Falla en URL base, funciona en variante single=true
        if (url.includes('/pub?output=csv') && !url.includes('single=true')) {
          return new Response('<html>500</html>', { status: 500, statusText: 'Internal Server Error' })
        }
        if (url.includes('output=csv') && url.includes('single=true')) {
          return new Response(csvOk, {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'text/csv; charset=utf-8' },
          })
        }
        return new Response('<html>500</html>', { status: 500, statusText: 'Internal Server Error' })
      })
    )

    try {
      const { data, meta } = await fetchAndParseSheetCSV(
        'https://docs.google.com/spreadsheets/d/e/abc123/pub?output=csv'
      )
      expect(meta.stale).toBe(false)
      expect(data.length).toBe(1)
      expect(data[0]['TÍTULO']).toBe('Estudio prueba')
      expect(calls.some((u) => u.includes('single=true'))).toBe(true)
    } finally {
      vi.stubGlobal('fetch', originalFetch)
    }
  },
  20_000
  )
})
