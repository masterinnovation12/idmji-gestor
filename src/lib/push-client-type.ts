import type { PushClientType } from '@/types/notifications'

/**
 * Detecta si el documento corre como PWA instalada (standalone) o en navegador.
 * Solo tiene sentido en el cliente.
 */
export function getPushClientType(): PushClientType {
    if (typeof window === 'undefined') return 'browser'
    const nav = window.navigator as Navigator & { standalone?: boolean }
    if (nav.standalone === true) return 'pwa'
    try {
        if (window.matchMedia('(display-mode: standalone)').matches) return 'pwa'
    } catch {
        /* noop */
    }
    return 'browser'
}
