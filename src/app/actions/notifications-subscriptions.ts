/**
 * Selecciona suscripciones que reciben push: solo PWA instalada (standalone).
 * Las filas solo-navegador quedan en BD pero no reciben envíos.
 */
export type SubscriptionRowForSend = {
    client_type?: string | null
    endpoint: string
    p256dh: string
    auth: string
}

export function selectSubscriptionsForSend<T extends SubscriptionRowForSend>(rows: T[]): T[] {
    if (!rows.length) return []
    return rows.filter((r) => r.client_type === 'pwa')
}
