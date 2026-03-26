import { describe, it, expect } from 'vitest'
import { computeTemaDropdownStyle, shouldCloseTemaDropdown } from './temaDropdownPosition'

function rect(top: number, bottom: number, left: number, width: number): DOMRect {
    return {
        x: left,
        y: top,
        top,
        bottom,
        left,
        width,
        height: bottom - top,
        right: left + width,
        toJSON: () => ({}),
    } as DOMRect
}

describe('temaDropdownPosition', () => {
    it('computeTemaDropdownStyle posiciona debajo del trigger con offset de 8px', () => {
        const style = computeTemaDropdownStyle(rect(100, 144, 32, 280))
        expect(style).toEqual({ top: 152, left: 32, width: 280 })
    })

    it('computeTemaDropdownStyle aplica ancho mínimo de 200', () => {
        const style = computeTemaDropdownStyle(rect(40, 84, 10, 120))
        expect(style.width).toBe(200)
    })

    it('shouldCloseTemaDropdown devuelve true cuando trigger queda por encima del viewport', () => {
        const result = shouldCloseTemaDropdown(rect(-80, -20, 0, 220), 800)
        expect(result).toBe(true)
    })

    it('shouldCloseTemaDropdown devuelve true cuando trigger queda por debajo del viewport', () => {
        const result = shouldCloseTemaDropdown(rect(900, 944, 0, 220), 800)
        expect(result).toBe(true)
    })

    it('shouldCloseTemaDropdown devuelve false cuando trigger sigue visible', () => {
        const result = shouldCloseTemaDropdown(rect(120, 164, 0, 220), 800)
        expect(result).toBe(false)
    })
})
