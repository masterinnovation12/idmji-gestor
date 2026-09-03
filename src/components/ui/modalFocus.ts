/**
 * Foco inicial y ciclo Tab de los modales.
 * El botón cerrar va primero en el DOM: no debe robar el teclado
 * (si no, escribir "Mateo" no llega al buscador de lecturas).
 */
const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function getModalFocusables(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
        if (el.getAttribute('aria-hidden') === 'true') return false
        if (el.hasAttribute('data-modal-close')) return true
        return true
    })
}

export function getModalInitialFocus(root: HTMLElement): HTMLElement | null {
    const marked = root.querySelector<HTMLElement>('[data-modal-autofocus]:not([disabled])')
    if (marked) return marked
    const input = root.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled])',
    )
    if (input) return input
    const focusables = getModalFocusables(root).filter((el) => !el.hasAttribute('data-modal-close'))
    return focusables[0] ?? getModalFocusables(root)[0] ?? null
}

export function trapModalTab(event: KeyboardEvent, root: HTMLElement): void {
    if (event.key !== 'Tab') return
    const nodes = getModalFocusables(root)
    if (nodes.length === 0) {
        event.preventDefault()
        return
    }
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    const active = document.activeElement
    if (!root.contains(active)) {
        event.preventDefault()
        first.focus()
        return
    }
    if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
        return
    }
    if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
    }
}
