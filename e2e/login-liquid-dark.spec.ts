/**
 * E2E — Login liquid modo oscuro (Chromium, multi-viewport).
 * Verifica que el tema oscuro aplica sin romper el diseño navy+dorado.
 */
import { test, expect } from '@playwright/test'

const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
] as const

const DARK_BODY_BG = 'rgb(15, 23, 42)'

for (const vp of viewports) {
    test.describe(`Login liquid dark (${vp.name})`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } })

        test.beforeEach(async ({ page }) => {
            await page.addInitScript(() => {
                localStorage.setItem('language', 'es-ES')
                localStorage.setItem('theme', 'dark')
            })
            await page.goto('/login', { waitUntil: 'networkidle' })
        })

        test('html tiene clase dark al cargar', async ({ page }) => {
            await expect(page.locator('html')).toHaveClass(/dark/)
        })

        test('cuerpo del formulario usa fondo oscuro', async ({ page }) => {
            const body = page.locator('.login-liquid-body')
            await expect(body).toBeVisible()
            await expect(body).toHaveCSS('background-color', DARK_BODY_BG)
        })

        test('marco dorado y cabecera navy se mantienen', async ({ page }) => {
            const card = page.getByTestId('login-liquid-card')
            await expect(card).toBeVisible()
            const hasGoldRim = await card.evaluate(el => {
                const after = getComputedStyle(el, '::after').backgroundImage
                return after && after !== 'none'
            })
            expect(hasGoldRim).toBe(true)
            await expect(page.getByTestId('login-liquid-headbar')).toHaveClass(/ofrenda-liquid-headbar/)
        })

        test('inputs legibles en oscuro', async ({ page }) => {
            const email = page.getByTestId('login-email')
            await expect(email).toHaveCSS('background-color', 'rgb(30, 41, 59)')
            await expect(email).toHaveCSS('color', 'rgb(248, 250, 252)')
        })

        test('toggle vuelve a modo claro', async ({ page }) => {
            await expect(page.locator('html')).toHaveClass(/dark/)
            await page.getByTestId('login-theme-toggle').click()
            await expect.poll(async () => page.evaluate(() => localStorage.getItem('theme'))).toBe('light')
            await expect(page.locator('html')).not.toHaveClass(/dark/)
            await expect(page.locator('.login-liquid-body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
        })
    })
}
