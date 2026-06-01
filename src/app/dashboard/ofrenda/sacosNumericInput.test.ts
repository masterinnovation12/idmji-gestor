import { describe, it, expect } from 'vitest'
import { commitSacosDraft, isSacosDraftAllowed } from './sacosNumericInput'

describe('sacosNumericInput', () => {
    describe('isSacosDraftAllowed', () => {
        it('permite vacío y dígitos parciales', () => {
            expect(isSacosDraftAllowed('', 2)).toBe(true)
            expect(isSacosDraftAllowed('1', 2)).toBe(true)
            expect(isSacosDraftAllowed('12', 2)).toBe(true)
        })

        it('rechaza letras y más dígitos de los permitidos', () => {
            expect(isSacosDraftAllowed('4a', 2)).toBe(false)
            expect(isSacosDraftAllowed('123', 2)).toBe(false)
        })
    })

    describe('commitSacosDraft', () => {
        it('acota al rango y trata vacío como mínimo', () => {
            expect(commitSacosDraft('', 1, 20)).toBe(1)
            expect(commitSacosDraft('6', 1, 20)).toBe(6)
            expect(commitSacosDraft('99', 1, 20)).toBe(20)
            expect(commitSacosDraft('0', 1, 20)).toBe(1)
        })

        it('permite escribir 12 paso a paso (borrador intermedio)', () => {
            expect(isSacosDraftAllowed('1', 2)).toBe(true)
            expect(commitSacosDraft('1', 1, 20)).toBe(1)
            expect(commitSacosDraft('12', 1, 20)).toBe(12)
        })
    })
})
