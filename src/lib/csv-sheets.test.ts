import { describe, it, expect } from 'vitest'
import { parseAdaptiveCSV } from './csv-sheets'

describe('parseAdaptiveCSV', () => {
  it('uses first non-empty row as header and skips empty rows', () => {
    const csv = [
      ',,,',
      '  ,  ,  ',
      'A,B,C',
      '1,2,3',
      ',',
      '4,5,6',
    ].join('\n')
    const result = parseAdaptiveCSV(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ A: '1', B: '2', C: '3' })
    expect(result[1]).toEqual({ A: '4', B: '5', C: '6' })
  })

  it('removes columns that are entirely empty', () => {
    const csv = 'H1,H2,H3\n1,,3\n2,,4'
    const result = parseAdaptiveCSV(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ H1: '1', H3: '3' })
    expect(result[1]).toEqual({ H1: '2', H3: '4' })
  })

  it('returns empty array for empty or only-empty-lines CSV', () => {
    expect(parseAdaptiveCSV('')).toEqual([])
    expect(parseAdaptiveCSV('\n\n')).toEqual([])
  })

  it('normalizes header spaces to underscore', () => {
    const csv = 'Col A,Col B\nx,y'
    const result = parseAdaptiveCSV(csv)
    expect(result[0]).toEqual({ 'Col_A': 'x', 'Col_B': 'y' })
  })
})
