/**
 * QA senior: propagación de secuencia tras edición manual.
 */
import { describe, it, expect } from 'vitest'
import { calcHasta } from '@/lib/utils/ofrendaEngine'
import {
    countFollowingServicios,
    propagateSecuenciasFromIndex,
} from './secuenciaPropagation'

const PLAN_CONFIG = {
    sacos_jueves: 4,
    sacos_domingo: 8,
    sacos_domingo_tarde: 4,
    secuencia_maximo: 20,
}

function mkServicios() {
    const tipos = [
        'jueves',
        'domingo',
        'domingo_tarde',
        'jueves',
        'domingo',
        'domingo_tarde',
    ] as const
    return tipos.map((dia_tipo, i) => ({
        id: `srv-${i}`,
        dia_tipo,
        posicion: i,
    }))
}

describe('countFollowingServicios', () => {
    it('cuenta servicios con posición mayor', () => {
        const servicios = mkServicios()
        expect(countFollowingServicios(servicios, 2)).toBe(3)
        expect(countFollowingServicios(servicios, 5)).toBe(0)
    })
})

describe('propagateSecuenciasFromIndex', () => {
    it('solo el servicio editado cuando startIndex es el último', () => {
        const servicios = mkServicios()
        const last = servicios.length - 1
        const { updates, punteroFin } = propagateSecuenciasFromIndex(
            servicios,
            last,
            9,
            12,
            PLAN_CONFIG,
        )
        expect(updates).toHaveLength(1)
        expect(updates[0]).toMatchObject({
            id: `srv-${last}`,
            secuencia_desde: 9,
            secuencia_hasta: 12,
            secuencia_texto: '09 al 12',
        })
        expect(punteroFin).toBe(13)
    })

    it('recalcula en orden los servicios siguientes (mismo motor que generarPlan)', () => {
        const servicios = mkServicios()
        const { updates } = propagateSecuenciasFromIndex(
            servicios,
            1,
            5,
            calcHasta(5, 8, 20),
            PLAN_CONFIG,
        )

        expect(updates).toHaveLength(5)
        expect(updates[0]).toMatchObject({
            id: 'srv-1',
            secuencia_desde: 5,
            secuencia_hasta: 12,
        })
        expect(updates[1]).toMatchObject({
            id: 'srv-2',
            secuencia_desde: 13,
            secuencia_hasta: 16,
        })
        expect(updates[2]).toMatchObject({
            id: 'srv-3',
            secuencia_desde: 17,
            secuencia_hasta: 20,
        })
        expect(updates[3]).toMatchObject({
            id: 'srv-4',
            secuencia_desde: 1,
            secuencia_hasta: 8,
        })
        expect(updates[4]).toMatchObject({
            id: 'srv-5',
            secuencia_desde: 9,
            secuencia_hasta: 12,
        })
    })

    it('respeta secuencia_maximo distinto de 20', () => {
        const servicios = mkServicios().slice(0, 3)
        const config = { ...PLAN_CONFIG, secuencia_maximo: 12 }
        const { updates } = propagateSecuenciasFromIndex(
            servicios,
            0,
            10,
            calcHasta(10, 4, 12),
            config,
        )
        expect(updates[1]).toMatchObject({
            secuencia_desde: 2,
            secuencia_hasta: 9,
        })
    })
})
