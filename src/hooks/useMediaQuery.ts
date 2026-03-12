'use client'

import { useState, useEffect } from 'react'

/**
 * Hook que detecta si el viewport cumple una media query.
 * Útil para renderizado condicional basado en tamaño de pantalla.
 * @param query - Media query (ej: '(max-width: 639px)' para móvil)
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = (globalThis as typeof window).matchMedia(query)
    setMatches(media.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [query])

  return matches
}

/** Vista móvil: viewport < 640px (Tailwind sm) */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)')
}
