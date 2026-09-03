/**
 * E2E: Página Archivos (Google Sheets).
 * La página debe pintar al instante; los datos CSV pueden tardar o fallar
 * si Google responde 500 — eso no es un crash de la app.
 */
import { test, expect } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded, getLoginError } from './auth.helper'

test.describe('Archivos', () => {
  test('pinta al instante con pestañas; datos o aviso de Sheets', async ({ page }) => {
    const started = Date.now()
    await page.goto('/dashboard/archivos', { waitUntil: 'domcontentloaded' })

    if (page.url().includes('/login')) {
      if (!hasE2ECredentials()) {
        test.skip(true, 'E2E: Falta .env.e2e.local con credenciales')
        return
      }
      const loggedIn = await loginIfNeeded(page)
      if (!loggedIn) {
        const errMsg = await getLoginError(page)
        test.skip(true, `E2E: Login falló (${errMsg || 'revisar credenciales'})`)
        return
      }
      await page.goto('/dashboard/archivos', { waitUntil: 'domcontentloaded' })
    }

    await expect(page).toHaveURL(/\/dashboard\/archivos/, { timeout: 15_000 })
    await expect(page.locator('main')).toBeVisible()
    expect(Date.now() - started, 'Archivos no debe bloquear el TTFB con Google Sheets').toBeLessThan(12_000)

    const tabs = page.getByRole('button', { name: /enseñanzas|estudios|instituto|pastorado|ensenyan/i })
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 })

    const rows = page.getByTestId('archivo-table-row')
    const cards = page.getByTestId('archivo-card')
    const sheetsAlert = page.getByRole('alert')
    await expect(rows.or(cards).or(sheetsAlert).first()).toBeVisible({ timeout: 20_000 })
  })

  test('cambiar de pestaña mantiene la página usable', async ({ page }) => {
    await page.goto('/dashboard/archivos', { waitUntil: 'domcontentloaded' })
    if (page.url().includes('/login') && hasE2ECredentials()) {
      await loginIfNeeded(page)
      await page.goto('/dashboard/archivos', { waitUntil: 'domcontentloaded' })
    }
    if (page.url().includes('/login')) {
      test.skip(true, 'E2E: Sin login')
      return
    }

    const estudiosTab = page.getByRole('button', { name: /estudios bíblicos/i })
    await expect(estudiosTab).toBeVisible({ timeout: 10_000 })
    await estudiosTab.click()
    await expect(page.locator('main')).toBeVisible()
    await expect(estudiosTab).toBeVisible()
  })
})
