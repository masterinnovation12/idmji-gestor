/**
 * Selecciona qué suscripciones deben recibir el push:
 * si existe al menos una PWA, solo esas; si no, solo navegador.
 */
export type SubscriptionRowForSend = {
    client_type?: string | null
    endpoint: string
    p256dh: string
    auth: string
}

export function selectSubscriptionsForSend<T extends SubscriptionRowForSend>(rows: T[]): T[] {
    if (!rows.length) return []
    const hasPwa = rows.some((r) => r.client_type === 'pwa')
    if (hasPwa) return rows.filter((r) => r.client_type === 'pwa')
    return rows.filter((r) => r.client_type === 'browser' || r.client_type == null || r.client_type === '')
}
