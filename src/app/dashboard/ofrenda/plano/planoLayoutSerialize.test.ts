import { describe, it, expect } from 'vitest'
import { getPlanoVista } from './planoData'
import { vistaResueltaToElementos } from './planoLayoutSerialize'

describe('vistaResueltaToElementos', () => {
    it('no incluye nombres en posiciones', () => {
        const data = getPlanoVista('2d', 'sacos_8')
        const withNames = {
            ...data,
            posiciones: data.posiciones.map((p, i) => ({
                ...p,
                nombre: i === 0 ? 'Test User' : '',
            })),
        }
        const elementos = vistaResueltaToElementos(withNames)
        expect(elementos.posiciones.every(p => !('nombre' in p))).toBe(true)
        expect(elementos.schemaVersion).toBe(3)
    })

    it('3d conserva fondoSrc relativo', () => {
        const data = getPlanoVista('3d', 'sacos_4')
        const elementos = vistaResueltaToElementos(data)
        expect(elementos.fondoSrc).toMatch(/plano-3d-sacos-4/)
    })
})
