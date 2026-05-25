import { describe, it, expect } from 'vitest'
import { translations } from './translations'

describe('traducciones Himnario (sentence case)', () => {
  it('es-ES: nav y título no están en mayúsculas completas', () => {
    expect(translations['es-ES']['nav.himnario']).toBe('Himnario')
    expect(translations['es-ES']['himnario.title']).toBe('Himnario')
    expect(translations['es-ES']['himnario.desc']).toBe('Catálogo de himnos y coros')
    expect(translations['es-ES']['nav.himnario']).not.toBe('HIMNARIO')
  })

  it('ca-ES: nav y título en formato Himnari', () => {
    expect(translations['ca-ES']['nav.himnario']).toBe('Himnari')
    expect(translations['ca-ES']['himnario.title']).toBe('Himnari')
    expect(translations['ca-ES']['himnario.desc']).toBe("Catàleg d'himnes i coros")
  })
})
