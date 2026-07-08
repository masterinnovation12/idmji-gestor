/**
 * E2E — splash in-app de marca (PWA): fondo navy + logo en marco dorado.
 *
 * El splash solo se muestra en modo standalone. Como el navegador de pruebas no
 * está en standalone, usamos los hooks del componente:
 *  - ?pwaSplashHold=1  → visible y fijo (tests de estilo)
 *  - ?pwaSplashForce=1 → visible pero se autooculta (test de fundido)
 */
import { test, expect } from '@playwright/test'

test.describe('PWA splash de marca', () => {
    test('muestra el splash con logo en marco dorado al arrancar', async ({ page }) => {
        await page.goto('/?pwaSplashHold=1', { waitUntil: 'domcontentloaded' })

        const splash = page.getByTestId('app-splash')
        await expect(splash).toBeVisible()

        const badge = splash.locator('.app-splash__badge')
        await expect(badge).toHaveCSS('background-image', /gradient/)

        const logo = splash.locator('.app-splash__logo')
        await expect(logo).toHaveAttribute('src', /logo\.jpg/)
    })

    test('el fondo del splash es navy (igual que el splash del sistema)', async ({ page }) => {
        await page.goto('/?pwaSplashHold=1', { waitUntil: 'domcontentloaded' })
        const splash = page.getByTestId('app-splash')
        await expect(splash).toBeVisible()
        // #1f2e85 — mismo color que manifest background_color
        await expect(splash).toHaveCSS('background-color', 'rgb(31, 46, 133)')
    })

    test('el splash se desvanece cuando la app está lista', async ({ page }) => {
        await page.goto('/?pwaSplashForce=1', { waitUntil: 'domcontentloaded' })
        await expect(page.getByTestId('app-splash')).toBeVisible()
        await expect(page.getByTestId('app-splash')).toBeHidden({ timeout: 8000 })
    })

    test('sin standalone ni hooks el splash no se ve', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' })
        // Presente en el DOM pero oculto por CSS (display:none fuera de standalone).
        await expect(page.getByTestId('app-splash')).toBeHidden()
    })
})
