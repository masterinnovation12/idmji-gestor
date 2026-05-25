import { describe, it, expect } from 'vitest'
import { sortInstruccionRoles } from './sortInstruccionRoles'
import type { RolInstruccionCulto } from '@/types/database'

const roles = (order: RolInstruccionCulto[]) =>
  order.map((rol) => ({ rol, titulo: rol, contenido: '', publicado: false }))

describe('sortInstruccionRoles', () => {
  it('ordena Alabanza: temas_alabanza → introduccion → finalizacion', () => {
    const input = roles(['finalizacion', 'introduccion', 'temas_alabanza'])
    const sorted = sortInstruccionRoles('Alabanza', input)
    expect(sorted.map((r) => r.rol)).toEqual(['temas_alabanza', 'introduccion', 'finalizacion'])
  })

  it('ordena otros cultos: introduccion antes que enseñanza y testimonios', () => {
    const input = roles(['testimonios', 'ensenanza', 'introduccion'])
    const sorted = sortInstruccionRoles('Enseñanza', input)
    expect(sorted.map((r) => r.rol)).toEqual(['introduccion', 'ensenanza', 'testimonios'])
  })

  it('deja temas_alabanza al final si aparece en un culto que no es Alabanza', () => {
    const input = roles(['temas_alabanza', 'introduccion', 'finalizacion'])
    const sorted = sortInstruccionRoles('Estudio Bíblico', input)
    expect(sorted.map((r) => r.rol)).toEqual(['introduccion', 'finalizacion', 'temas_alabanza'])
  })

  it('no muta el array original', () => {
    const input = roles(['finalizacion', 'temas_alabanza'])
    const copy = [...input]
    sortInstruccionRoles('Alabanza', input)
    expect(input).toEqual(copy)
  })
})
