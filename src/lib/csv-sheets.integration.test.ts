/**
 * Test de integración: fetch real + parse.
 * Requiere .env.local con SHEET_*_CSV_URL.
 * Ejecutar: npm run test -- src/lib/csv-sheets.integration.test.ts
 */
import { describe, it, expect } from 'vitest'
import {
  getSheetCSVUrl,
  fetchAndParseSheetCSV,
  parseAdaptiveCSV,
  type SheetSourceId,
} from './csv-sheets'

const SOURCES: SheetSourceId[] = ['ensenanzas', 'estudios', 'instituto', 'pastorado']

describe('csv-sheets integration', () => {
  for (const id of SOURCES) {
    it(`${id}: URL configurada y fetch devuelve datos`, async () => {
      const url = getSheetCSVUrl(id)
      if (!url) {
        console.warn(`[skip] ${id}: SHEET_*_CSV_URL no configurada. Crear .env.local con las URLs.`)
        return
      }
      const data = await fetchAndParseSheetCSV(url)
      expect(Array.isArray(data)).toBe(true)
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
})
