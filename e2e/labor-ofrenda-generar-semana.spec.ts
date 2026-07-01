/**
 * E2E — selector de semana en Generar plano (OfrendaLiquidShell).
 */
import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials } from './auth.helper'
import { gotoOfrendaWithPlan } from './ofrenda-sacos.helpers'

function weekPickerModal(page: Page) {
    return page
        .getByTestId('plano-generate-week-sheet')
        .or(page.getByTestId('plano-generate-week-panel'))
}

test.describe('Labor Ofrenda — generar semana', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const nav = await gotoOfrendaWithPlan(page)
        test.skip(nav !== 'ok', 'Sin plan o login')
        await page.getByTestId('ofrenda-section-laborOfrenda').click()
        await page.getByTestId('ofrenda-tab-laborOfrenda-generar').click()
        await page.getByTestId('ofrenda-plano-generate-panel').waitFor({ timeout: 20000 })
    })

    test('modo semana muestra trigger liquid (no select nativo)', async ({ page }) => {
        await page.getByTestId('ofrenda-plano-generate-scope-week').click()
        const trigger = page.getByTestId('plano-generate-week-trigger')
        await expect(trigger).toBeVisible()
        await expect(page.locator('select')).toHaveCount(0)
    })

    test('abre liquid shell con lista de semanas', async ({ page }) => {
        await page.getByTestId('ofrenda-plano-generate-scope-week').click()
        await page.getByTestId('plano-generate-week-trigger').click()
        const modal = weekPickerModal(page)
        await expect(modal).toBeVisible()
        await expect(page.getByTestId('plano-generate-week-list')).toBeVisible()
        const options = page.locator('[data-testid^="plano-generate-week-option-"]')
        expect(await options.count()).toBeGreaterThanOrEqual(1)
    })

    test('marco liquid dorado visible en el modal', async ({ page }) => {
        await page.getByTestId('ofrenda-plano-generate-scope-week').click()
        await page.getByTestId('plano-generate-week-trigger').click()
        const modal = weekPickerModal(page)
        await expect(modal).toHaveClass(/ofrenda-liquid-surface/)
        const hasGoldRim = await modal.evaluate(el => {
            const after = getComputedStyle(el, '::after').backgroundImage
            return after && after !== 'none'
        })
        expect(hasGoldRim).toBe(true)
    })

    test('elegir semana cierra el modal y actualiza el trigger', async ({ page }) => {
        await page.getByTestId('ofrenda-plano-generate-scope-week').click()
        await page.getByTestId('plano-generate-week-trigger').click()
        const second = page.locator('[data-testid^="plano-generate-week-option-"]').nth(1)
        await expect(second).toBeVisible()
        await second.click()
        await expect(weekPickerModal(page)).toBeHidden({ timeout: 5000 })
        await expect(page.getByTestId('plano-generate-week-trigger')).toBeVisible()
        await expect(page.getByTestId('plano-generate-week-trigger')).toContainText(/S\.\d+/)
    })
})
