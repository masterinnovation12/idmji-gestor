/**
 * E2E: aviso preventivo libro+capítulo al registrar lectura.
 * Requiere E2E_USER_EMAIL / E2E_USER_PASSWORD en .env.e2e.local.
 */
import { test, expect } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded, getLoginError } from './auth.helper'

test.describe('Aviso capítulo en historial', () => {
    test.beforeEach(async ({ page }) => {
        if (!hasE2ECredentials()) {
            test.skip(true, 'Sin credenciales E2E en .env.e2e.local')
        }
        await page.goto('/login', { waitUntil: 'domcontentloaded' })
        const loggedIn = await loginIfNeeded(page)
        if (!loggedIn) {
            const err = await getLoginError(page)
            test.skip(true, `Login E2E falló: ${err || 'desconocido'}`)
        }
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        await page.waitForURL(/\/dashboard/, { timeout: 20000 })
    })

    test('dashboard: blur en capítulo muestra aviso o permite versículos', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: /añadir lectura/i }).first()
        await addBtn.waitFor({ state: 'visible', timeout: 15000 })
        await addBtn.click()

        const modal = page.getByRole('dialog').or(page.locator('[class*="Modal"]').first())
        await expect(page.getByPlaceholder(/Buscar libro/i)).toBeVisible({ timeout: 10000 })

        await page.getByPlaceholder(/Buscar libro/i).fill('Juan')
        await page.getByRole('button', { name: /^Juan$/i }).first().click({ timeout: 8000 })

        const capInput = page.getByPlaceholder('Ej: 1')
        await capInput.fill('3')
        await capInput.blur()

        await page.waitForTimeout(1500)

        const alert = page.getByRole('alert')
        const versesStart = page.getByPlaceholder('Inicio')

        if (await alert.isVisible()) {
            await expect(alert).toContainText(/capítulo|capítol|ya leído|ja llegit/i)
            await expect(versesStart).toBeDisabled()

            const noBtn = page.getByRole('button', { name: /^no$/i })
            if (await noBtn.isVisible()) {
                await noBtn.click()
                await expect(alert).not.toBeVisible({ timeout: 5000 })
                await expect(capInput).toHaveValue('')
                await expect(page.getByPlaceholder(/Buscar libro/i)).toHaveValue('Juan')
            }
        } else {
            await expect(versesStart).toBeEnabled({ timeout: 5000 })
        }
    })
})
