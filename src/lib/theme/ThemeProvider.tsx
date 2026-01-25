'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface ThemeContextType {
    isDark: boolean
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme')
            // Solo activar dark si el usuario lo guardó explícitamente.
            // Ignoramos la preferencia del sistema (matchMedia) para total independencia.
            return saved === 'dark'
        }
        return false
    })

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDark])

    const toggleTheme = () => {
        setIsDark(prev => {
            const newValue = !prev
            localStorage.setItem('theme', newValue ? 'dark' : 'light')

            if (newValue) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }

            return newValue
        })
    }

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}
