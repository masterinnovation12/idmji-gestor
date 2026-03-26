export type TemaDropdownStyle = {
    top: number
    left: number
    width: number
}

export function shouldCloseTemaDropdown(rect: DOMRect, viewportHeight: number): boolean {
    return rect.bottom < 0 || rect.top > viewportHeight
}

export function computeTemaDropdownStyle(rect: DOMRect): TemaDropdownStyle {
    return {
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 200),
    }
}
