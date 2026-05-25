/**
 * Temas oficiales para la introducción del culto de Alabanza.
 * Orden fijo 1–6 (el 6 es solo título: Ser reverentes).
 */
import type { TranslationKey } from '@/lib/i18n/types'

export const TEMAS_ALABANZA_KEYS = [
  'alabanza.tema.prepararnos',
  'alabanza.tema.darleGracias',
  'alabanza.tema.buscarDones',
  'alabanza.tema.concentrarnos',
  'alabanza.tema.recibirEspiritu',
  'alabanza.tema.serReverentes',
] as const

export type TemaAlabanzaKey = (typeof TEMAS_ALABANZA_KEYS)[number]

export function getTemaAlabanzaOrden(key: TemaAlabanzaKey): number {
  return TEMAS_ALABANZA_KEYS.indexOf(key) + 1
}

/** Etiqueta visible: "1. Prepararnos para la alabanza…" (meta_data sigue guardando solo la clave). */
export function formatTemaAlabanzaLabel(
  key: TemaAlabanzaKey | string,
  translate: (k: TranslationKey) => string
): string {
  const idx = TEMAS_ALABANZA_KEYS.indexOf(key as TemaAlabanzaKey)
  if (idx === -1) {
    return translate(key as TranslationKey)
  }
  const temaKey = TEMAS_ALABANZA_KEYS[idx]
  return `${idx + 1}. ${translate(temaKey)}`
}
