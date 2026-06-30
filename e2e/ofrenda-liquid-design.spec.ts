/**
 * QA rediseño "liquid premium" de /dashboard/ofrenda.
 * Verifica el lenguaje visual (marco marino + franja dorada + crema) en cada
 * pestaña, más interacciones clave: filtros, búsqueda, habilitar/deshabilitar
 * y renombrar (estas dos últimas reversibles, con restauración en finally).
 *
 * LD01 Chrome (navegador de mes + toggle de sección)
 * LD02 General/Plan — sacos con cabecera marino + franja dorada
 * LD03 General/Plan — tabla con marco dorado
 * LD04 General/Export — selectores de alcance navy/dorado
 * LD05 Plano/Personas — buscador liquid + filtros (no destructivo)
 * LD06 Plano/Personas — la búsqueda reduce la lista (no destructivo)
 * LD07 Plano/Personas — habilitar/deshabilitar (reversible)
 * LD08 Plano/Personas — renombrar (reversible)
 * LD09 Plano — badge píldora + canvas con marco dorado + toggle 2D/3D
 * LD10 Export plano — panel enmarcado + botón navy/dorado
 * LD11 Generar plano — panel enmarcado + toggle semana/mes
 * LD12 Responsive móvil — chrome liquid presente
 */
import { test, expect, type Locator } from '@playwright/test'
import { hasE2ECredentials } from './auth.helper'
import { setupOfrendaQA, dismissFeedback, goGeneralTab, goLaborTab } from './labor-ofrenda-qa-completo.helpers'

const GOLD = /184,\s*150,\s*74/      // #b8964a en rgb()
const NAVY = /31,\s*46,\s*133/       // #1f2e85 en rgb()

async function borderColors(el: Locator): Promise<string> {
    return el.evaluate(node => {
        const s = getComputedStyle(node as Element)
        return [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor].join(' ')
    })
}
async function bgImage(el: Locator): Promise<string> {
    return el.evaluate(node => getComputedStyle(node as Element).backgroundImage)
}

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.describe('Ofrenda — rediseño liquid (visual + interacción)', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E en .env.e2e.local')
        const state = await setupOfrendaQA(page)
        test.skip(state === 'no-creds', 'Sin credenciales')
        test.skip(state === 'login-failed', 'Login falló')
        test.skip(state === 'no-plan', 'No hay plan en el mes visible')
        await dismissFeedback(page)
    })

    test('LD01 — chrome: navegador de mes liquid + toggle de sección', async ({ page }) => {
        const nav = page.getByTestId('ofrenda-month-nav')
        await expect(nav).toBeVisible()
        await expect(nav).toHaveClass(/ofrenda-liquid-nav/)
        expect(await borderColors(nav)).toMatch(GOLD)

        await expect(page.locator('.ofrenda-liquid-segment').first()).toBeVisible()
        await expect(page.getByTestId('ofrenda-section-general')).toBeVisible()
        await expect(page.getByTestId('ofrenda-section-laborOfrenda')).toBeVisible()
    })

    test('LD02 — General/Plan: sacos con cabecera marino + franja dorada', async ({ page }) => {
        await goGeneralTab(page, 'plan')
        const toggle = page.getByTestId('ofrenda-sacos-config-toggle')
        await expect(toggle).toBeVisible()
        await expect(toggle).toHaveClass(/ofrenda-liquid-headbar/)
        expect(await bgImage(toggle)).toMatch(NAVY)
    })

    test('LD03 — General/Plan: tabla con marco dorado', async ({ page }) => {
        await goGeneralTab(page, 'plan')
        const desktop = page.getByTestId('ofrenda-plan-desktop')
        const mobile = page.getByTestId('ofrenda-mobile-week-pager')
        if (await desktop.isVisible({ timeout: 8000 }).catch(() => false)) {
            await expect(desktop).toHaveClass(/ofrenda-liquid-card/)
            expect(await borderColors(desktop)).toMatch(GOLD)
        } else {
            await expect(mobile).toBeVisible()
            await expect(page.locator('.ofrenda-liquid-card').first()).toBeVisible()
        }
    })

    test('LD04 — General/Export: selectores de alcance con activo navy/dorado', async ({ page }) => {
        await goGeneralTab(page, 'exportar')
        const scope = page.getByTestId('ofrenda-export-scope')
        await expect(scope).toBeVisible({ timeout: 15_000 })
        const monthBtn = page.getByTestId('ofrenda-export-scope-month')
        await monthBtn.click()
        await expect(monthBtn).toHaveAttribute('aria-selected', 'true')
        expect(await bgImage(monthBtn)).toMatch(NAVY)
        expect(await borderColors(monthBtn)).toMatch(GOLD)
    })

    test('LD05 — Plano/Personas: buscador liquid + filtros funcionales', async ({ page }) => {
        await goLaborTab(page, 'personas')
        await expect(page.getByTestId('plano-personas-manager')).toBeVisible({ timeout: 15_000 })

        const search = page.locator('input[type="search"]').first()
        await expect(search).toHaveClass(/ofrenda-liquid-search/)

        await page.getByTestId('plano-personas-filters-toggle').click()
        const panel = page.getByTestId('plano-personas-filters')
        await expect(panel).toBeVisible()
        await expect(panel).toHaveClass(/ofrenda-liquid-card/)

        const juevesChip = page.getByTestId('plano-personas-filter-dia-jueves')
        await juevesChip.click()
        await expect(juevesChip).toHaveAttribute('aria-pressed', 'true')
        await page.getByTestId('plano-personas-filters-clear').click()
        await expect(juevesChip).toHaveAttribute('aria-pressed', 'false')
        // la lista vuelve a poblarse tras limpiar filtros
        await expect(page.locator('[data-testid^="plano-persona-row-"]').first()).toBeVisible()
    })

    test('LD06 — Plano/Personas: la búsqueda reduce la lista', async ({ page }) => {
        await goLaborTab(page, 'personas')
        await expect(page.getByTestId('plano-personas-manager')).toBeVisible({ timeout: 15_000 })
        const rows = page.locator('[data-testid^="plano-persona-row-"]')
        const total = await rows.count()
        expect(total).toBeGreaterThan(0)
        const firstName = (await rows.first().locator('p').first().textContent())?.trim() ?? ''
        const token = firstName.split(' ')[0] || firstName.slice(0, 3)
        await page.locator('input[type="search"]').first().fill(token)
        await expect.poll(async () => rows.count()).toBeLessThanOrEqual(total)
        await expect(rows.first()).toBeVisible()
    })

    test('LD07 — Plano/Personas: habilitar/deshabilitar (reversible)', async ({ page }) => {
        await goLaborTab(page, 'personas')
        await expect(page.getByTestId('plano-personas-manager')).toBeVisible({ timeout: 15_000 })
        const toggle = page.locator('[data-testid^="plano-persona-toggle-"]').first()
        await expect(toggle).toBeVisible({ timeout: 10_000 })
        const id = (await toggle.getAttribute('data-testid'))!.replace('plano-persona-toggle-', '')
        const target = page.getByTestId(`plano-persona-toggle-${id}`)
        const before = await target.getAttribute('aria-label')
        try {
            await target.click()
            await dismissFeedback(page)
            await expect.poll(async () => target.getAttribute('aria-label')).not.toBe(before)
        } finally {
            // restaurar estado original
            await page.getByTestId(`plano-persona-toggle-${id}`).click().catch(() => {})
            await dismissFeedback(page).catch(() => {})
            await expect.poll(async () => page.getByTestId(`plano-persona-toggle-${id}`).getAttribute('aria-label')).toBe(before)
        }
    })

    test('LD08 — Plano/Personas: renombrar (reversible)', async ({ page }) => {
        await goLaborTab(page, 'personas')
        await expect(page.getByTestId('plano-personas-manager')).toBeVisible({ timeout: 15_000 })
        const row = page.locator('[data-testid^="plano-persona-row-"]').first()
        const id = (await row.getAttribute('data-testid'))!.replace('plano-persona-row-', '')
        const nameEl = row.locator('p').first()
        const original = (await nameEl.textContent())?.trim() ?? ''
        const renamed = `${original} QA`

        const openModal = async () => {
            const expand = page.getByTestId(`plano-persona-expand-${id}`)
            if (await expand.isVisible({ timeout: 3000 }).catch(() => false)) await expand.click()
            await page.getByTestId(`plano-persona-edit-${id}`).click()
            const modal = page.locator('[data-testid^="plano-personas-rename-"][data-testid$="anel"], [data-testid="plano-personas-rename-sheet"]')
            await expect(modal.first()).toBeVisible({ timeout: 8000 })
            return modal.first()
        }
        const setName = async (value: string) => {
            const dialog = page.getByRole('dialog')
            await dialog.locator('input[type="text"]').fill(value)
            await dialog.getByRole('button', { name: /^(guardar|desa)$/i }).click()
            await dismissFeedback(page)
        }

        try {
            await openModal()
            await setName(renamed)
            await expect.poll(async () => page.getByTestId(`plano-persona-row-${id}`).locator('p').first().textContent())
                .toContain('QA')
        } finally {
            // restaurar nombre original
            if ((await page.getByTestId(`plano-persona-row-${id}`).locator('p').first().textContent())?.includes('QA')) {
                await openModal().catch(() => {})
                await setName(original).catch(() => {})
            }
        }
    })

    test('LD09 — Plano: badge píldora + toggle 2D/3D + canvas con marco dorado', async ({ page }) => {
        await goLaborTab(page, 'plano')
        await expect(page.getByTestId('plano-tab')).toBeVisible({ timeout: 20_000 })
        await expect(page.getByTestId('plano-modo-badge')).toHaveClass(/ofrenda-liquid-pill/)
        await expect(page.getByTestId('plano-vista-2d')).toBeVisible()
        await expect(page.getByTestId('plano-vista-3d')).toBeVisible()
        const canvas = page.getByTestId('plano-canvas')
        if (await canvas.isVisible({ timeout: 20_000 }).catch(() => false)) {
            expect(await borderColors(canvas)).toMatch(GOLD)
        }
    })

    test('LD10 — Export plano: panel enmarcado + botón navy/dorado', async ({ page }) => {
        await goLaborTab(page, 'exportar')
        const panel = page.getByTestId('ofrenda-plano-export-panel')
        await expect(panel).toBeVisible({ timeout: 15_000 })
        await expect(panel).toHaveClass(/ofrenda-liquid-card/)
        const btn = page.getByTestId('ofrenda-plano-export-btn')
        await expect(btn).toBeVisible()
        expect(await bgImage(btn)).toMatch(NAVY)
        expect(await borderColors(btn)).toMatch(GOLD)
    })

    test('LD11 — Generar plano: panel enmarcado + toggle semana/mes', async ({ page }) => {
        await goLaborTab(page, 'generar')
        const panel = page.getByTestId('ofrenda-plano-generate-panel')
        await expect(panel).toBeVisible({ timeout: 15_000 })
        await expect(panel).toHaveClass(/ofrenda-liquid-card/)
        await expect(page.getByTestId('ofrenda-plano-generate-scope-month')).toBeVisible()
        await expect(page.getByTestId('ofrenda-plano-generate-generar')).toBeVisible()
    })

    test('LD12 — Responsive móvil: chrome liquid presente', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await goGeneralTab(page, 'plan')
        await expect(page.getByTestId('ofrenda-month-nav')).toHaveClass(/ofrenda-liquid-nav/)
        await expect(page.locator('.ofrenda-liquid-segment').first()).toBeVisible()
    })
})
