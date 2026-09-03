export function hasOpenAppModal(doc: Document = document): boolean {
    return Boolean(doc.querySelector('[role="dialog"][aria-modal="true"]'))
}
