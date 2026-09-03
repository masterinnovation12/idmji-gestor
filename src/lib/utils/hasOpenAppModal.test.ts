/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { hasOpenAppModal } from './hasOpenAppModal'

describe('hasOpenAppModal', () => {
    it('es false sin diálogo', () => {
        expect(hasOpenAppModal(document)).toBe(false)
    })

    it('es true con role=dialog aria-modal', () => {
        const dialog = document.createElement('div')
        dialog.setAttribute('role', 'dialog')
        dialog.setAttribute('aria-modal', 'true')
        document.body.appendChild(dialog)
        expect(hasOpenAppModal(document)).toBe(true)
        dialog.remove()
    })
})
