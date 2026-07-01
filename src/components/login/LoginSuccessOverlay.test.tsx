/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoginSuccessOverlay } from './LoginSuccessOverlay'

vi.mock('@/lib/i18n/I18nProvider', () => ({
    useI18n: () => ({
        t: (k: string) => {
            const map: Record<string, string> = {
                'login.success': '¡Bienvenido!',
                'login.successDetail': 'Acceso concedido correctamente',
                'login.redirecting': 'Entrando...',
            }
            return map[k] ?? k
        },
    }),
}))

describe('LoginSuccessOverlay', () => {
    it('no renderiza cuando está cerrado', () => {
        render(<LoginSuccessOverlay open={false} />)
        expect(screen.queryByTestId('login-success-overlay')).toBeNull()
    })

    it('muestra mensaje de bienvenida con tarjeta dorada', () => {
        render(<LoginSuccessOverlay open />)
        const overlay = screen.getByTestId('login-success-overlay')
        expect(overlay).toBeTruthy()
        expect(overlay.textContent).toContain('¡Bienvenido!')
        expect(overlay.textContent).toContain('Acceso concedido correctamente')
        expect(overlay.textContent).toContain('Entrando...')
        expect(overlay.querySelector('.login-success-card')).toBeTruthy()
    })
})
