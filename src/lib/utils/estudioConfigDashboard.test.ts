/**
 * Integración: valores guardados en meta_data → lo que muestra el dashboard (Estudio Bíblico).
 */
import { describe, it, expect } from 'vitest'
import { computeCultoDetails } from './computeCultoDetails'
import type { Culto } from '@/types/database'

const baseCulto = {
  id: 'culto-1',
  fecha: '2026-05-25',
  hora_inicio: '19:00:00',
  tipo_culto: { nombre: 'Estudio Bíblico' },
} as unknown as Culto

describe('Estudio config guardada → dashboard', () => {
  it('protocolo oración no + congregación sentada + inicio normal', () => {
    const culto = {
      ...baseCulto,
      meta_data: {
        protocolo_definido: true,
        protocolo: { oracion_inicio: false, congregacion_pie: false },
        inicio_anticipado_definido: true,
        inicio_anticipado: { activo: false, minutos: 5 },
      },
    }
    const { estudioBiblicoData } = computeCultoDetails(culto)
    expect(estudioBiblicoData?.configuracionDefinida).toBe(true)
    expect(estudioBiblicoData?.oracionInicio).toBe(false)
    expect(estudioBiblicoData?.congregacionPie).toBe(false)
    expect(estudioBiblicoData?.inicioAnticipado).toBeNull()
  })

  it('protocolo oración sí + congregación de pie', () => {
    const culto = {
      ...baseCulto,
      meta_data: {
        protocolo_definido: true,
        protocolo: { oracion_inicio: true, congregacion_pie: true },
        inicio_anticipado_definido: true,
        inicio_anticipado: { activo: false, minutos: 5 },
      },
    }
    const { estudioBiblicoData } = computeCultoDetails(culto)
    expect(estudioBiblicoData?.oracionInicio).toBe(true)
    expect(estudioBiblicoData?.congregacionPie).toBe(true)
  })
})
