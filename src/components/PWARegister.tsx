'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

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

                    // Lógica de detección de actualizaciones
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // Hay una nueva versión esperando ser activada
                                    toast('¡Nueva versión disponible!', {
                                        description: 'Hay mejoras y cambios listos para tu aplicación.',
                                        duration: Infinity, // No desaparece hasta que el usuario decida
                                        action: {
                                            label: 'Actualizar ahora',
                                            onClick: () => {
                                                // Enviar mensaje al SW para que deje de esperar
                                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                                // Recargar la página
                                                window.location.reload();
                                            }
                                        },
                                        icon: <RefreshCw className="w-4 h-4 text-blue-500 animate-spin-slow" />
                                    });
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.error('SW registration failed: ', error)
                })

            // Recargar automáticamente cuando el nuevo Service Worker tome el control
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }
    }, [])

    return null
}
