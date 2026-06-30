/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    computePlanoCardChrome,
    layoutPlanoNameLines,
    planoCardWidth,
    planoNameMaxWidth,
    PLANO_EXPORT_LAYER_ORDER,
} from './planoCardLayout'
import type { PlanoTarjetasLayout } from './planoTypes'

const TARJETAS: PlanoTarjetasLayout = {
    minW: 108,
    maxW: 182,
    roleFont: 16,
    nameFont: 18,
    pad: 8,
}

describe('planoCardLayout — WYSIWYG salto de línea (break-words)', () => {
    it('ancho tarjeta = 145px; área nombre = 131px (padding 7px)', () => {
        expect(planoCardWidth(TARJETAS)).toBe(145)
        expect(planoNameMaxWidth(TARJETAS)).toBe(131)
    })

    it('Carlos Galvis → una línea (cabe en tarjeta)', () => {
        expect(layoutPlanoNameLines('Carlos Galvis', TARJETAS)).toEqual(['Carlos Galvis'])
    })

    it('Edwin Castiblanco → dos líneas (regresión domingo mañana puesto 2)', () => {
        const lines = layoutPlanoNameLines('Edwin Castiblanco', TARJETAS)
        expect(lines).toHaveLength(2)
        expect(lines[0]).toBe('Edwin')
        expect(lines[1]).toBe('Castiblanco')
    })

    it('salto explícito \\n → respeta hasta 2 líneas', () => {
        expect(layoutPlanoNameLines('Ana\nLópez', TARJETAS)).toEqual(['Ana', 'López'])
    })

    it('chrome Edwin: altura nombre para 2 líneas > Carlos 1 línea', () => {
        const edwin = computePlanoCardChrome(TARJETAS, 'Edwin Castiblanco', '—')
        const carlos = computePlanoCardChrome(TARJETAS, 'Carlos Galvis', '—')
        expect(edwin.nameLines).toHaveLength(2)
        expect(carlos.nameLines).toHaveLength(1)
        expect(edwin.nameBodyH).toBeGreaterThan(carlos.nameBodyH)
        expect(edwin.totalH).toBeGreaterThan(carlos.totalH)
    })

    it('chrome usa nameFont/roleFont sin inflar', () => {
        const chrome = computePlanoCardChrome(TARJETAS, 'Carlos Galvis', '—')
        expect(chrome.nameLineH).toBe(TARJETAS.nameFont + 3)
        expect(chrome.roleH).toBe(TARJETAS.roleFont + 11)
    })

    it('placeholder si nombre vacío', () => {
        const chrome = computePlanoCardChrome(TARJETAS, '', 'Sin asignar')
        expect(chrome.nameLines).toEqual(['Sin asignar'])
    })

    it('orden capas export: figuras → tarjetas → discos', () => {
        expect(PLANO_EXPORT_LAYER_ORDER).toEqual(['figuras', 'tarjetas', 'discos'])
    })
})
