'use server'

import { createClient } from '@/lib/supabase/server'
import { ActionResponse } from '@/types/database'
import { PushSubscription, type PushClientType } from '@/types/notifications'
import { selectSubscriptionsForSend } from '@/app/actions/notifications-subscriptions'
import { translations } from '@/lib/i18n/translations'
import { profilePreferredLanguage } from '@/lib/profile-language'

function normalizeClientType(raw: PushSubscription['clientType'] | undefined): PushClientType {
    if (raw === 'pwa' || raw === 'browser') return raw
    return 'browser'
}

// VAPID keys configuration
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@idmji.org'

async function getWebPush() {
    // Importación dinámica para evitar que web-push se incluya en el bundle del cliente
    // o cause errores de "export" en tiempo de compilación/ejecución
    const webpush = (await import('web-push')).default
    
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        try {
            if (VAPID_PUBLIC_KEY.length > 50) {
                webpush.setVapidDetails(
                    VAPID_SUBJECT,
                    VAPID_PUBLIC_KEY,
                    VAPID_PRIVATE_KEY
                )
                return webpush
            }
        } catch (error) {
            console.error('❌ Error al configurar web-push VAPID:', error)
        }
    }
    return null
}

const PWA_ONLY_ERROR = 'Las notificaciones push solo se pueden activar desde la app instalada (PWA), no desde el navegador.'

export async function subscribeToPush(subscription: PushSubscription): Promise<ActionResponse<void>> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { success: false, error: 'No autenticado' }
        }

        const clientType = normalizeClientType(subscription.clientType)
        if (clientType !== 'pwa') {
            return { success: false, error: PWA_ONLY_ERROR }
        }

        const { error } = await supabase
            .from('user_subscriptions')
            .upsert({
                user_id: user.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                client_type: clientType,
                updated_at: new Date().toISOString()
            }, { onConflict: 'endpoint' })

        if (error) throw error

        const { error: delErr } = await supabase
            .from('user_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('client_type', 'browser')
        if (delErr) throw delErr

        return { success: true }
    } catch (error) {
        console.error('Error subscribing to push:', error)
        const msg = error instanceof Error ? error.message : String(error)
        const isTableMissing = /42P01|does not exist|relation.*user_subscriptions/i.test(msg)
        const isAuthError = msg.includes('No autenticado') || msg.includes('JWT')
        let errorMsg = 'Error al suscribirse'
        if (isTableMissing) errorMsg = 'La tabla de suscripciones no existe. Ejecuta la migración en Supabase SQL Editor.'
        else if (isAuthError) errorMsg = 'Sesión expirada. Recarga la página e intenta de nuevo.'
        return { success: false, error: errorMsg }
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
        const webpush = await getWebPush()
        if (!webpush) {
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

        const toSend = selectSubscriptionsForSend(subscriptions ?? [])

        if (toSend.length === 0) {
            const { data: profile } = await supabase.from('profiles').select('idioma_preferido').eq('id', user.id).single()
            const lang = profilePreferredLanguage(profile)
            const t = (key: keyof typeof translations['es-ES']) => translations[lang]?.[key] ?? translations['es-ES'][key] ?? String(key)
            return { success: false, error: t('notifications.error.noSubscriptions' as keyof typeof translations['es-ES']) }
        }

        const { data: profile } = await supabase.from('profiles').select('idioma_preferido').eq('id', user.id).single()
        const lang = profilePreferredLanguage(profile)
        const t = (key: keyof typeof translations['es-ES']) => translations[lang]?.[key] ?? translations['es-ES'][key] ?? String(key)

        const payload = JSON.stringify({
            title: t('notifications.test.title' as keyof typeof translations['es-ES']),
            body: t('notifications.test.body' as keyof typeof translations['es-ES']),
            url: '/dashboard'
        })

        const promises = toSend.map(sub => {
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
        const webpush = await getWebPush()
        if (!webpush) {
            return { success: false, error: 'VAPID keys no configuradas' }
        }

        const supabase = await createClient()

        const { data: subscriptions, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)

        if (error) throw error

        const toSend = selectSubscriptionsForSend(subscriptions ?? [])

        if (toSend.length === 0) {
            return { success: false, error: 'Usuario sin suscripciones' }
        }

        const payload = JSON.stringify({ title, body, url })

        const promises = toSend.map(sub => {
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
