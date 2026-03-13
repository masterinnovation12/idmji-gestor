/**
 * Tests unitarios para acciones de notificaciones push.
 * Verifica: subscribeToPush (sin auth), sendTestNotification (sin suscripciones),
 * sendNotificationToUser (sin suscripciones).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    sendNotificationToUser,
} from './notifications'

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}))

const mockSendNotification = vi.fn()
vi.mock('web-push', () => ({
    default: {
        setVapidDetails: vi.fn(),
        sendNotification: mockSendNotification,
    },
}))

function mockFrom(table: string, options: { subscriptions?: unknown[]; profileLang?: string; upsertError?: Error; deleteError?: Error }) {
    if (table === 'user_subscriptions') {
        const subs = options.subscriptions ?? []
        const eqForDelete = vi.fn().mockResolvedValue({ error: options.deleteError ?? null })
        return {
            upsert: vi.fn().mockResolvedValue({ error: options.upsertError ?? null }),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
                then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: subs, error: null }),
                eq: eqForDelete,
            })),
            delete: vi.fn().mockReturnThis(),
        }
    }
    if (table === 'profiles') {
        return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: { language: options.profileLang ?? 'es-ES' },
                error: null,
            }),
        }
    }
    return {}
}

describe('subscribeToPush', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('devuelve success cuando el usuario está autenticado y upsert ok', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: (t: string) => mockFrom(t, {}),
        })
        const result = await subscribeToPush({
            endpoint: 'https://fcm.googleapis.com/fcm/send/xxx',
            keys: { p256dh: 'key1', auth: 'key2' },
        })
        expect(result.success).toBe(true)
    })

    it('devuelve error cuando no hay usuario', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        })
        const result = await subscribeToPush({
            endpoint: 'https://example.com',
            keys: { p256dh: 'k', auth: 'a' },
        })
        expect(result.success).toBe(false)
        expect(result.error).toContain('autenticado')
    })
})

describe('unsubscribeFromPush', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('devuelve success cuando delete ok', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: (t: string) => mockFrom(t, {}),
        })
        const result = await unsubscribeFromPush('https://endpoint.example')
        expect(result.success).toBe(true)
    })
})

describe('sendTestNotification', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'x'.repeat(60)
        process.env.VAPID_PRIVATE_KEY = 'y'
        process.env.VAPID_SUBJECT = 'mailto:test@test.com'
        mockSendNotification.mockResolvedValue(undefined)
    })

    it('devuelve error cuando el usuario no tiene suscripciones', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: (t: string) => mockFrom(t, { subscriptions: [] }),
        })
        const result = await sendTestNotification()
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
    })
})

describe('sendNotificationToUser', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'x'.repeat(60)
        process.env.VAPID_PRIVATE_KEY = 'y'
        mockSendNotification.mockResolvedValue(undefined)
    })

    it('devuelve error cuando el usuario no tiene suscripciones', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            from: (t: string) => mockFrom(t, { subscriptions: [] }),
        })
        const result = await sendNotificationToUser('user-1', 'Título', 'Cuerpo', '/url')
        expect(result.success).toBe(false)
        expect(result.error).toContain('suscripciones')
    })
})
