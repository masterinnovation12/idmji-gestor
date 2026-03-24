export type PushClientType = 'browser' | 'pwa'

export interface PushSubscription {
    endpoint: string
    keys: {
        p256dh: string
        auth: string
    }
    /** Origen al suscribirse: pestaña vs app instalada (standalone). */
    clientType: PushClientType
}
