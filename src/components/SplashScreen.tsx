'use client'

/**
 * Splash in-app de marca (fondo navy + logo en marco dorado, idéntico al
 * splash del sistema que genera el manifest). Se renderiza en el HTML inicial
 * (SSR) para pintar al instante y puentear el arranque de la PWA, y se
 * desvanece cuando la app está lista. Al ser igual que el splash del sistema,
 * el usuario percibe una sola pantalla de arranque. Solo visible en modo
 * standalone (PWA instalada) o con `pwa-splash-force` en <html> (pruebas).
 */

import { useEffect, useRef, useState } from 'react'

const MIN_VISIBLE_MS = 500
const MAX_VISIBLE_MS = 4000
const FADE_MS = 450

export function SplashScreen() {
    const [hidden, setHidden] = useState(false)
    const [done, setDone] = useState(false)
    // Hooks de prueba (solo E2E): forzar visible en navegador sin modo standalone.
    //  - pwaSplashForce=1 : muestra el splash pero deja que se autooculte.
    //  - pwaSplashHold=1  : muestra el splash y lo mantiene fijo (tests de estilo).
    const [forceShow, setForceShow] = useState(false)
    const mountedAt = useRef<number>(Date.now())

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const hold = params.get('pwaSplashHold') === '1'
        const force = params.get('pwaSplashForce') === '1'
        if (hold || force) setForceShow(true)
        if (hold) return

        let fadeTimer: ReturnType<typeof setTimeout> | null = null
        let doneTimer: ReturnType<typeof setTimeout> | null = null

        const startHide = () => {
            const elapsed = Date.now() - mountedAt.current
            const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)
            fadeTimer = setTimeout(() => {
                setHidden(true)
                doneTimer = setTimeout(() => setDone(true), FADE_MS)
            }, wait)
        }

        const onReady = () => startHide()

        if (document.readyState === 'complete') {
            requestAnimationFrame(onReady)
        } else {
            window.addEventListener('load', onReady, { once: true })
        }

        // Salvaguarda: nunca dejar el splash bloqueando la app.
        const safety = setTimeout(() => {
            setHidden(true)
            setTimeout(() => setDone(true), FADE_MS)
        }, MAX_VISIBLE_MS)

        return () => {
            window.removeEventListener('load', onReady)
            if (fadeTimer) clearTimeout(fadeTimer)
            if (doneTimer) clearTimeout(doneTimer)
            clearTimeout(safety)
        }
    }, [])

    if (done) return null

    return (
        <div
            id="app-splash"
            className={`app-splash${hidden ? ' app-splash--hidden' : ''}${forceShow ? ' app-splash--test-visible' : ''}`}
            data-testid="app-splash"
            aria-hidden="true"
        >
            <div className="app-splash__badge">
                <div className="app-splash__inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/logo.jpg"
                        alt=""
                        className="app-splash__logo"
                        width={512}
                        height={512}
                        fetchPriority="high"
                        decoding="async"
                    />
                </div>
            </div>
        </div>
    )
}
