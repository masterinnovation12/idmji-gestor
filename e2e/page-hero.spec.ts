/**
 * QA — Encabezado unificado (PageHero) en todo el dashboard.
 *
 * Verifica que las páginas que antes NO tenían el hero "liquid" (marino + dorado)
 * ahora lo comparten, y que las de referencia (cultos, hermanos) lo siguen usando,
 * tanto en móvil (390px) como en desktop (1440px).
 *
 * Contrato visual del hero:
 *  - borde dorado (rgb 184,150,74)
 *  - fondo con gradiente marino (#1f2e85 → #151f5c)
 *  - un <h1> visible dentro
 */
import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'

const GOLD = /184,\s*150,\s*74/

const PAGES: ReadonlyArray<{ name: string; path: string; desktopOnly?: boolean }> = [
    { name: 'cultos', path: '/dashboard/cultos' },
    { name: 'hermanos', path: '/dashboard/hermanos' },
    { name: 'instrucciones', path: '/dashboard/instrucciones' },
    { name: 'profile', path: '/dashboard/profile' },
    { name: 'temas-alabanza', path: '/dashboard/historial/temas-alabanza' },
    { name: 'historial-lecturas', path: '/dashboard/historial/lecturas' },
    { name: 'himnario', path: '/dashboard/himnario' },
    { name: 'festivos', path: '/dashboard/festivos' },
    { name: 'archivos', path: '/dashboard/archivos' },
    { name: 'admin-stats', path: '/dashboard/admin/stats' },
    { name: 'admin-users', path: '/dashboard/admin/users' },
    { name: 'admin-audit', path: '/dashboard/admin/audit' },
    { name: 'dashboard-home', path: '/dashboard' },
    { name: 'labores-ofrenda', path: '/dashboard/ofrenda' },
]

async function goto(page: Page, path: string): Promise<boolean> {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    const ok = await loginIfNeeded(page)
    if (!ok) return false
    if (!page.url().includes(path)) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
    }
    await page.waitForTimeout(2000)
    return !page.url().includes('/login')
}

test.describe.configure({ mode: 'serial', timeout: 180_000 })

for (const viewport of [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'mobile', width: 390, height: 844 },
] as const) {
    test.describe(`PageHero — ${viewport.label}`, () => {
        test.beforeEach(async ({ page }) => {
            test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E en .env.e2e.local')
            await page.setViewportSize({ width: viewport.width, height: viewport.height })
        })

        for (const p of PAGES) {
            test(`${p.name} muestra el hero marino + dorado`, async ({ page }) => {
                test.skip(
                    Boolean(p.desktopOnly) && viewport.label === 'mobile',
                    'El hero de esta página es solo desktop (móvil usa cabecera compacta)'
                )
                const ok = await goto(page, p.path)
                test.skip(!ok, 'Login falló o sesión caída (rate limit de auth)')

                const hero = page.getByTestId('page-hero').first()
                await expect(hero).toBeVisible({ timeout: 15000 })

                // Borde dorado
                const borderColor = await hero.evaluate(
                    n => getComputedStyle(n as Element).borderTopColor
                )
                expect(borderColor).toMatch(GOLD)

                // Gradiente marino de fondo
                const bgImage = await hero.evaluate(
                    n => getComputedStyle(n as Element).backgroundImage
                )
                expect(bgImage).toContain('gradient')

                // Título dentro del hero
                await expect(hero.locator('h1')).toBeVisible()

                await page.screenshot({
                    path: `qa-hero-${p.name}-${viewport.label}.png`,
                    fullPage: false,
                })
            })
        }
    })
}
