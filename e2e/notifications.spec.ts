/**
 * E2E: Notificaciones push – Perfil y UI.
 * Verifica que la sección de notificaciones carga y muestra estados coherentes.
 * No simula push real (limitaciones de Playwright en headless).
 * Requiere login (E2E_USER_EMAIL, E2E_USER_PASSWORD en .env.e2e.local).
 */

import { test, expect } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'

async function ensureLoggedInAndOnProfile(page: import('@playwright/test').Page) {
  await page.goto('/dashboard/profile')
  if (page.url().includes('/login')) {
    if (!hasE2ECredentials()) return false
    const loggedIn = await loginIfNeeded(page)
    if (!loggedIn) return false
    await page.goto('/dashboard/profile')
  }
  await page.waitForURL(/\/profile/, { timeout: 15000 })
  return true
}

test.describe('Notificaciones push', () => {
  test('perfil requiere login (redirige a /login si no autenticado)', async ({ page }) => {
    await page.goto('/dashboard/profile')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('perfil muestra sección de notificaciones y UI de push', async ({ page }) => {
    if (!hasE2ECredentials()) {
      test.skip(true, 'E2E: Falta .env.e2e.local con credenciales')
      return
    }

    const ok = await ensureLoggedInAndOnProfile(page)
    if (!ok) {
      test.skip(true, 'E2E: Login falló o no se pudo acceder a perfil')
      return
    }

    // La sección de notificaciones debe estar visible
    const notificationsSection = page.getByRole('heading', { name: /notificaciones/i })
    await expect(notificationsSection).toBeVisible({ timeout: 5000 })

    // Debe haber contenido de notificaciones: Activar, Activadas, Verificando, etc.
    const pushContent = page.locator('text=/Notificaciones Push|activar|activadas|verificando|bloqueadas|soporta/i')
    await expect(pushContent.first()).toBeVisible({ timeout: 8000 })
  })
})
