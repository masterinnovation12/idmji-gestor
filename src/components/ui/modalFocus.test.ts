/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest'
import { getModalFocusables, getModalInitialFocus, trapModalTab } from './modalFocus'

function mount(html: string): HTMLElement {
    const root = document.createElement('div')
    root.innerHTML = html
    document.body.appendChild(root)
    return root
}

describe('getModalInitialFocus', () => {
    it('prioriza data-modal-autofocus sobre el botón cerrar', () => {
        const root = mount(`
            <button data-modal-close type="button">cerrar</button>
            <input data-modal-autofocus placeholder="buscar" />
            <button type="button">guardar</button>
        `)
        expect(getModalInitialFocus(root)?.getAttribute('placeholder')).toBe('buscar')
    })

    it('si no hay marca, usa el primer input (no el cerrar)', () => {
        const root = mount(`
            <button data-modal-close type="button">cerrar</button>
            <input placeholder="capitulo" />
        `)
        expect(getModalInitialFocus(root)?.getAttribute('placeholder')).toBe('capitulo')
    })
})

describe('trapModalTab', () => {
    it('con Tab al final vuelve al primero', () => {
        const root = mount(`
            <button id="a" type="button">a</button>
            <button id="b" type="button">b</button>
        `)
        const a = root.querySelector('#a') as HTMLButtonElement
        const b = root.querySelector('#b') as HTMLButtonElement
        b.focus()
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
        const prevent = vi.spyOn(event, 'preventDefault')
        trapModalTab(event, root)
        expect(prevent).toHaveBeenCalled()
        expect(document.activeElement).toBe(a)
    })
})

describe('getModalFocusables', () => {
    it('incluye inputs y botones habilitados', () => {
        const root = mount(`
            <button type="button">ok</button>
            <input />
            <input disabled />
        `)
        expect(getModalFocusables(root)).toHaveLength(2)
    })
})
