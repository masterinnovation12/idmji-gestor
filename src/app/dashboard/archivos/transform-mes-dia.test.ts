import { describe, it, expect } from 'vitest'

const MONTH_NAME_TO_NUM: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}

function getDateFromRow(
  row: Record<string, string>,
  _dateCol: string | null,
  mesCol: string | null,
  diaCol: string | null
): Date | null {
  if (!mesCol || !diaCol) return null
  const mesVal = (row[mesCol] ?? '').trim().toLowerCase()
  const diaVal = (row[diaCol] ?? '').trim()
  const mo = MONTH_NAME_TO_NUM[mesVal] ?? (Number.parseInt(mesVal, 10) - 1)
  const d = Number.parseInt(diaVal, 10)
  if (Number.isNaN(d) || d < 1 || d > 31) return null
  if (mo < 0 || mo > 11) return null
  const y = new Date().getFullYear()
  return new Date(y, mo, d)
}

function transformMesDiaToFecha(
  data: Record<string, string>[],
  dateInfo: { col: string | null; mesCol: string | null; diaCol: string | null }
): { data: Record<string, string>[]; columns: string[] } {
  if (!dateInfo.mesCol || !dateInfo.diaCol || data.length === 0) {
    const columns = data.length > 0 ? Object.keys(data[0]) : []
    return { data, columns }
  }

  const mesCol = dateInfo.mesCol
  const diaCol = dateInfo.diaCol
  const otherCols = Object.keys(data[0]).filter((k) => k !== mesCol && k !== diaCol)

  let lastMes = ''
  const transformed: Record<string, string>[] = []

  for (const row of data) {
    const mesRaw = (row[mesCol] ?? '').trim()
    const mes = mesRaw || lastMes
    if (mes) lastMes = mes

    const dia = (row[diaCol] ?? '').trim()
    const dt = getDateFromRow({ ...row, [mesCol]: mes }, null, mesCol, diaCol)
    const fechaStr = dt ? `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}` : ''

    const newRow: Record<string, string> = { FECHA: fechaStr }
    for (const k of otherCols) newRow[k] = row[k] ?? ''
    transformed.push(newRow)
  }

  const columns = ['FECHA', ...otherCols]
  return { data: transformed, columns }
}

describe('transformMesDiaToFecha', () => {
  it('forward-fills MES and creates FECHA column (merged cells)', () => {
    const data = [
      { MES: 'Enero', DÍA: '5', TÍTULO_ESTUDIO_BÍBLICO: 'Estudio 1' },
      { MES: '', DÍA: '12', TÍTULO_ESTUDIO_BÍBLICO: 'Estudio 2' },
      { MES: '', DÍA: '19', TÍTULO_ESTUDIO_BÍBLICO: 'Estudio 3' },
      { MES: '', DÍA: '26', TÍTULO_ESTUDIO_BÍBLICO: 'Estudio 4' },
    ]
    const dateInfo = { col: null, mesCol: 'MES', diaCol: 'DÍA' }
    const { data: out, columns } = transformMesDiaToFecha(data, dateInfo)

    expect(columns).toEqual(['FECHA', 'TÍTULO_ESTUDIO_BÍBLICO'])
    expect(out[0].FECHA).toMatch(/^\d+\/1\/\d{4}$/)
    expect(out[1].FECHA).toMatch(/^\d+\/1\/\d{4}$/)
    expect(out[2].FECHA).toMatch(/^\d+\/1\/\d{4}$/)
    expect(out[3].FECHA).toMatch(/^\d+\/1\/\d{4}$/)
    const y = new Date().getFullYear()
    expect(out[0].FECHA).toBe(`5/1/${y}`)
    expect(out[1].FECHA).toBe(`12/1/${y}`)
    expect(out[2].FECHA).toBe(`19/1/${y}`)
    expect(out[3].FECHA).toBe(`26/1/${y}`)
    expect(out[0].TÍTULO_ESTUDIO_BÍBLICO).toBe('Estudio 1')
  })

  it('returns data unchanged when no mesCol/diaCol', () => {
    const data = [{ FECHA: '5/1/2026', TÍTULO: 'X' }]
    const dateInfo = { col: 'FECHA', mesCol: null, diaCol: null }
    const { data: out, columns } = transformMesDiaToFecha(data, dateInfo)
    expect(out).toEqual(data)
    expect(columns).toEqual(['FECHA', 'TÍTULO'])
  })
})
