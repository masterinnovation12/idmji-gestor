import { test, expect } from '@playwright/test'
import { hasE2ECredentials } from './auth.helper'
import { gotoOfrendaWithPlan } from './ofrenda-sacos.helpers'

test.describe('Labor ofrenda — secciones', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const nav = await gotoOfrendaWithPlan(page)
        test.skip(nav !== 'ok', 'Sin plan o login')
        await page.getByTestId('ofrenda-section-general').waitFor({ timeout: 20000 })
    })

    test('muestra selector Labores generales | Labor ofrenda', async ({ page }) => {
        await expect(page.getByTestId('ofrenda-section-general')).toBeVisible()
        await expect(page.getByTestId('ofrenda-section-laborOfrenda')).toBeVisible()
    })

    test('Labor ofrenda tiene pestañas Personas, Generar, Plano, Exportar', async ({ page }) => {
        await page.getByTestId('ofrenda-section-laborOfrenda').click()
        await expect(page.getByTestId('ofrenda-tab-laborOfrenda-personas')).toBeVisible()
        await expect(page.getByTestId('ofrenda-tab-laborOfrenda-generar')).toBeVisible()
        await expect(page.getByTestId('ofrenda-tab-laborOfrenda-plano')).toBeVisible()
        await expect(page.getByTestId('ofrenda-tab-laborOfrenda-exportar')).toBeVisible()
    })

    test('panel Generar muestra reglas ⓘ', async ({ page }) => {
        await page.getByTestId('ofrenda-section-laborOfrenda').click()
        await page.getByTestId('ofrenda-tab-laborOfrenda-generar').click()
        await expect(page.getByTestId('ofrenda-plano-generate-panel')).toBeVisible()
        await expect(page.getByTestId('ofrenda-plano-generate-rules-info')).toBeVisible()
    })
})
