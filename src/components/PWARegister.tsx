'use client'

import { useEffect } from 'react'
import { PWA_SW_READY_EVENT } from '@/lib/pwa-install-prompt'

export function PWARegister() {
    useEffect(() => {
        const enablePushInDev = process.env.NEXT_PUBLIC_ENABLE_PUSH_DEV === 'true'
        const isDevelopment =
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                process.env.NODE_ENV === 'development')

        if (isDevelopment && !enablePushInDev) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => {
                        registration.unregister()
                        console.log('[SW] Service Worker desregistrado en desarrollo')
                    })
                })

                if ('caches' in window) {
                    caches.keys().then((cacheNames) => {
                        cacheNames.forEach((cacheName) => {
                            caches.delete(cacheName)
                            console.log('[SW] Caché eliminado:', cacheName)
                        })
                    })
                }
            }
            return
        }

        if ('serviceWorker' in navigator && typeof window !== 'undefined') {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then(() => navigator.serviceWorker.ready)
                .then(() => {
                    window.dispatchEvent(new CustomEvent(PWA_SW_READY_EVENT))
                })
                .catch((error) => {
                    console.error('SW registration failed: ', error)
                })
        }
    }, [])

    return null
}
