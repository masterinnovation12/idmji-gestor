/**
 * QA rediseño "liquid premium" de /dashboard/instrucciones.
 *
 * IL01 Banner del culto con borde dorado + pestañas con identidad de color
 * IL02 Card de instrucción liquid: al abrirla, el contenido usa contexto claro
 *      fijo (card blanca y texto oscuro) INCLUSO con la clase dark en <html>
 * IL03 Accesibilidad: tablist/tab/tabpanel y aria-expanded del acordeón
 */
import { test, expect, type Locator, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'

const GOLD = /184,\s*150,\s*74/

async function borderColors(el: Locator): Promise<string> {
    return el.evaluate(node => {
        const s = getComputedStyle(node as Element)
        return [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor].join(' ')
    })
}

async function gotoInstrucciones(page: Page): Promise<boolean> {
    await page.goto('/dashboard/instrucciones', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    const ok = await loginIfNeeded(page)
    if (!ok) return false
    // loginIfNeeded termina en /dashboard: volver a la página objetivo
    if (!page.url().includes('/dashboard/instrucciones')) {
        await page.goto('/dashboard/instrucciones', { waitUntil: 'domcontentloaded' })
    }
    await page.waitForTimeout(2500)
    if (page.url().includes('/login')) return false
    return true
}

/** Va a la primera pestaña que tenga alguna instrucción publicada y la abre. */
async function openFirstPublishedCard(page: Page): Promise<Locator | null> {
    const tabs = page.getByRole('tab')
    const count = await tabs.count()
    for (let i = 0; i < count; i++) {
        await tabs.nth(i).click()
        await page.waitForTimeout(700)
        const toggle = page.locator('[aria-expanded="false"][aria-controls^="instruccion-content-"]').first()
        if (await toggle.isVisible({ timeout: 1500 }).catch(() => false)) {
            await toggle.click()
            await page.waitForTimeout(800)
            return toggle
        }
    }
    return null
}

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.describe('Instrucciones — rediseño liquid', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E en .env.e2e.local')
        const ok = await gotoInstrucciones(page)
        test.skip(!ok, 'Login falló o sesión caída (rate limit de auth)')
    })

    test('IL01 — banner con borde dorado y pestañas con identidad', async ({ page }) => {
        const banner = page.getByTestId('instrucciones-banner')
        await expect(banner).toBeVisible({ timeout: 15000 })
        expect(await borderColors(banner)).toMatch(GOLD)

        const tabs = page.getByRole('tablist').first()
        await expect(tabs).toBeVisible()
        expect(await page.getByRole('tab').count()).toBeGreaterThanOrEqual(1)
    })

    test('IL02 — card abierta mantiene contexto claro fijo incluso en dark', async ({ page }) => {
        const toggle = await openFirstPublishedCard(page)
        test.skip(!toggle, 'No hay instrucciones publicadas')

        const panel = page.locator('[id^="instruccion-content-"]').first()
        await expect(panel).toBeVisible()

        // Forzar dark y verificar por estilos computados (no por clases)
        await page.evaluate(() => document.documentElement.classList.add('dark'))
        await page.waitForTimeout(400)

        const card = page.locator('.ofrenda-liquid-card').first()
        const cardBg = await card.evaluate(n => getComputedStyle(n as Element).backgroundImage)
        expect(cardBg).toMatch(/255,\s*255,\s*255/) // gradiente blanco fijo

        const li = panel.locator('li').first()
        if (await li.isVisible().catch(() => false)) {
            const liColor = await li.evaluate(n => getComputedStyle(n as Element).color)
            // slate-700: texto oscuro (los tres canales RGB por debajo de 100)
            const rgb = liColor.match(/\d+/g)?.slice(0, 3).map(Number) ?? []
            expect(Math.max(...rgb)).toBeLessThan(100)
        }
        await page.evaluate(() => document.documentElement.classList.remove('dark'))
    })

    test('IL03 — accesibilidad del acordeón y las pestañas', async ({ page }) => {
        await expect(page.getByRole('tablist').first()).toBeVisible()
        await expect(page.getByRole('tabpanel')).toBeVisible()

        const toggle = await openFirstPublishedCard(page)
        test.skip(!toggle, 'No hay instrucciones publicadas')
        await expect(toggle!).toHaveAttribute('aria-expanded', 'true')
        await toggle!.click()
        await expect(toggle!).toHaveAttribute('aria-expanded', 'false')
    })
})
