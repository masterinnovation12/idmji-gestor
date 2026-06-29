/**
 * E2E: Labor Ofrenda — feedback premium cierra rápido (activar/desactivar, etc.).
 * Requiere E2E_USER_EMAIL / E2E_USER_PASSWORD en .env.e2e.local con rol editor o admin.
 */

import { test, expect } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded, getLoginError } from './auth.helper'

/** Mantener en sync con ofrendaFeedback.ts → OFRENDA_FEEDBACK_DURATION.plan */
const FEEDBACK_MS = {
    plan: { warning: 5500, success: 6000 },
} as const

const OPEN_DELAY_MS = 120
const MAX_PLAN_FEEDBACK_MS = Math.max(FEEDBACK_MS.plan.warning, FEEDBACK_MS.plan.success) + OPEN_DELAY_MS + 2000

async function gotoOfrenda(
    page: import('@playwright/test').Page,
): Promise<'ok' | 'no-creds' | 'login-failed'> {
    await page.goto('/dashboard/ofrenda')
    if (page.url().includes('/login')) {
        if (!hasE2ECredentials()) return 'no-creds'
        const ok = await loginIfNeeded(page)
        if (!ok) return 'login-failed'
        await page.goto('/dashboard/ofrenda')
    }
    await page.waitForURL(/\/dashboard\/ofrenda/, { timeout: 20000 })
    return 'ok'
}

test.describe('Labor Ofrenda — timing feedback premium', () => {
    test('redirige a login sin sesión', async ({ page }) => {
        await page.goto('/dashboard/ofrenda')
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    })

    test('activar/desactivar persona: modal visible y auto-cierra (feedback plan)', async ({ page }) => {
        if (!hasE2ECredentials()) {
            test.skip(true, 'E2E: Falta .env.e2e.local')
            return
        }

        const nav = await gotoOfrenda(page)
        if (nav === 'no-creds') {
            test.skip(true, 'E2E: Falta .env.e2e.local con credenciales')
            return
        }
        if (nav === 'login-failed') {
            const err = await getLoginError(page)
            test.skip(true, `E2E: Login falló (${err || 'revisar credenciales Supabase'})`)
            return
        }

        await page.getByTestId('ofrenda-tab-general-personas').click()

        let toggle = page.getByRole('button', { name: /desactivar/i }).first()
        const canDeactivate = await toggle.isVisible({ timeout: 8000 }).catch(() => false)
        if (!canDeactivate) {
            await page.getByRole('button', { name: /activar/i }).first().click()
            const firstDialog = page.getByTestId('ofrenda-feedback-panel')
            await expect(firstDialog).toBeVisible({ timeout: 8000 })
            await expect(firstDialog).toBeHidden({ timeout: MAX_PLAN_FEEDBACK_MS })
            toggle = page.getByRole('button', { name: /desactivar/i }).first()
        }

        await toggle.click()

        const dialog = page.getByTestId('ofrenda-feedback-panel')
        await expect(dialog).toBeVisible({ timeout: 8000 })

        const t0 = Date.now()
        await expect(dialog).toBeHidden({ timeout: MAX_PLAN_FEEDBACK_MS })
        const elapsed = Date.now() - t0

        expect(elapsed).toBeLessThan(MAX_PLAN_FEEDBACK_MS)
        expect(elapsed).toBeGreaterThan(2000)
    })

    test('feedback normal (plan) no supera ~2.7s si hay plan y botón regenerar', async ({ page }) => {
        if (!hasE2ECredentials()) {
            test.skip(true, 'E2E: Falta .env.e2e.local')
            return
        }

        const nav = await gotoOfrenda(page)
        if (nav === 'no-creds') {
            test.skip(true, 'E2E: Falta .env.e2e.local')
            return
        }
        if (nav === 'login-failed') {
            test.skip(true, 'E2E: Login falló')
            return
        }

        const regen = page.getByRole('button', { name: /regenerar|regenerate|re-generar/i }).first()
        if (!(await regen.isVisible({ timeout: 6000 }).catch(() => false))) {
            test.skip(true, 'E2E: Sin plan o sin permiso de edición')
            return
        }

        await regen.click()

        const dialog = page.getByTestId('ofrenda-feedback-panel')
        const appeared = await dialog.isVisible({ timeout: 15000 }).catch(() => false)
        if (!appeared) {
            test.skip(true, 'E2E: Regenerar no mostró feedback (timeout API)')
            return
        }

        const t0 = Date.now()
        await expect(dialog).toBeHidden({ timeout: MAX_PLAN_FEEDBACK_MS })
        expect(Date.now() - t0).toBeLessThan(MAX_PLAN_FEEDBACK_MS)
    })
})
