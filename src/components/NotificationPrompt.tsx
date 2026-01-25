/**
 * NotificationPrompt - IDMJI Gestor de Púlpito
 * 
 * Componente que muestra un banner sutil para invitar al usuario a activar las notificaciones.
 * Solo aparece si las notificaciones no están activas y no se ha rechazado recientemente.
 * 
 * @author Antigravity AI
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Loader2 } from 'lucide-react'
import { subscribeToPush } from '@/app/actions/notifications'
import { PushSubscription } from '@/types/notifications'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'

// Claves para persistencia
const DISMISS_KEY = 'notification_prompt_dismissed_at'
const REPROMPT_DAYS = 7

export function NotificationPrompt() {
    const [show, setShow] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useI18n()
    const { isDark } = useTheme()

    const checkStatus = useCallback(async () => {
        if (typeof window === 'undefined') return

        // 1. Verificar soporte
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

        // 2. Verificar permiso actual
        if (Notification.permission === 'granted' || Notification.permission === 'denied') return

        // 3. Verificar si fue cerrado recientemente
        const dismissedAt = localStorage.getItem(DISMISS_KEY)
        if (dismissedAt) {
            const date = new Date(parseInt(dismissedAt))
            const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
            if (daysSince < REPROMPT_DAYS) return
        }

        // Si todo ok, mostrar después de un breve delay
        setTimeout(() => setShow(true), 3000)
    }, [])

    useEffect(() => {
        checkStatus()
    }, [checkStatus])

    const handleActivate = async () => {
        setIsLoading(true)
        try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                setShow(false)
                return
            }

            const registration = await navigator.serviceWorker.ready
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

            if (!publicKey) throw new Error('VAPID key missing')

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as any
            })

            const result = await subscribeToPush({
                endpoint: sub.endpoint,
                keys: {
                    p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
                    auth: arrayBufferToBase64(sub.getKey('auth'))
                }
            })

            if (result.success) {
                toast.success('¡Notificaciones activadas!')
                setShow(false)
            } else {
                toast.error(result.error || 'Error al activar')
            }
        } catch (error) {
            console.error('Error enabling notifications:', error)
            toast.error('No se pudieron activar las notificaciones')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDismiss = () => {
        setShow(false)
        localStorage.setItem(DISMISS_KEY, Date.now().toString())
    }

    if (!show) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-[400px] z-[90]"
            >
                <div className={`glass rounded-3xl p-6 shadow-2xl border ${isDark ? 'border-white/10' : 'border-black/5'} flex flex-col gap-4 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 p-2">
                        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                            <Bell className="w-6 h-6 text-blue-500 animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-sm uppercase tracking-tight mb-1">{t('notifications.prompt.title')}</h4>
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                {t('notifications.prompt.desc')}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-colors border border-border/50"
                        >
                            {t('notifications.prompt.later')}
                        </button>
                        <button
                            onClick={handleActivate}
                            disabled={isLoading}
                            className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                            {t('notifications.prompt.activate')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

// Helpers
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return ''
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    return window.btoa(binary)
}
