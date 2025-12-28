/**
 * Service Worker - IDMJI Gestor de Púlpito
 * 
 * Este service worker está diseñado para:
 * - Android 14+: Permitir instalación WebAPK (app en galería)
 * - iOS 12+: Funcionar correctamente sin congelarse
 * 
 * Estrategias de caché:
 * - Cache-first: Para assets estáticos (CSS, JS, imágenes, fuentes)
 * - Network-first: Para navegación y APIs
 * - Stale-while-revalidate: Para recursos que cambian ocasionalmente
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `idmji-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `idmji-dynamic-${CACHE_VERSION}`;

// Assets críticos para precachear (app shell)
const PRECACHE_ASSETS = [
    '/',
    '/dashboard',
    '/login',
    '/manifest.json',
    '/logo.jpg',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Patrones para diferentes estrategias de caché
const CACHE_FIRST_PATTERNS = [
    /\/_next\/static\/.*/,           // Next.js static assets
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,  // Imágenes
    /\.(?:woff|woff2|ttf|otf)$/i,    // Fuentes
    /\/icons\/.*/,                    // Iconos
    /\/screenshots\/.*/               // Screenshots
];

const NETWORK_FIRST_PATTERNS = [
    /\/api\/.*/,                      // API calls
    /\/dashboard.*/,                  // Páginas dinámicas
    /supabase/                        // Supabase requests
];

// ============ INSTALL EVENT ============
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Precaching app shell');
                // Usar addAll con catch individual para no fallar si un recurso no existe
                return Promise.allSettled(
                    PRECACHE_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`[SW] Failed to cache: ${url}`, err);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ============ ACTIVATE EVENT ============
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Eliminar caches antiguos
                            return name.startsWith('idmji-') &&
                                name !== STATIC_CACHE &&
                                name !== DYNAMIC_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ============ FETCH EVENT ============
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Solo manejar requests GET
    if (request.method !== 'GET') return;

    // No cachear requests de otras origins (excepto CDNs conocidos)
    if (url.origin !== self.location.origin &&
        !url.hostname.includes('supabase') &&
        !url.hostname.includes('fonts.googleapis') &&
        !url.hostname.includes('fonts.gstatic')) {
        return;
    }

    // Determinar estrategia de caché
    const isCacheFirst = CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname) || pattern.test(url.href));
    const isNetworkFirst = NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname) || pattern.test(url.href));

    if (isCacheFirst) {
        // CACHE FIRST: Para assets estáticos
        event.respondWith(cacheFirst(request));
    } else if (isNetworkFirst) {
        // NETWORK FIRST: Para APIs y contenido dinámico
        event.respondWith(networkFirst(request));
    } else {
        // STALE WHILE REVALIDATE: Para todo lo demás (páginas de navegación)
        event.respondWith(staleWhileRevalidate(request));
    }
});

// ============ ESTRATEGIAS DE CACHÉ ============

/**
 * Cache First: Intenta caché primero, luego red
 * Ideal para: assets estáticos que no cambian frecuentemente
 */
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Fallback para imágenes
        if (request.destination === 'image') {
            return caches.match('/icons/icon-192x192.png');
        }
        throw error;
    }
}

/**
 * Network First: Intenta red primero, luego caché
 * Ideal para: APIs y contenido dinámico
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

/**
 * Stale While Revalidate: Devuelve caché y actualiza en background
 * Ideal para: páginas de navegación
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await caches.match(request);

    // Fetch en background para actualizar caché
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => cachedResponse);

    // Devolver caché si existe, sino esperar a la red
    return cachedResponse || fetchPromise;
}

// ============ PUSH NOTIFICATIONS ============
self.addEventListener('push', (event) => {
    let data = { title: 'IDMJI Sabadell', body: 'Nueva notificación' };

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.warn('[SW] Error parsing push data:', e);
    }

    const options = {
        body: data.body || 'Nueva notificación',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/dashboard',
            dateOfArrival: Date.now()
        },
        actions: [
            { action: 'open', title: 'Ver' },
            { action: 'close', title: 'Cerrar' }
        ],
        requireInteraction: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'IDMJI Sabadell', options)
    );
});

// ============ NOTIFICATION CLICK ============
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Buscar si ya hay una ventana abierta
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Si no hay ventana, abrir una nueva
                return clients.openWindow(urlToOpen);
            })
    );
});

// ============ MESSAGE HANDLER ============
// Para comunicación con la app (por ejemplo, forzar actualización del SW)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((names) =>
                Promise.all(names.map((name) => caches.delete(name)))
            )
        );
    }
});

console.log('[SW] Service worker script loaded');
