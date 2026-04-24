'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import { ThemeProvider as NextThemesProvider, useTheme as useNextThemes } from 'next-themes'

/**
 * Tema de la aplicación: solo «light» o «dark», persistido en localStorage.
 *
 * Prácticas aplicadas (next-themes + Tailwind class strategy):
 * - `enableSystem={false}`: el modo del SO (prefers-color-scheme) NO fuerza el tema.
 *   El usuario puede usar modo claro en la app aunque el móvil/PC esté en oscuro.
 * - `defaultTheme="light"`: primera visita sin clave guardada = día.
 * - `attribute="class"` + clase `dark` en <html>: coherente con `@custom-variant dark` en globals.css.
 * - `enableColorScheme`: el navegador ajusta scrollbars/controles nativos al tema elegido (menos sensación de «medio oscuro»).
 * - Script interno de next-themes: reduce el flash al cargar (SSR vs cliente).
 *
 * Clave `theme` en localStorage: valores `light` | `dark` (compatible con la versión anterior).
 */
const STORAGE_KEY = 'theme'

interface AppThemeContextType {
    isDark: boolean
    toggleTheme: () => void
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined)

function AppThemeBridge({ children }: Readonly<{ children: ReactNode }>) {
    const { resolvedTheme, setTheme } = useNextThemes()
    const [mounted, setMounted] = useState(false)

     
    useEffect(() => {
        setMounted(true)
    }, [])

    const isDark = mounted && resolvedTheme === 'dark'

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    }, [setTheme])

    const value = useMemo(() => ({ isDark, toggleTheme }), [isDark, toggleTheme])

    return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="light"
            themes={['light', 'dark']}
            enableSystem={false}
            enableColorScheme
            storageKey={STORAGE_KEY}
            disableTransitionOnChange
        >
            <AppThemeBridge>{children}</AppThemeBridge>
        </NextThemesProvider>
    )
}

export function useTheme() {
    const ctx = useContext(AppThemeContext)
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return ctx
}
