/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    lockOfrendaDocumentScroll,
    unlockOfrendaDocumentScroll,
    resetOfrendaScrollLockForTests,
} from './ofrendaScrollLock'

describe('ofrendaScrollLock', () => {
    beforeEach(() => {
        resetOfrendaScrollLockForTests()
        document.documentElement.style.overflow = ''
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.paddingRight = ''
    })

    afterEach(() => {
        resetOfrendaScrollLockForTests()
        document.documentElement.style.overflow = ''
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.paddingRight = ''
    })

    it('fija el body y conserva scrollY', () => {
        window.scrollTo(0, 420)
        lockOfrendaDocumentScroll()

        expect(document.body.style.position).toBe('fixed')
        expect(document.body.style.top).toBe('-420px')
        expect(document.documentElement.style.overflow).toBe('hidden')
    })

    it('restaura scroll al desbloquear (ref-count)', () => {
        const scrollTo = vi.spyOn(window, 'scrollTo')
        window.scrollTo(0, 300)
        lockOfrendaDocumentScroll()
        lockOfrendaDocumentScroll()
        unlockOfrendaDocumentScroll()
        expect(document.body.style.position).toBe('fixed')

        unlockOfrendaDocumentScroll()
        expect(document.body.style.position).toBe('')
        expect(scrollTo).toHaveBeenCalledWith(0, 300)
        scrollTo.mockRestore()
    })
})
