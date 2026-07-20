/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
    computePlanoHeaderBlockLayout,
    PLANO_HEADER_HEIGHT,
    PLANO_HEADER_LOGO,
    planoHeaderBlockFits,
    planoHeaderTextRightOfLogo,
} from './laborOfrendaHeaderPlanoLayout'

describe('laborOfrendaHeaderPlanoLayout — cabecera export plano', () => {
    it('altura y logo institucional 112px', () => {
        expect(PLANO_HEADER_HEIGHT).toBe(148)
        expect(PLANO_HEADER_LOGO).toBe(112)
    })

    it('lienzo ancho (1448px): cluster centrado, textos a la derecha del logo', () => {
        const l = computePlanoHeaderBlockLayout(1448)
        expect(planoHeaderBlockFits(l)).toBe(true)
        expect(planoHeaderTextRightOfLogo(l)).toBe(true)
        expect(l.logoX).toBeGreaterThan(20)
        expect(l.textX).toBe(l.logoX + PLANO_HEADER_LOGO + 20)
    })

    it('lienzo estrecho (900px): sigue cabiendo sin solapar', () => {
        const l = computePlanoHeaderBlockLayout(900)
        expect(planoHeaderBlockFits(l)).toBe(true)
        expect(planoHeaderTextRightOfLogo(l)).toBe(true)
    })

    it('jerarquía vertical: título → fecha/turno (sin línea de iglesia)', () => {
        const l = computePlanoHeaderBlockLayout(1200)
        expect(l.subtitleY).toBeGreaterThan(l.titleY)
        expect(l.titleFontPx).toBeGreaterThan(l.subtitleFontPx)
    })

    it('tipografía título 40px, subtítulo (día) 26px', () => {
        const l = computePlanoHeaderBlockLayout(1080)
        expect(l.titleFontPx).toBe(40)
        expect(l.subtitleFontPx).toBe(26)
    })
})
