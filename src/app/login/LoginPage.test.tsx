/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import { I18nProvider } from '@/lib/i18n/I18nProvider'
import { ThemeProvider } from '@/lib/theme/ThemeProvider'

const push = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push, refresh }),
}))

vi.mock('next/image', () => ({
    default: (props: { alt?: string; className?: string }) => (
        <img alt={props.alt ?? ''} className={props.className} data-testid="login-logo-img" />
    ),
}))

vi.mock('./actions', () => ({
    login: vi.fn(),
}))

import { login } from './actions'

function renderLogin() {
    return render(
        <ThemeProvider>
            <I18nProvider>
                <LoginPage />
            </I18nProvider>
        </ThemeProvider>,
    )
}

describe('LoginPage — liquid premium', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        vi.mocked(login).mockResolvedValue({ error: 'Credenciales incorrectas' })
    })

    it('renderiza la tarjeta liquid con cabecera navy y logo en marco dorado', () => {
        renderLogin()
        expect(screen.getByTestId('login-liquid-root')).toBeTruthy()
        expect(screen.getByTestId('login-liquid-card')).toBeTruthy()
        expect(screen.getByTestId('login-liquid-card').className).toContain('ofrenda-liquid-card')
        expect(screen.getByTestId('login-liquid-headbar')).toBeTruthy()
        expect(screen.getByTestId('login-liquid-logo-badge')).toBeTruthy()
    })

    it('muestra campos, recordar, enviar y enlace de credenciales olvidadas', () => {
        renderLogin()
        expect(screen.getByTestId('login-email')).toBeTruthy()
        expect(screen.getByTestId('login-password')).toBeTruthy()
        expect(screen.getByTestId('login-submit')).toBeTruthy()
        expect(screen.getByTestId('login-forgot-link')).toBeTruthy()
        expect(screen.getByLabelText(/recordar credenciales/i)).toBeTruthy()
    })

    it('muestra error cuando el login falla', async () => {
        renderLogin()
        fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'a@b.com' } })
        fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'secret' } })
        fireEvent.click(screen.getByTestId('login-submit'))
        expect(await screen.findByTestId('login-error')).toBeTruthy()
        expect(screen.getByTestId('login-error').textContent).toContain('Credenciales incorrectas')
    })

    it('incluye controles de idioma y tema en la barra superior', () => {
        renderLogin()
        expect(screen.getByTestId('language-menu-trigger')).toBeTruthy()
        expect(screen.getByTestId('login-theme-toggle')).toBeTruthy()
    })

    it('el toggle de tema añade la clase dark en html', () => {
        renderLogin()
        expect(document.documentElement.classList.contains('dark')).toBe(false)
        fireEvent.click(screen.getByTestId('login-theme-toggle'))
        expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('el toggle vuelve a modo claro si ya estaba en dark', async () => {
        localStorage.setItem('theme', 'dark')
        renderLogin()
        await waitFor(() => {
            expect(document.documentElement.classList.contains('dark')).toBe(true)
        })
        fireEvent.click(screen.getByTestId('login-theme-toggle'))
        await waitFor(() => {
            expect(document.documentElement.classList.contains('dark')).toBe(false)
            expect(localStorage.getItem('theme')).toBe('light')
        })
    })
})
