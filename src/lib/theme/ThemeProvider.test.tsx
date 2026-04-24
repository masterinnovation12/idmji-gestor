/** @vitest-environment happy-dom */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeProvider'

function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme()
    return (
        <button type="button" data-testid="theme-toggle" onClick={toggleTheme}>
            {isDark ? 'dark-ui' : 'light-ui'}
        </button>
    )
}

beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
})

afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
})

describe('ThemeProvider (independiente del sistema)', () => {
    it('por defecto no aplica .dark en <html> (modo claro)', async () => {
        render(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>
        )
        await waitFor(() => {
            expect(document.documentElement.classList.contains('dark')).toBe(false)
        })
    })

    it('toggleTheme alterna y persiste theme en localStorage', async () => {
        render(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>
        )
        await waitFor(() => expect(screen.getByTestId('theme-toggle')).toBeInTheDocument())

        fireEvent.click(screen.getByTestId('theme-toggle'))
        await waitFor(() => {
            expect(document.documentElement.classList.contains('dark')).toBe(true)
            expect(localStorage.getItem('theme')).toBe('dark')
        })

        fireEvent.click(screen.getByTestId('theme-toggle'))
        await waitFor(() => {
            expect(document.documentElement.classList.contains('dark')).toBe(false)
            expect(localStorage.getItem('theme')).toBe('light')
        })
    })

    it('respeta theme=dark ya guardado al montar', async () => {
        localStorage.setItem('theme', 'dark')
        render(
            <ThemeProvider>
                <ThemeToggle />
            </ThemeProvider>
        )
        await waitFor(() => {
            expect(document.documentElement.classList.contains('dark')).toBe(true)
        })
    })
})
