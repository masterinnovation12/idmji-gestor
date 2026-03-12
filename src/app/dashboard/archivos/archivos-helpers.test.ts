import { describe, it, expect } from 'vitest'
import { pickPrimaryColumn, normalizeForMatch } from './archivos-helpers'

describe('normalizeForMatch', () => {
  it('removes accents and normalizes', () => {
    expect(normalizeForMatch('TÍTULO_ESTUDIO_BÍBLICO')).toBe('tituloestudiobiblico')
    expect(normalizeForMatch('título')).toBe('titulo')
    expect(normalizeForMatch('Enseñanza')).toBe('ensenanza')
  })
})

describe('pickPrimaryColumn', () => {
  it('picks TÍTULO_ESTUDIO_BÍBLICO for estudios when MES and DÍA are date cols', () => {
    const columns = ['MES', 'DÍA', 'TÍTULO_ESTUDIO_BÍBLICO']
    const dateCols = ['MES', 'DÍA']
    const result = pickPrimaryColumn(columns, dateCols, 'estudios')
    expect(result).toBe('TÍTULO_ESTUDIO_BÍBLICO')
  })

  it('picks titulo column for ensenanzas', () => {
    const columns = ['DÍA', 'TÍTULO_ENSEÑANZA', 'GUIANZA', 'PREDICADOR']
    const dateCols = ['DÍA']
    const result = pickPrimaryColumn(columns, dateCols, 'ensenanzas')
    expect(result).toBe('TÍTULO_ENSEÑANZA')
  })

  it('picks NOMBRE_AUDIO for instituto over CLASE', () => {
    const columns = ['CLASE', 'FECHA', 'NOMBRE_AUDIO', 'TIEMPO']
    const dateCols = ['FECHA']
    const result = pickPrimaryColumn(columns, dateCols, 'instituto')
    expect(result).toBe('NOMBRE_AUDIO')
  })

  it('picks TEMA for pastorado', () => {
    const columns = ['FECHA', 'TEMA', 'PAGINA_DE_INICIO', 'LECTORES']
    const dateCols = ['FECHA']
    const result = pickPrimaryColumn(columns, dateCols, 'pastorado')
    expect(result).toBe('TEMA')
  })

  it('falls back to first non-date column when no preference matches', () => {
    const columns = ['X', 'Y', 'Z']
    const dateCols: string[] = []
    const result = pickPrimaryColumn(columns, dateCols, 'estudios')
    expect(result).toBe('X')
  })
})
