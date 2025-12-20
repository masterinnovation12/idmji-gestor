'use client'

import { useEffect } from 'react'

export function PWARegister() {
    useEffect(() => {
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
