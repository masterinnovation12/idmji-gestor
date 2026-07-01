/**
 * E2E — Login Liquid Glass Premium (desktop, tablet, móvil).
 * Comprueba estructura visual navy+dorado, formulario y controles.
 */
import { test, expect } from '@playwright/test'

const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'desktop-wide', width: 1920, height: 1080 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'mobile-small', width: 320, height: 568 },
] as const

for (const vp of viewports) {
    test.describe(`Login liquid (${vp.name})`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } })

        test.beforeEach(async ({ page }) => {
            await page.addInitScript(() => {
                localStorage.setItem('language', 'es-ES')
            })
            await page.goto('/login', { waitUntil: 'domcontentloaded' })
        })

        test('tarjeta liquid con marco dorado y cabecera navy', async ({ page }) => {
            const card = page.getByTestId('login-liquid-card')
            await expect(card).toBeVisible()
            await expect(card).toHaveClass(/ofrenda-liquid-card/)

            const hasGoldRim = await card.evaluate(el => {
                const after = getComputedStyle(el, '::after').backgroundImage
                return after && after !== 'none'
            })
            expect(hasGoldRim).toBe(true)

            const headbar = page.getByTestId('login-liquid-headbar')
            await expect(headbar).toBeVisible()
            await expect(headbar).toHaveClass(/ofrenda-liquid-headbar/)
        })

        test('logo en badge dorado y formulario completo', async ({ page }) => {
            await expect(page.getByTestId('login-liquid-logo-badge')).toBeVisible()
            await expect(page.getByTestId('login-email')).toBeVisible()
            await expect(page.getByTestId('login-password')).toBeVisible()
            await expect(page.getByTestId('login-submit')).toBeVisible()
            await expect(page.getByTestId('login-forgot-link')).toBeVisible()
            await expect(page.getByTestId('login-theme-toggle')).toBeVisible()
            await expect(page.getByTestId('language-menu-trigger')).toBeVisible()
        })

        test('textos de bienvenida visibles', async ({ page }) => {
            const headbar = page.getByTestId('login-liquid-headbar')
            await expect(headbar.getByText('IDMJI Sabadell')).toBeVisible()
            await expect(headbar.getByText('Gestor de Púlpito')).toBeVisible()
            await expect(headbar.getByText(/Accede al panel de cultos/i)).toBeVisible()
            await expect(page.getByText(/Iglesia de Dios Ministerial/i)).toBeVisible()
        })

        test('botón enviar usa estilo liquid primary', async ({ page }) => {
            const submit = page.getByTestId('login-submit')
            await expect(submit).toHaveClass(/ofrenda-liquid-btn-primary/)
        })

        test('fondo navy de pantalla completa', async ({ page }) => {
            const root = page.getByTestId('login-liquid-root')
            await expect(root).toBeVisible()
            const backdrop = root.locator('.login-liquid-backdrop')
            await expect(backdrop).toBeAttached()
        })
    })
}
