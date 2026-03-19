/**
 * NotificationPrompt - IDMJI Gestor de Púlpito
 * 
 * Componente que muestra un banner sutil para invitar al usuario a activar las notificaciones.
 * Solo aparece si las notificaciones no están activas y no se ha rechazado recientemente.
 * 
 * @author Antigravity AI
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Loader2 } from 'lucide-react'
import { subscribeToPush } from '@/app/actions/notifications'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/I18nProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { usePrompts } from '@/lib/PromptsContext'

// Claves para persistencia
const DISMISS_KEY = 'notification_prompt_dismissed_at'
const REPROMPT_DAYS = 7
/** Retraso inicial para dar prioridad al prompt de instalación PWA (5s) */
const INITIAL_DELAY_MS = 6000
/** Tras cerrar el prompt de instalación, mostrar notificaciones tras este margen */
const AFTER_INSTALL_CLOSED_MS = 1500

function shouldShowNotificationPrompt(): boolean {
    if (typeof window === 'undefined') return false
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return false
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
        const date = new Date(parseInt(dismissedAt, 10))
        const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSince < REPROMPT_DAYS) return false
    }
    return true
}

export function NotificationPrompt() {
    const [show, setShow] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useI18n()
    const { isDark } = useTheme()
    const prompts = usePrompts()
    const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const initialScheduledRef = useRef(false)
    const prevInstallRef = useRef(false)

    const tryShow = useCallback(() => {
        if (!shouldShowNotificationPrompt() || prompts?.activePrompt !== null) return
        prompts?.setActivePrompt('notification')
        setShow(true)
    }, [prompts])

    // Retraso inicial 6s para dar prioridad al prompt de instalación (5s); solo una vez por sesión
    useEffect(() => {
        if (!prompts) return
        const clearScheduled = () => {
            if (scheduledRef.current) {
                clearTimeout(scheduledRef.current)
                scheduledRef.current = null
            }
        }
        if (prompts.activePrompt === 'install') {
            clearScheduled()
            return
        }
        if (prompts.activePrompt !== null || !shouldShowNotificationPrompt()) return
        if (initialScheduledRef.current) return
        initialScheduledRef.current = true
        scheduledRef.current = setTimeout(tryShow, INITIAL_DELAY_MS)
        return clearScheduled
    }, [prompts, prompts?.activePrompt, tryShow])

    // Cuando se cierra el prompt de instalación, mostrar el de notificaciones tras 1.5s
    useEffect(() => {
        if (!prompts) return
        const wasInstall = prevInstallRef.current
        const isInstall = prompts.activePrompt === 'install'
        prevInstallRef.current = isInstall
        if (wasInstall && !isInstall && shouldShowNotificationPrompt()) {
            scheduledRef.current = setTimeout(tryShow, AFTER_INSTALL_CLOSED_MS)
            return () => {
                if (scheduledRef.current) clearTimeout(scheduledRef.current)
            }
        }
    }, [prompts, prompts?.activePrompt, tryShow])

    const handleActivate = async () => {
        setIsLoading(true)
        try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                setShow(false)
                prompts?.setActivePrompt(null)
                if (permission === 'denied') {
                    toast.info(t('notifications.status.denied'))
                }
                return
            }

            // Registrar SW si no existe (necesario para push en producción/PWA)
            let registration = await navigator.serviceWorker.getRegistration('/')
            if (!registration) {
                registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
                await navigator.serviceWorker.ready
            } else {
                await navigator.serviceWorker.ready
            }

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
                prompts?.setActivePrompt(null)
            } else {
                toast.error(result.error || 'Error al activar')
            }
        } catch (error) {
            console.error('Error enabling notifications:', error)
            const msg = error instanceof Error ? error.message : String(error)
            const isPushServiceUnavailable = /push service not available|push service unavailable/i.test(msg)
            toast.error(isPushServiceUnavailable
                ? t('notifications.error.pushServiceUnavailable')
                : 'No se pudieron activar las notificaciones')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDismiss = () => {
        setShow(false)
        localStorage.setItem(DISMISS_KEY, Date.now().toString())
        prompts?.setActivePrompt(null)
    }

    if (!show) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-4 left-3 right-3 z-50 md:left-auto md:right-6 md:w-[380px]"
            >
                <div className={`glass-panel rounded-3xl p-6 shadow-2xl border flex flex-col gap-4 relative overflow-hidden ${isDark ? 'border-white/10' : 'border-black/5'}`}>
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
