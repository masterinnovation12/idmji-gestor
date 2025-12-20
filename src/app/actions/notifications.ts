'use server'

import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'
import { ActionResponse } from '@/types/database'

// VAPID keys configuration
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@idmji.org'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    )
}

export interface PushSubscription {
    endpoint: string
    keys: {
        p256dh: string
        auth: string
    }
}

export async function subscribeToPush(subscription: PushSubscription): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
                user_id: user.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                updated_at: new Date().toISOString()
            })

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('Error subscribing to push:', error)
        return { success: false, error: 'Error al suscribirse' }
    }
}

export async function unsubscribeFromPush(endpoint: string): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        const { error } = await supabase
            .from('user_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', endpoint)

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('Error unsubscribing from push:', error)
        return { success: false, error: 'Error al desuscribirse' }
    }
}

export async function sendTestNotification(): Promise<ActionResponse<void>> {
    try {
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            return { success: false, error: 'VAPID keys no configuradas' }
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        const { data: subscriptions, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', user.id)

        if (error) throw error

        if (!subscriptions || subscriptions.length === 0) {
            return { success: false, error: 'No hay suscripciones activas' }
        }

        const payload = JSON.stringify({
            title: 'Notificación de Prueba',
            body: 'Esta es una notificación de prueba desde IDMJI Gestor',
            url: '/dashboard'
        })

        const promises = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            }
            return webpush.sendNotification(pushSubscription, payload)
        })

        await Promise.all(promises)

        return { success: true }
    } catch (error) {
        console.error('Error sending test notification:', error)
        return { success: false, error: 'Error al enviar notificación' }
    }
}

export async function sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    url?: string
): Promise<ActionResponse<void>> {
    try {
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            return { success: false, error: 'VAPID keys no configuradas' }
        }

        const supabase = await createClient()

        const { data: subscriptions, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)

        if (error) throw error

        if (!subscriptions || subscriptions.length === 0) {
            return { success: false, error: 'Usuario sin suscripciones' }
        }

        const payload = JSON.stringify({ title, body, url })

        const promises = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            }
            return webpush.sendNotification(pushSubscription, payload)
        })

        await Promise.all(promises)

        return { success: true }
    } catch (error) {
        console.error('Error sending notification:', error)
        return { success: false, error: 'Error al enviar notificación' }
    }
}
