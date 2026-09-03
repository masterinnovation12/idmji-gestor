/**
 * Ciclos de menú: abrir, cerrar, cambiar de página y volver.
 * Móvil (drawer) y desktop (sidebar).
 */
import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'
import {
    SIDEBAR_PATHS,
    attachPageErrorCollector,
    assertNoCrashBanner,
    assertNoHorizontalOverflow,
    waitForAppPage,
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

test.describe.configure({ timeout: 180_000 })

test.describe('Menú móvil — abrir, salir, cambiar de página', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const ok = await login(page)
        test.skip(!ok, 'Login falló')
    })

    test('abrir y cerrar el menú (botón y overlay) deja la página usable', async ({ page }) => {
        const { errors } = attachPageErrorCollector(page)
        const open = page.getByTestId('mobile-menu-abrir')
        await expect(open).toBeVisible()

        await open.click()
        const sidebar = page.getByTestId('sidebar-mobile')
        await expect(sidebar).toBeVisible()
        await expect(open).toHaveAttribute('aria-expanded', 'true')

        const overlay = page.getByTestId('mobile-menu-overlay')
        await overlay.click({ position: { x: 340, y: 120 } })
        await expect(overlay).toHaveCount(0)
        await expect(open).toHaveAttribute('aria-expanded', 'false')

        await waitForAppPage(page)
        await assertNoCrashBanner(page)
        await assertNoHorizontalOverflow(page)
        expect(errors).toEqual([])
    })

    test('navegar cada ítem del menú y volver al dashboard', async ({ page }) => {
        const { errors } = attachPageErrorCollector(page)
        const open = page.getByTestId('mobile-menu-abrir')

        for (const href of SIDEBAR_PATHS) {
            await open.click()
            const link = page.getByTestId('sidebar-mobile').locator(`a[data-nav-href="${href}"]`)
            if (!(await link.count())) continue
            await expect(link).toBeVisible()
            await link.click()
            await page.waitForURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/)?$`), { timeout: 20_000 })
            await waitForAppPage(page)
            await assertNoCrashBanner(page)
            await expect(page.getByTestId('mobile-menu-overlay')).toBeHidden()
        }

        await open.click()
        await page.getByTestId('sidebar-mobile').locator('a[data-nav-href="/dashboard"]').click()
        await page.waitForURL(/\/dashboard\/?$/, { timeout: 20_000 })
        await waitForAppPage(page)
        expect(errors).toEqual([])
    })
})

test.describe('Sidebar desktop — cambio de página', () => {
    test.use({ viewport: { width: 1920, height: 1080 } })

    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const ok = await login(page)
        test.skip(!ok, 'Login falló')
    })

    test('cada enlace del sidebar carga sin romper el layout', async ({ page }) => {
        const { errors } = attachPageErrorCollector(page)
        const sidebar = page.getByTestId('sidebar-desktop')
        await expect(sidebar).toBeVisible()

        for (const href of SIDEBAR_PATHS) {
            const link = sidebar.locator(`a[data-nav-href="${href}"]`)
            if (!(await link.count())) continue
            await link.click()
            await page.waitForURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/)?$`), { timeout: 20_000 })
            await waitForAppPage(page)
            await assertNoCrashBanner(page)
            await assertNoHorizontalOverflow(page)
            await expect(sidebar).toBeVisible()
        }
        expect(errors).toEqual([])
    })
})
