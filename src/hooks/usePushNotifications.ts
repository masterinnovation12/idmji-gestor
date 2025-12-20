'use client'

import { useState, useEffect } from 'react'
import { subscribeToPush as subscribeUser } from '@/app/actions/notifications'
import { toast } from 'sonner'

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            registerServiceWorker()
        }
    }, [])

    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            })

            const sub = await registration.pushManager.getSubscription()
            setSubscription(sub)
        } catch (error) {
            console.error('Service Worker registration failed:', error)
        }
    }

    async function subscribeToPush() {
        if (!isSupported) return
        setLoading(true)
        try {
            const registration = await navigator.serviceWorker.ready
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
                ),
            })

            // Save to DB
            // Need to serialise properly to match PushSubscriptionJSON
            await subscribeUser(JSON.parse(JSON.stringify(sub)))
            toast.success('Notificaciones activadas correctamente')
            setSubscription(sub)
        } catch (error) {
            console.error('Failed to subscribe:', error)
            toast.error('Error al activar notificaciones. Verifica permisos.')
        } finally {
            setLoading(false)
        }
    }

    return {
        isSupported,
        subscription,
        subscribeToPush,
        loading,
    }
}
