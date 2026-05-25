import { describe, it, expect } from 'vitest'
import {
  TEMAS_ALABANZA_KEYS,
  formatTemaAlabanzaLabel,
  getTemaAlabanzaOrden,
} from './temasAlabanza'

const t = (k: string) => {
  const map: Record<string, string> = {
    'alabanza.tema.prepararnos': 'Prepararnos para la alabanza y congregarnos',
    'alabanza.tema.darleGracias': 'Darle gracias a Dios',
    'alabanza.tema.buscarDones': 'Buscar los dones espirituales',
    'alabanza.tema.concentrarnos': 'Concentrarnos y dejar la timidez',
    'alabanza.tema.recibirEspiritu': '¿Cómo recibir el Espíritu Santo?',
    'alabanza.tema.serReverentes': 'Ser reverentes',
  }
  return map[k] ?? k
}

describe('temasAlabanza', () => {
  it('define exactamente 6 temas en orden', () => {
    expect(TEMAS_ALABANZA_KEYS).toHaveLength(6)
    expect(TEMAS_ALABANZA_KEYS[5]).toBe('alabanza.tema.serReverentes')
  })

  it('formatTemaAlabanzaLabel numera del 1 al 6', () => {
    expect(formatTemaAlabanzaLabel('alabanza.tema.prepararnos', t)).toBe(
      '1. Prepararnos para la alabanza y congregarnos'
    )
    expect(formatTemaAlabanzaLabel('alabanza.tema.serReverentes', t)).toBe('6. Ser reverentes')
  })

  it('getTemaAlabanzaOrden devuelve posición 1-based', () => {
    expect(getTemaAlabanzaOrden('alabanza.tema.recibirEspiritu')).toBe(5)
    expect(getTemaAlabanzaOrden('alabanza.tema.serReverentes')).toBe(6)
  })

  it('clave desconocida devuelve solo traducción sin número', () => {
    expect(formatTemaAlabanzaLabel('otro.tema', t)).toBe('otro.tema')
  })
})
