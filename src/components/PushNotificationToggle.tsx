'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { subscribeToPush, unsubscribeFromPush, sendTestNotification } from '@/app/actions/notifications'
import { toast } from 'sonner'

export function PushNotificationToggle() {
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)

    useEffect(() => {
        checkSubscription()
    }, [])

    async function checkSubscription() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return
        }

        try {
            const registration = await navigator.serviceWorker.ready
            const sub = await registration.pushManager.getSubscription()
            setSubscription(sub)
            setIsSubscribed(!!sub)
        } catch (error) {
            console.error('Error checking subscription:', error)
        }
    }

    async function handleSubscribe() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.error('Tu navegador no soporta notificaciones push')
            return
        }

        setIsLoading(true)

        try {
            const permission = await Notification.requestPermission()

            if (permission !== 'granted') {
                toast.error('Permiso de notificaciones denegado')
                setIsLoading(false)
                return
            }

            const registration = await navigator.serviceWorker.ready
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

            if (!publicKey) {
                toast.error('Configuración de notificaciones incompleta')
                setIsLoading(false)
                return
            }

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
            })

            const subscriptionData = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
                    auth: arrayBufferToBase64(sub.getKey('auth')!)
                }
            }

            const result = await subscribeToPush(subscriptionData)

            if (result.success) {
                setSubscription(sub)
                setIsSubscribed(true)
                toast.success('Notificaciones activadas correctamente')
            } else {
                toast.error(result.error || 'Error al activar notificaciones')
            }
        } catch (error) {
            console.error('Error subscribing:', error)
            toast.error('Error al activar notificaciones')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleUnsubscribe() {
        if (!subscription) return

        setIsLoading(true)

        try {
            await subscription.unsubscribe()
            await unsubscribeFromPush(subscription.endpoint)

            setSubscription(null)
            setIsSubscribed(false)
            toast.success('Notificaciones desactivadas')
        } catch (error) {
            console.error('Error unsubscribing:', error)
            toast.error('Error al desactivar notificaciones')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleTestNotification() {
        setIsLoading(true)

        try {
            const result = await sendTestNotification()

            if (result.success) {
                toast.success('Notificación de prueba enviada')
            } else {
                toast.error(result.error || 'Error al enviar notificación')
            }
        } catch (error) {
            console.error('Error sending test:', error)
            toast.error('Error al enviar notificación de prueba')
        } finally {
            setIsLoading(false)
        }
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return null
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isSubscribed ? (
                        <Bell className="w-5 h-5 text-primary" />
                    ) : (
                        <BellOff className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                        <p className="font-medium">Notificaciones Push</p>
                        <p className="text-sm text-muted-foreground">
                            {isSubscribed ? 'Activadas' : 'Desactivadas'}
                        </p>
                    </div>
                </div>

                <Button
                    onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                    disabled={isLoading}
                    variant={isSubscribed ? 'outline' : 'primary'}
                >
                    {isLoading ? 'Procesando...' : isSubscribed ? 'Desactivar' : 'Activar'}
                </Button>
            </div>

            {isSubscribed && (
                <Button
                    onClick={handleTestNotification}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                >
                    Enviar Notificación de Prueba
                </Button>
            )}
        </div>
    )
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
}
