/**
 * Bloquea el scroll del documento manteniendo la posición visual actual.
 * Evita que modales fixed queden al final de la página (bug habitual en iOS / scroll en main).
 */
let lockCount = 0
let savedScrollY = 0
let savedBodyPaddingRight = ''

function scrollbarWidth(): number {
    const w = window.innerWidth - document.documentElement.clientWidth
    // Ignora valores espurios (p. ej. happy-dom) que dispararían matchMedia en bucle.
    if (w <= 0 || w > 48) return 0
    return w
}

export function lockOfrendaDocumentScroll(): void {
    if (typeof window === 'undefined') return
    if (lockCount === 0) {
        savedScrollY = window.scrollY
        const sbw = scrollbarWidth()
        savedBodyPaddingRight = document.body.style.paddingRight
        if (sbw > 0) {
            document.body.style.paddingRight = `${sbw}px`
        }
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.top = `-${savedScrollY}px`
        document.body.style.left = '0'
        document.body.style.right = '0'
        document.body.style.width = '100%'
    }
    lockCount += 1
}

export function unlockOfrendaDocumentScroll(): void {
    if (typeof window === 'undefined') return
    if (lockCount <= 0) return
    lockCount -= 1
    if (lockCount > 0) return

    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.left = ''
    document.body.style.right = ''
    document.body.style.width = ''
    document.body.style.paddingRight = savedBodyPaddingRight
    window.scrollTo(0, savedScrollY)
}

/** Solo para tests */
export function resetOfrendaScrollLockForTests(): void {
    lockCount = 0
    savedScrollY = 0
}
