/**
 * Humo senior por página: carga, sin crash, sin overflow, contraste legible.
 * Desktop fullscreen y móvil. Un login, ciclo completo.
 */
import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'
import {
    APP_PAGES,
    attachPageErrorCollector,
    assertPageLooksHealthy,
} from './page-health.helper'

async function login(page: Page): Promise<boolean> {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    if (page.url().includes('/login')) {
        if (!hasE2ECredentials()) return false
        if (!(await loginIfNeeded(page))) return false
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    }
    return page.url().includes('/dashboard') && !page.url().includes('/login')
}

test.describe.configure({ timeout: 240_000 })

for (const viewport of [
    { label: 'desktop-fullscreen', width: 1920, height: 1080 },
    { label: 'mobile', width: 390, height: 844 },
] as const) {
    test.describe(`Páginas — ${viewport.label}`, () => {
        test.describe.configure({ mode: 'serial' })
        test.beforeEach(async ({ page }) => {
            test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
            await page.setViewportSize({ width: viewport.width, height: viewport.height })
            const ok = await login(page)
            test.skip(!ok, 'Login falló')
        })

        test(`ciclo completo: cada página carga y se ve bien (${viewport.label})`, async ({ page }) => {
            const { errors } = attachPageErrorCollector(page)
            for (const p of APP_PAGES) {
                errors.length = 0
                await page.goto(p.path, { waitUntil: 'domcontentloaded', timeout: 45_000 })
                await expect(page.locator('main'), p.path).toBeVisible({ timeout: 20_000 })
                if (page.url().includes('/login')) {
                    test.info().annotations.push({ type: 'skip-page', description: `${p.name} redirigió a login` })
                    continue
                }
                await assertPageLooksHealthy(page, errors)
            }
        })
    })
}
