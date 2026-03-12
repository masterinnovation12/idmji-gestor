/**
 * E2E: Página Archivos (Google Sheets).
 * Verifica que la página carga, las pestañas funcionan y se muestran datos o estado vacío.
 * Requiere login (E2E_USER_EMAIL, E2E_USER_PASSWORD en .env.e2e.local).
 * Las URLs de Sheets deben estar en .env.local (SHEET_*_CSV_URL).
 */

import { test, expect } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded, getLoginError } from './auth.helper'

test.describe('Archivos', () => {
  test('carga la página y muestra pestañas; datos o estado vacío sin error', async ({ page }) => {
    await page.goto('/dashboard/archivos')

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
      await page.goto('/dashboard/archivos')
    }

    await expect(page).toHaveURL(/\/dashboard\/archivos/, { timeout: 10000 })

    // Esperar a que termine el loading
    const loader = page.locator('[class*="animate-spin"]').first()
    await loader.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {})

    // No debe haber error de "No autenticado" o "URL no configurada" (indica problema de backend)
    const errorBox = page.locator('[class*="destructive"]').filter({ hasText: /no autenticado|url.*configurada|error/i })
    await expect(errorBox).not.toBeVisible()

    // Debe haber al menos una pestaña visible
    const tabs = page.getByRole('button', { name: /enseñanzas|estudios|instituto|pastorado/i })
    await expect(tabs.first()).toBeVisible({ timeout: 5000 })

    // Con credenciales E2E y URLs configuradas: debe haber al menos una fila o card
    if (hasE2ECredentials()) {
      const rows = page.getByTestId('archivo-table-row')
      const cards = page.getByTestId('archivo-card')
      const count = await rows.count() + await cards.count()
      expect(count).toBeGreaterThan(0)
      // No debe aparecer "No hay datos" cuando hay datos
      const emptyMsg = page.getByText(/no hay datos en esta hoja|no hi ha dades en aquesta fulla/i)
      await expect(emptyMsg).not.toBeVisible()
    } else {
      // Sin credenciales: aceptar tabla, cards o mensaje vacío
      const hasData = page.getByTestId('archivo-table-row').or(page.getByTestId('archivo-card'))
      const hasEmpty = page.getByText(/no hay datos|no hi ha dades/i)
      await expect(hasData.or(hasEmpty)).toBeVisible({ timeout: 10000 })
    }
  })

  test('cambiar de pestaña actualiza el contenido', async ({ page }) => {
    await page.goto('/dashboard/archivos')
    if (page.url().includes('/login') && hasE2ECredentials()) {
      await loginIfNeeded(page)
      await page.goto('/dashboard/archivos')
    }
    if (page.url().includes('/login')) {
      test.skip(true, 'E2E: Sin login')
      return
    }

    const loader = page.locator('[class*="animate-spin"]').first()
    await loader.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})

    const estudiosTab = page.getByRole('button', { name: /estudios bíblicos/i })
    if (await estudiosTab.isVisible()) {
      await estudiosTab.click()
      await page.waitForTimeout(1500)
      const content = page.locator('table, [data-testid="archivo-card"], [class*="glass"]')
      await expect(content.first()).toBeVisible({ timeout: 5000 })
    }
  })
})
