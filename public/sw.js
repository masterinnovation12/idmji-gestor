const CACHE_NAME = 'idmji-pulpito-v1'

self.addEventListener('install', (event) => {
    // console.log('Service Worker installed')
    event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
    // console.log('Service Worker activated')
    event.waitUntil(self.clients.claim())
})



self.addEventListener('fetch', (event) => {
    // Necesario para que sea instalable
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request)
        })
    )
})

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {}

    event.waitUntil(
        self.registration.showNotification(data.title || 'IDMJI Sabadell', {
            body: data.body || 'Nueva notificación',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            data: data.url ? { url: data.url } : {}
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        )
    }
})
