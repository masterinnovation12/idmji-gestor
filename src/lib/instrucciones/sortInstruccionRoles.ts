import type { RolInstruccionCulto } from '@/types/database'

export type RolInstruccionSortable = { rol: RolInstruccionCulto }

const ALABANZA_ORDER: RolInstruccionCulto[] = [
  'temas_alabanza',
  'introduccion',
  'finalizacion',
]

const DEFAULT_ORDER: RolInstruccionCulto[] = [
  'introduccion',
  'ensenanza',
  'testimonios',
  'finalizacion',
]

function orderForCulto(nombreCulto: string): RolInstruccionCulto[] {
  if (nombreCulto.toLowerCase().includes('alabanza')) {
    return ALABANZA_ORDER
  }
  return DEFAULT_ORDER
}

export function sortInstruccionRoles<T extends RolInstruccionSortable>(
  nombreCulto: string,
  roles: T[]
): T[] {
  const order = orderForCulto(nombreCulto)
  return [...roles].sort((a, b) => {
    const ia = order.indexOf(a.rol)
    const ib = order.indexOf(b.rol)
    const rankA = ia === -1 ? order.length + 1 : ia
    const rankB = ib === -1 ? order.length + 1 : ib
    return rankA - rankB
  })
}
