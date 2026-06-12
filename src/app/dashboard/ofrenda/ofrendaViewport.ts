'use client'

import { useSyncExternalStore } from 'react'

export const OFRENDA_MOBILE_TABLET_MQ = '(max-width: 1023px)'

let mq: MediaQueryList | null = null
/** Valor estable; solo cambia cuando el listener de matchMedia lo actualiza. */
let mqSnapshot = false
const mqListeners = new Set<() => void>()
let mqChangeListenerAttached = false
let mqHydrated = false

const mountedListeners = new Set<() => void>()
let clientMounted = false

/** Solo tests — aplica matchMedia sincrónicamente (sin esperar microtask). */
export function flushOfrendaViewportForTests() {
    if (typeof window === 'undefined') return
    mqHydrated = true
    initMq()
}

/** Solo tests — reinicia caché y listeners. */
export function resetOfrendaMqCacheForTests() {
    if (mq && mqChangeListenerAttached) {
        mq.removeEventListener('change', onMqChange)
    }
    mq = null
    mqSnapshot = false
    mqListeners.clear()
    mqChangeListenerAttached = false
    mqHydrated = false
    mountedListeners.clear()
    clientMounted = false
}

function onMqChange() {
    if (!mq) return
    const next = mq.matches
    if (next === mqSnapshot) return
    mqSnapshot = next
    queueMicrotask(() => {
        mqListeners.forEach(listener => listener())
    })
}

function initMq(): MediaQueryList | null {
    if (typeof window === 'undefined') return null
    if (!mq) {
        mq = window.matchMedia(OFRENDA_MOBILE_TABLET_MQ)
        mqSnapshot = mq.matches
        if (!mqChangeListenerAttached) {
            mq.addEventListener('change', onMqChange)
            mqChangeListenerAttached = true
        }
    }
    return mq
}

function scheduleMqHydration() {
    if (mqHydrated || typeof window === 'undefined') return
    mqHydrated = true
    queueMicrotask(() => {
        initMq()
        mqListeners.forEach(listener => listener())
    })
}

function subscribeMq(onStoreChange: () => void) {
    mqListeners.add(onStoreChange)
    scheduleMqHydration()
    return () => {
        mqListeners.delete(onStoreChange)
    }
}

function getMqSnapshot() {
    return mqHydrated ? mqSnapshot : false
}

/** SSR y primer paint del cliente: desktop para coincidir con el HTML del servidor. */
function getMqServerSnapshot() {
    return false
}

/**
 * true = móvil/tablet (≤1023px). Una sola MediaQueryList; snapshot estable para React.
 * El valor real de matchMedia se aplica tras el primer microtask (post-hidratación).
 */
export function useOfrendaMobileOrTablet() {
    return useSyncExternalStore(subscribeMq, getMqSnapshot, getMqServerSnapshot)
}

function scheduleClientMounted() {
    if (clientMounted || typeof window === 'undefined') return
    queueMicrotask(() => {
        if (clientMounted) return
        clientMounted = true
        mountedListeners.forEach(listener => listener())
    })
}

function subscribeMounted(onStoreChange: () => void) {
    mountedListeners.add(onStoreChange)
    scheduleClientMounted()
    return () => {
        mountedListeners.delete(onStoreChange)
    }
}

function getMountedSnapshot() {
    return clientMounted
}

function getMountedServerSnapshot() {
    return false
}

/** false en SSR y en el primer paint del cliente → evita mismatch de hidratación. */
export function useOfrendaClientMounted() {
    return useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot)
}
