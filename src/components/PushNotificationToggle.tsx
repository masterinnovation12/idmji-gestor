/**
 * PushNotificationToggle - IDMJI Gestor de Púlpito
 * 
 * Componente para gestionar las notificaciones push del usuario.
 * Permite activar, desactivar y probar notificaciones.
 * 
 * @author Antigravity AI
 * @date 2024-12-22
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, Send, AlertCircle, Check, Loader2 } from 'lucide-react'
import { subscribeToPush, unsubscribeFromPush, sendTestNotification } from '@/app/actions/notifications'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

type NotificationStatus = 'checking' | 'unsupported' | 'denied' | 'inactive' | 'active' | 'error'

export function PushNotificationToggle() {
    const [status, setStatus] = useState<NotificationStatus>('checking')
    const [isLoading, setIsLoading] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Check subscription status on mount
    const checkSubscription = useCallback(async () => {
        // No registrar Service Worker en desarrollo (localhost)
        const isDevelopment = 
            typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1')
        
        if (isDevelopment) {
            setStatus('unsupported')
            setErrorMessage('Las notificaciones push no están disponibles en desarrollo')
            return
        }

        // Check browser support
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setStatus('unsupported')
            setErrorMessage('Tu navegador no soporta notificaciones push')
            return
        }

        // Check permission
        if (Notification.permission === 'denied') {
            setStatus('denied')
            setErrorMessage('Has bloqueado las notificaciones. Actívalas en la configuración del navegador.')
            return
        }

        try {
            // Register service worker if not already
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            })

            await navigator.serviceWorker.ready

            // Check existing subscription
            const sub = await registration.pushManager.getSubscription()
            setSubscription(sub)
            setStatus(sub ? 'active' : 'inactive')
        } catch (error) {
            console.error('Error checking subscription:', error)
            setStatus('error')
            setErrorMessage('Error al verificar el estado de las notificaciones')
        }
    }, [])

    useEffect(() => {
        checkSubscription()
    }, [checkSubscription])

    async function handleSubscribe() {
        setIsLoading(true)
        setErrorMessage(null)

        try {
            // Request permission
            const permission = await Notification.requestPermission()

            if (permission === 'denied') {
                setStatus('denied')
                setErrorMessage('Permiso de notificaciones denegado')
                setIsLoading(false)
                return
            }

            if (permission !== 'granted') {
                setErrorMessage('No se otorgó el permiso de notificaciones')
                setIsLoading(false)
                return
            }

            const registration = await navigator.serviceWorker.ready
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

            if (!publicKey || publicKey.length < 50) {
                setStatus('error')
                setErrorMessage('Configuración del servidor incompleta o clave VAPID inválida')
                setIsLoading(false)
                return
            }

            // Subscribe
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            })

            // Send to server
            const p256dh = sub.getKey('p256dh')
            const auth = sub.getKey('auth')

            if (!p256dh || !auth) {
                setErrorMessage('Error al obtener claves de encriptación')
                setStatus('error')
                return
            }

            const subscriptionData = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: arrayBufferToBase64(p256dh),
                    auth: arrayBufferToBase64(auth)
                }
            }

            const result = await subscribeToPush(subscriptionData)

            if (result.success) {
                setSubscription(sub)
                setStatus('active')
                toast.success('¡Notificaciones activadas!')
            } else {
                // Si hay error del servidor, pero la suscripción del navegador funcionó
                if (result.error?.includes('does not exist')) {
                    setErrorMessage('La base de datos no está configurada para notificaciones')
                } else {
                    setErrorMessage(result.error || 'Error al guardar la suscripción')
                }
                setStatus('error')
                // Cancelar la suscripción del navegador si el servidor falló
                await sub.unsubscribe()
            }
        } catch (error: unknown) {
            console.error('Error subscribing:', error)
            const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
            setErrorMessage(`Error al activar: ${errorMsg}`)
            setStatus('error')
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
            setStatus('inactive')
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

    // Render based on status
    const renderContent = () => {
        switch (status) {
            case 'checking':
                return (
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Verificando...</span>
                    </div>
                )

            case 'unsupported':
                return (
                    <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">{errorMessage}</span>
                    </div>
                )

            case 'denied':
                return (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <BellOff className="w-5 h-5" />
                            <div>
                                <p className="font-medium text-sm">Notificaciones bloqueadas</p>
                                <p className="text-xs opacity-70">Actívalas en configuración del navegador</p>
                            </div>
                        </div>
                    </div>
                )

            case 'error':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            <div>
                                <p className="font-medium text-sm">Error</p>
                                <p className="text-xs opacity-70">{errorMessage}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setStatus('inactive'); setErrorMessage(null); checkSubscription(); }}
                            className="text-xs text-primary hover:underline"
                        >
                            Reintentar
                        </button>
                    </div>
                )

            case 'inactive':
                return (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-xl">
                                <BellOff className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-900 dark:text-white">Notificaciones Push</p>
                                <p className="text-xs text-gray-500 dark:text-zinc-400">Recibe alertas de tus asignaciones</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSubscribe}
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                            Activar
                        </button>
                    </div>
                )

            case 'active':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                    <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                        Notificaciones Push
                                        <Check className="w-4 h-4 text-green-500" />
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400">Activadas</p>
                                </div>
                            </div>
                            <button
                                onClick={handleUnsubscribe}
                                disabled={isLoading}
                                className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desactivar'}
                            </button>
                        </div>

                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={handleTestNotification}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold rounded-xl transition-all border border-blue-200 dark:border-blue-800 disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                            Enviar Notificación de Prueba
                        </motion.button>
                    </div>
                )
        }
    }

    return (
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700">
            <AnimatePresence mode="wait">
                <motion.div
                    key={status}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {renderContent()}
                </motion.div>
            </AnimatePresence>
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

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return ''
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
}
