/**
 * Temas oficiales para la introducción del culto de Alabanza.
 * Basado en docs/instrucciones/alabanza-introduccion.md
 */

export const TEMAS_ALABANZA_KEYS = [
  'alabanza.tema.prepararnos',
  'alabanza.tema.darleGracias',
  'alabanza.tema.buscarDones',
  'alabanza.tema.concentrarnos',
  'alabanza.tema.recibirEspiritu',
  'alabanza.tema.serReverentes',
] as const

export type TemaAlabanzaKey = (typeof TEMAS_ALABANZA_KEYS)[number]
