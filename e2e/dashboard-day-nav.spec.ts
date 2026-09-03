/**
 * Dashboard — navegación de días en móvil (prev/siguiente).
 * El día debe cambiar al instante; el contenido del culto no se rompe.
 */
import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'

test.use({ viewport: { width: 390, height: 844 } })
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

test.describe('Dashboard móvil — navegación de días', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const ok = await loginDashboard(page)
        test.skip(!ok, 'Login falló')
        await expect(page.getByTestId('dashboard-culto-navigator')).toBeVisible({ timeout: 20_000 })
    })

    test('el día cambia al instante al pulsar siguiente y anterior', async ({ page }) => {
        const dateEl = page.getByTestId('dashboard-nav-date')
        const start = await dateEl.getAttribute('data-date')
        expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/)

        const next = page.getByTestId('dashboard-nav-next')
        if (await next.isDisabled()) {
            await page.getByTestId('dashboard-nav-prev').click()
        }

        const before = await dateEl.getAttribute('data-date')
        await page.getByTestId('dashboard-nav-next').click()
        await expect(dateEl).not.toHaveAttribute('data-date', before!, { timeout: 2_000 })

        const afterNext = await dateEl.getAttribute('data-date')
        await page.getByTestId('dashboard-nav-prev').click()
        await expect(dateEl).toHaveAttribute('data-date', before!)
        expect(afterNext).not.toBe(before)
    })

    test('tres pulsaciones seguidas avanzan tres días', async ({ page }) => {
        const dateEl = page.getByTestId('dashboard-nav-date')
        const next = page.getByTestId('dashboard-nav-next')
        const start = await dateEl.getAttribute('data-date')
        expect(start).toBeTruthy()

        let clicks = 0
        for (let i = 0; i < 3; i++) {
            if (await next.isDisabled()) break
            await next.click()
            clicks++
        }
        expect(clicks).toBeGreaterThan(0)
        const after = await dateEl.getAttribute('data-date')
        expect(after).not.toBe(start)

        const startMs = Date.parse(`${start}T12:00:00`)
        const afterMs = Date.parse(`${after}T12:00:00`)
        expect(afterMs - startMs).toBe(clicks * 86_400_000)
    })

    test('pulsar varios días seguidos no deja el navegador bloqueado', async ({ page }) => {
        const dateEl = page.getByTestId('dashboard-nav-date')
        const next = page.getByTestId('dashboard-nav-next')
        const prev = page.getByTestId('dashboard-nav-prev')
        const origin = await dateEl.getAttribute('data-date')

        for (let i = 0; i < 3; i++) {
            if (await next.isDisabled()) break
            await next.click()
        }
        const forward = await dateEl.getAttribute('data-date')
        expect(forward).not.toBe(origin)

        for (let i = 0; i < 3; i++) {
            if (await prev.isDisabled()) break
            await prev.click()
        }

        await expect(page.getByTestId('dashboard-culto-navigator')).toBeVisible()
        await expect(page.getByTestId('dashboard-nav-content')).toHaveCount(1)
        await expect(page.getByTestId('dashboard-nav-content')).toBeVisible()
        await expect(page.getByTestId('dashboard-nav-content')).not.toHaveAttribute('aria-busy', 'true', { timeout: 10_000 })
    })

    test('en el límite del rango el botón correspondiente queda deshabilitado', async ({ page }) => {
        const dateEl = page.getByTestId('dashboard-nav-date')
        const prev = page.getByTestId('dashboard-nav-prev')
        const next = page.getByTestId('dashboard-nav-next')

        for (let i = 0; i < 25; i++) {
            if (await prev.isDisabled()) break
            await prev.click()
        }
        await expect(prev).toBeDisabled()
        const minDate = await dateEl.getAttribute('data-date')
        expect(minDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

        for (let i = 0; i < 40; i++) {
            if (await next.isDisabled()) break
            await next.click()
        }
        await expect(next).toBeDisabled()
        const maxDate = await dateEl.getAttribute('data-date')
        expect(maxDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(maxDate).not.toBe(minDate)

        await expect(page.getByTestId('dashboard-nav-content')).toHaveCount(1)
        await expect(page.getByTestId('dashboard-nav-content')).toBeVisible()
    })

    test('el contenido del día es culto o vacío, nunca un estado roto', async ({ page }) => {
        const next = page.getByTestId('dashboard-nav-next')
        const prev = page.getByTestId('dashboard-nav-prev')

        for (let i = 0; i < 4; i++) {
            if (await next.isDisabled()) await prev.click()
            else await next.click()
            const content = page.getByTestId('dashboard-nav-content')
            await expect(content).toHaveCount(1)
            await expect(content).toBeVisible()
            const text = ((await content.innerText()) || '').trim()
            expect(text.length).toBeGreaterThan(0)
        }
    })

    test('al volver del detalle del culto el navegador sigue entero', async ({ page }) => {
        const detail = page.getByRole('link', { name: /detalle|detall/i }).first()
        test.skip(!await detail.isVisible().catch(() => false), 'No hay enlace al detalle en este día')
        await detail.click()
        await expect(page).toHaveURL(/\/dashboard\/cultos\//, { timeout: 15_000 })
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        await expect(page.getByTestId('dashboard-culto-navigator')).toBeVisible({ timeout: 20_000 })
        await expect(page.getByTestId('dashboard-nav-content')).toHaveCount(1)
        const text = ((await page.getByTestId('dashboard-nav-content').innerText()) || '').trim()
        expect(text.length).toBeGreaterThan(0)
        await page.getByTestId('dashboard-nav-next').click()
        await expect(page.getByTestId('dashboard-nav-content')).toBeVisible()
    })
})
