'use client'

import { useSyncExternalStore } from 'react'

export const OFRENDA_MOBILE_TABLET_MQ = '(max-width: 1023px)'

let mq: MediaQueryList | null = null
/** Valor estable; solo cambia cuando el listener de matchMedia lo actualiza. */
let snapshot = false
const listeners = new Set<() => void>()
let changeListenerAttached = false

/** Solo tests — reinicia caché y listeners. */
export function resetOfrendaMqCacheForTests() {
    if (mq && changeListenerAttached) {
        mq.removeEventListener('change', onMqChange)
    }
    mq = null
    snapshot = false
    listeners.clear()
    changeListenerAttached = false
}

function onMqChange() {
    if (!mq) return
    const next = mq.matches
    if (next === snapshot) return
    snapshot = next
    // Evita re-entrada síncrona durante subscribe (React 19 / MediaQueryList).
    queueMicrotask(() => {
        listeners.forEach((listener) => listener())
    })
}

function initMq(): MediaQueryList | null {
    if (typeof window === 'undefined') return null
    if (!mq) {
        mq = window.matchMedia(OFRENDA_MOBILE_TABLET_MQ)
        snapshot = mq.matches
        if (!changeListenerAttached) {
            mq.addEventListener('change', onMqChange)
            changeListenerAttached = true
        }
    }
    return mq
}

function subscribeMq(onStoreChange: () => void) {
    initMq()
    listeners.add(onStoreChange)
    return () => {
        listeners.delete(onStoreChange)
    }
}

function getMqSnapshot() {
    return snapshot
}

/** SSR: desktop por defecto para evitar hidratación móvil↔desktop en bucle. */
function getMqServerSnapshot() {
    return false
}

/**
 * true = móvil/tablet (≤1023px). Una sola MediaQueryList; snapshot estable para React.
 */
export function useOfrendaMobileOrTablet() {
    return useSyncExternalStore(subscribeMq, getMqSnapshot, getMqServerSnapshot)
}
