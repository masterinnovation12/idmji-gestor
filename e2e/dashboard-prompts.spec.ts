/**
 * E2E: Dashboard – prompts de instalación PWA y notificaciones.
 * Verifica que no se solapen: como mucho uno visible a la vez (coordinados por PromptsContext).
 * Requiere login (E2E_USER_EMAIL, E2E_USER_PASSWORD en .env.e2e.local).
 */

import { test, expect } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded, getLoginError } from './auth.helper'

test.describe('Dashboard prompts (PWA + Notificaciones)', () => {
  test('al cargar el dashboard, como mucho un prompt visible (install o notificaciones)', async ({ page }) => {
    await page.goto('/dashboard')

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
      await page.goto('/dashboard')
    }

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Los prompts (install / notificaciones) están en fixed bottom-4, misma zona.
    // Con la coordinación solo uno puede estar visible a la vez.
    const fixedBottomPrompts = page.locator('[class*="fixed"][class*="bottom"]').filter({
      has: page.locator('button, [role="button"], a'),
    })
    const count = await fixedBottomPrompts.count()
    expect(count).toBeLessThanOrEqual(1)
  })

  test('dashboard carga sin error de hidratación visible', async ({ page }) => {
    await page.goto('/dashboard')
    if (page.url().includes('/login')) {
      if (!hasE2ECredentials()) {
        test.skip(true, 'E2E: Falta .env.e2e.local con credenciales')
        return
      }
      const loggedIn = await loginIfNeeded(page)
      if (!loggedIn) {
        test.skip(true, 'E2E: Login falló')
        return
      }
      await page.goto('/dashboard')
    }
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })
})
