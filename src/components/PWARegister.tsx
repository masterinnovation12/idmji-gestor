'use client'

import { useEffect } from 'react'

export function PWARegister() {
    useEffect(() => {
        // No registrar Service Worker en desarrollo (localhost)
        const isDevelopment = 
            typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1' ||
             process.env.NODE_ENV === 'development')
        
        if (isDevelopment) {
            // En desarrollo, desregistrar cualquier SW existente y limpiar caché
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => {
                        registration.unregister()
                        console.log('[SW] Service Worker desregistrado en desarrollo')
                    })
                })
                
                // Limpiar cachés
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

        // Solo registrar en producción
        if ('serviceWorker' in navigator && typeof window !== 'undefined') {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('SW registered: ', registration)
                })
                .catch((error) => {
                    console.error('SW registration failed: ', error)
                })
        }
    }, [])

    return null
}
