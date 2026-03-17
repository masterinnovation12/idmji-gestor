import { describe, it, expect } from 'vitest'
import { computeCultoDetails } from './computeCultoDetails'

const baseCultoEstudio = {
  id: 'culto-1',
  fecha: '2026-03-17',
  hora_inicio: '19:00',
  tipo_culto: { nombre: 'Estudio Bíblico' },
  meta_data: {},
} as any

describe('computeCultoDetails', () => {
  it('returns empty state when culto is null', () => {
    const result = computeCultoDetails(null)
    expect(result.lecturaData).toBeNull()
    expect(result.temaIntroduccionAlabanza).toBeNull()
    expect(result.estudioBiblicoData).toBeNull()
    expect(result.observacionesData).toBe('')
  })

  it('temaIntroduccionAlabanza null when culto is not Alabanza', () => {
    const culto = { ...baseCultoEstudio, tipo_culto: { nombre: 'Estudio Bíblico' } }
    const result = computeCultoDetails(culto)
    expect(result.temaIntroduccionAlabanza).toBeNull()
  })

  it('temaIntroduccionAlabanza null when meta_data has no tema', () => {
    const culto = { ...baseCultoEstudio, tipo_culto: { nombre: 'Alabanza' }, meta_data: {} }
    const result = computeCultoDetails(culto)
    expect(result.temaIntroduccionAlabanza).toBeNull()
  })

  it('temaIntroduccionAlabanza returns value when Alabanza and meta_data has tema', () => {
    const culto = {
      ...baseCultoEstudio,
      tipo_culto: { nombre: 'Alabanza' },
      meta_data: { tema_introduccion_alabanza: 'alabanza.tema.prepararnos' },
    }
    const result = computeCultoDetails(culto)
    expect(result.temaIntroduccionAlabanza).toBe('alabanza.tema.prepararnos')
  })

  it('returns estudioBiblicoData null for non-Estudio culto', () => {
    const culto = { ...baseCultoEstudio, tipo_culto: { nombre: 'Alabanza' } }
    const result = computeCultoDetails(culto)
    expect(result.estudioBiblicoData).toBeNull()
  })

  it('Estudio Bíblico without protocolo_definido nor inicio_anticipado_definido: both false', () => {
    const culto = { ...baseCultoEstudio, meta_data: {} }
    const result = computeCultoDetails(culto)
    expect(result.estudioBiblicoData).not.toBeNull()
    expect(result.estudioBiblicoData?.protocoloDefinido).toBe(false)
    expect(result.estudioBiblicoData?.inicioAnticipadoDefinido).toBe(false)
    expect(result.estudioBiblicoData?.oracionInicio).toBe(true)
    expect(result.estudioBiblicoData?.congregacionPie).toBe(false)
    expect(result.estudioBiblicoData?.inicioAnticipado).toBeNull()
  })

  it('with protocolo_definido: true returns protocoloDefinido true and values from meta_data', () => {
    const culto = {
      ...baseCultoEstudio,
      meta_data: {
        protocolo_definido: true,
        protocolo: { oracion_inicio: false, congregacion_pie: true },
      },
    }
    const result = computeCultoDetails(culto)
    expect(result.estudioBiblicoData?.protocoloDefinido).toBe(true)
    expect(result.estudioBiblicoData?.oracionInicio).toBe(false)
    expect(result.estudioBiblicoData?.congregacionPie).toBe(true)
  })

  it('with inicio_anticipado_definido and activo: true returns inicioAnticipado with horaReal', () => {
    const culto = {
      ...baseCultoEstudio,
      hora_inicio: '19:05',
      meta_data: {
        inicio_anticipado_definido: true,
        inicio_anticipado: { activo: true, minutos: 5, observaciones: '' },
      },
    }
    const result = computeCultoDetails(culto)
    expect(result.estudioBiblicoData?.inicioAnticipadoDefinido).toBe(true)
    expect(result.estudioBiblicoData?.inicioAnticipado).not.toBeNull()
    expect(result.estudioBiblicoData?.inicioAnticipado?.activo).toBe(true)
    expect(result.estudioBiblicoData?.inicioAnticipado?.minutos).toBe(5)
    expect(result.estudioBiblicoData?.inicioAnticipado?.horaReal).toBe('19:00')
  })

  it('inicio_anticipado activo with 10 min: horaReal is 18:55 when hora_inicio 19:05', () => {
    const culto = {
      ...baseCultoEstudio,
      hora_inicio: '19:05',
      meta_data: {
        inicio_anticipado_definido: true,
        inicio_anticipado: { activo: true, minutos: 10 },
      },
    }
    const result = computeCultoDetails(culto)
    expect(result.estudioBiblicoData?.inicioAnticipado?.horaReal).toBe('18:55')
    expect(result.estudioBiblicoData?.inicioAnticipado?.minutos).toBe(10)
  })

  it('inicio_anticipado activo false: inicioAnticipado is null', () => {
    const culto = {
      ...baseCultoEstudio,
      meta_data: {
        inicio_anticipado_definido: true,
        inicio_anticipado: { activo: false, minutos: 5 },
      },
    }
    const result = computeCultoDetails(culto)
    expect(result.estudioBiblicoData?.inicioAnticipadoDefinido).toBe(true)
    expect(result.estudioBiblicoData?.inicioAnticipado).toBeNull()
  })
})
