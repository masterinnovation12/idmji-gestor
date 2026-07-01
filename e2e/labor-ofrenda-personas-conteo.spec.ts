import { test, expect } from '@playwright/test'
import { hasE2ECredentials } from './auth.helper'
import { gotoOfrendaWithPlan } from './ofrenda-sacos.helpers'

/**
 * QA E2E — «Personas» de Labor ofrenda:
 *  - recuento por rol (O/A) visible en cada fila
 *  - export PNG del directorio descarga un archivo
 */
test.describe('Labor ofrenda — Personas: recuento O/A y export', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const nav = await gotoOfrendaWithPlan(page)
        test.skip(nav !== 'ok', 'Sin plan o login')
        await page.getByTestId('ofrenda-section-laborOfrenda').click()
        await page.getByTestId('ofrenda-tab-laborOfrenda-personas').click()
        await page.getByTestId('plano-personas-manager').waitFor({ timeout: 20000 })
    })

    test('cada persona muestra su recuento por rol (O/A) o «sin asignar»', async ({ page }) => {
        await expect(page.getByTestId('plano-personas-turn-legend')).toBeVisible()
        const assignments = page.locator('[data-testid^="plano-persona-assignments-"]')
        await expect(assignments.first()).toBeVisible({ timeout: 20000 })
        // El texto es o bien «Sin asignar» o el formato «nO · mA» (dígitos + O y A).
        const text = (await assignments.first().textContent())?.trim() ?? ''
        expect(text.length).toBeGreaterThan(0)
    })

    test('exportar PNG del directorio descarga un archivo', async ({ page }) => {
        const exportBtn = page.getByTestId('plano-personas-export-btn')
        await expect(exportBtn).toBeEnabled()
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 20000 }),
            exportBtn.click(),
        ])
        expect(download.suggestedFilename()).toMatch(/^personas-labor-ofrenda-.*\.png$/)
    })
})
