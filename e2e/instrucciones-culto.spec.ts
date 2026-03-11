/**
 * E2E: Flujo de instrucciones de culto.
 * Usa credenciales de .env.e2e.local (E2E_USER_EMAIL, E2E_USER_PASSWORD).
 * Si no hay credenciales o el login falla, el test hace skip.
 * Alternativa: mismo flujo con MCP cursor-ide-browser, ver docs/E2E_INSTRUCCIONES_CULTO_MCP.md.
 */

import { test, expect } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded, getLoginError } from './auth.helper'

test.describe('Instrucciones de culto', () => {
  test('en detalle de culto el botón Ver instrucciones abre el modal', async ({ page }) => {
    await page.goto('/dashboard/cultos')

    if (page.url().includes('/login')) {
      if (!hasE2ECredentials()) {
        console.log('[E2E] Skip: Falta .env.e2e.local con E2E_USER_EMAIL y E2E_USER_PASSWORD')
        test.skip(true, 'E2E: Falta .env.e2e.local con E2E_USER_EMAIL y E2E_USER_PASSWORD')
        return
      }
      const loggedIn = await loginIfNeeded(page)
      if (!loggedIn) {
        const errMsg = await getLoginError(page)
        console.log('[E2E] Skip: Login falló. Mensaje en pantalla:', errMsg || '(sin mensaje)')
        test.skip(true, `E2E: Login falló (${errMsg || 'revisar credenciales'})`)
        return
      }
      await page.goto('/dashboard/cultos')
    }

    await expect(page).toHaveURL(/\/dashboard\/cultos/, { timeout: 10000 })

    // Ir al primer culto del listado (o al que tenga tipo Alabanza/Enseñanza/Estudio)
    const firstCultoLink = page.locator('a[href^="/dashboard/cultos/"]').first()
    await firstCultoLink.click()
    await expect(page).toHaveURL(/\/dashboard\/cultos\/[a-f0-9-]+/)

    // Buscar un botón "Ver instrucciones" (texto o aria-label)
    const verInstrucciones = page.getByRole('button', { name: /ver instrucciones|veure instruccions/i })
    await expect(verInstrucciones.first()).toBeVisible({ timeout: 10000 })
    await verInstrucciones.first().click()

    // El modal debe mostrarse
    const modal = page.getByTestId('instrucciones-culto-modal')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Cerrar modal (botón X o overlay)
    const closeBtn = page.getByRole('button', { name: /close|cerrar/i }).or(page.locator('button').filter({ has: page.locator('svg') }).first())
    if (await closeBtn.first().isVisible()) {
      await closeBtn.first().click()
    }
  })
})
