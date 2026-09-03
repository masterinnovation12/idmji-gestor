/**
 * Desktop fullscreen (1920×1080): añadir lectura desde el dashboard
 * debe dejar escribir al instante, sin segundo clic en el buscador.
 * No guarda lecturas (Sabadell es producción).
 */
import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'

test.use({ viewport: { width: 1920, height: 1080 } })
test.describe.configure({ timeout: 90_000 })

async function loginDashboard(page: Page): Promise<boolean> {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    if (page.url().includes('/login')) {
        if (!hasE2ECredentials()) return false
        if (!(await loginIfNeeded(page))) return false
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    }
    return page.url().includes('/dashboard') && !page.url().includes('/login')
}

test.describe('Dashboard desktop — añadir lectura', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const ok = await loginDashboard(page)
        test.skip(!ok, 'Login falló')
        await expect(page.getByTestId('dashboard-culto-navigator')).toBeVisible({ timeout: 20_000 })
    })

    test('al abrir el modal, el buscador recibe el teclado sin segundo clic', async ({ page }) => {
        const addBtn = page.getByTestId('dashboard-add-lectura').first()
        if (!(await addBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
            test.skip(true, 'El culto visible no tiene botón de añadir lectura')
            return
        }

        await addBtn.click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        const input = page.getByTestId('bible-search-input')
        await expect(input).toBeFocused({ timeout: 4_000 })

        await page.keyboard.type('Mate')
        await expect(input).toHaveValue(/Mate/i)
        await expect(page.getByTestId('bible-book-option').first()).toBeVisible({ timeout: 8_000 })

        await page.getByTestId('app-modal-close').click()
        await expect(dialog).toHaveCount(0)
    })

    test('un focus de ventana (refetch) no roba el teclado del buscador', async ({ page }) => {
        const addBtn = page.getByTestId('dashboard-add-lectura').first()
        if (!(await addBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
            test.skip(true, 'El culto visible no tiene botón de añadir lectura')
            return
        }

        await addBtn.click()
        const input = page.getByTestId('bible-search-input')
        await expect(input).toBeFocused({ timeout: 4_000 })

        await page.evaluate(() => window.dispatchEvent(new Event('focus')))
        await page.waitForTimeout(250)
        await expect(input).toBeFocused()
        await page.keyboard.type('Sal')
        await expect(input).toHaveValue(/Sal/i)

        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
    })
})
