/**
 * Tests unitarios para acciones de notificaciones push.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    sendNotificationToUser,
} from './notifications'
import { selectSubscriptionsForSend } from './notifications-subscriptions'

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

type UserSubscriptionMockOptions = {
    subscriptions?: Array<Record<string, unknown>>
    profileLang?: string
    upsertError?: Error | null
    deleteError?: Error | null
}

function createUserSubscriptionsTableMock(options: UserSubscriptionMockOptions) {
    const subs = options.subscriptions ?? []
    const upsertMock = vi.fn().mockResolvedValue({ error: options.upsertError ?? null })
    const deleteSecondEq = vi.fn().mockResolvedValue({ error: options.deleteError ?? null })
    const deleteFirstEq = vi.fn().mockReturnValue({
        eq: deleteSecondEq,
    })
    const deleteMock = vi.fn().mockReturnValue({
        eq: deleteFirstEq,
    })
    const selectEqMock = vi.fn().mockResolvedValue({ data: subs, error: null })
    return {
        upsert: upsertMock,
        select: vi.fn().mockReturnValue({
            eq: selectEqMock,
        }),
        delete: deleteMock,
        deleteFirstEq,
        deleteSecondEq,
    }
}

function mockFrom(table: string, options: UserSubscriptionMockOptions) {
    if (table === 'user_subscriptions') {
        return createUserSubscriptionsTableMock(options)
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

describe('selectSubscriptionsForSend', () => {
    const row = (client_type: string | null | undefined, endpoint: string) => ({
        client_type,
        endpoint,
        p256dh: 'p',
        auth: 'a',
    })

    it('lista vacía → resultado vacío', () => {
        expect(selectSubscriptionsForSend([])).toEqual([])
    })

    it('solo browser → todas las browser', () => {
        const a = row('browser', 'e1')
        const b = row('browser', 'e2')
        expect(selectSubscriptionsForSend([a, b])).toEqual([a, b])
    })

    it('solo pwa → todas las pwa', () => {
        const a = row('pwa', 'e1')
        const b = row('pwa', 'e2')
        expect(selectSubscriptionsForSend([a, b])).toEqual([a, b])
    })

    it('mixto browser + pwa → solo filas pwa', () => {
        const a = row('browser', 'e1')
        const b = row('pwa', 'e2')
        expect(selectSubscriptionsForSend([a, b])).toEqual([b])
    })

    it('client_type null o vacío se trata como browser', () => {
        const a = row(null, 'e1')
        const b = row('pwa', 'e2')
        expect(selectSubscriptionsForSend([a, b])).toEqual([b])
    })
})

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
            clientType: 'browser',
        })
        expect(result.success).toBe(true)
    })

    it('upsert incluye client_type pwa cuando el payload lo trae', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        const table = createUserSubscriptionsTableMock({})
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: (t: string) => (t === 'user_subscriptions' ? table : mockFrom(t, {})),
        })
        const result = await subscribeToPush({
            endpoint: 'https://fcm.googleapis.com/fcm/send/xxx',
            keys: { p256dh: 'key1', auth: 'key2' },
            clientType: 'pwa',
        })
        expect(result.success).toBe(true)
        expect(table.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ client_type: 'pwa', user_id: 'user-1' }),
            expect.any(Object)
        )
    })

    it('con clientType pwa y upsert ok ejecuta delete de filas browser del mismo usuario', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        const table = createUserSubscriptionsTableMock({})
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: (t: string) => (t === 'user_subscriptions' ? table : mockFrom(t, {})),
        })
        await subscribeToPush({
            endpoint: 'https://fcm.googleapis.com/fcm/send/xxx',
            keys: { p256dh: 'key1', auth: 'key2' },
            clientType: 'pwa',
        })
        expect(table.delete).toHaveBeenCalled()
        expect(table.deleteFirstEq).toHaveBeenCalledWith('user_id', 'user-1')
        expect(table.deleteSecondEq).toHaveBeenCalledWith('client_type', 'browser')
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
            clientType: 'browser',
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

    it('con suscripciones mixtas solo envía a PWA', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: (t: string) =>
                mockFrom(t, {
                    subscriptions: [
                        {
                            client_type: 'browser',
                            endpoint: 'https://b',
                            p256dh: 'pb',
                            auth: 'ab',
                        },
                        {
                            client_type: 'pwa',
                            endpoint: 'https://p',
                            p256dh: 'pp',
                            auth: 'ap',
                        },
                    ],
                }),
        })
        const result = await sendTestNotification()
        expect(result.success).toBe(true)
        expect(mockSendNotification).toHaveBeenCalledTimes(1)
        expect(mockSendNotification).toHaveBeenCalledWith(
            expect.objectContaining({ endpoint: 'https://p' }),
            expect.any(String)
        )
    })

    it('solo browser envía a todas las browser', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: (t: string) =>
                mockFrom(t, {
                    subscriptions: [
                        {
                            client_type: 'browser',
                            endpoint: 'https://b1',
                            p256dh: 'p1',
                            auth: 'a1',
                        },
                        {
                            client_type: 'browser',
                            endpoint: 'https://b2',
                            p256dh: 'p2',
                            auth: 'a2',
                        },
                    ],
                }),
        })
        const result = await sendTestNotification()
        expect(result.success).toBe(true)
        expect(mockSendNotification).toHaveBeenCalledTimes(2)
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

    it('con mix browser+pwa solo envía a PWA', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            from: (t: string) =>
                mockFrom(t, {
                    subscriptions: [
                        {
                            client_type: 'browser',
                            endpoint: 'https://b',
                            p256dh: 'pb',
                            auth: 'ab',
                        },
                        {
                            client_type: 'pwa',
                            endpoint: 'https://p',
                            p256dh: 'pp',
                            auth: 'ap',
                        },
                    ],
                }),
        })
        const result = await sendNotificationToUser('user-1', 'T', 'B', '/u')
        expect(result.success).toBe(true)
        expect(mockSendNotification).toHaveBeenCalledTimes(1)
        expect(mockSendNotification).toHaveBeenCalledWith(
            expect.objectContaining({ endpoint: 'https://p' }),
            expect.any(String)
        )
    })

    it('solo pwa envía a todas las pwa', async () => {
        const { createClient } = await import('@/lib/supabase/server')
        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
            from: (t: string) =>
                mockFrom(t, {
                    subscriptions: [
                        {
                            client_type: 'pwa',
                            endpoint: 'https://p1',
                            p256dh: 'p1',
                            auth: 'a1',
                        },
                        {
                            client_type: 'pwa',
                            endpoint: 'https://p2',
                            p256dh: 'p2',
                            auth: 'a2',
                        },
                    ],
                }),
        })
        const result = await sendNotificationToUser('user-1', 'T', 'B')
        expect(result.success).toBe(true)
        expect(mockSendNotification).toHaveBeenCalledTimes(2)
    })
})
