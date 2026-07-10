/**
 * E2E — pestaña Generar homogénea + generación por día (Labor Ofrenda).
 *
 * Autocontenido y seguro: trabaja SIEMPRE sobre el mes siguiente al actual
 * (sin plan real en producción). Crea el plan, prueba la generación por día
 * y elimina el plan al terminar.
 */
import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials } from './auth.helper'
import { gotoOfrendaWithPlan } from './ofrenda-sacos.helpers'
import { goGeneralTab, goLaborTab, waitFeedbackSuccess, dismissFeedback } from './labor-ofrenda-qa-completo.helpers'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

async function goNextMonth(page: Page): Promise<void> {
    await page.getByTestId('ofrenda-month-nav').getByRole('button').nth(1).click()
    await page.getByTestId('ofrenda-month-title-skeleton').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(500)
}

async function ensureNextMonthPlan(page: Page): Promise<void> {
    await goNextMonth(page)
    await goGeneralTab(page, 'generar')
    await expect(page.getByTestId('ofrenda-general-generate-panel')).toBeVisible({ timeout: 15_000 })
    const hasPlan = await page
        .getByTestId('ofrenda-general-mode-all')
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    if (!hasPlan) {
        await page.getByTestId('ofrenda-general-generate-btn').click()
        await waitFeedbackSuccess(page)
    }
}

test.describe('Labor Ofrenda — generar por día (mes siguiente)', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const nav = await gotoOfrendaWithPlan(page)
        test.skip(nav !== 'ok', 'Sin plan o login')
        await dismissFeedback(page)
    })

    test('crear plan del mes siguiente desde la pestaña Generar', async ({ page }) => {
        await ensureNextMonthPlan(page)
        // Con plan: el panel muestra tarjetas de modo, Regenerar y Eliminar
        await expect(page.getByTestId('ofrenda-general-mode-all')).toBeVisible({ timeout: 15_000 })
        await expect(page.getByTestId('ofrenda-general-mode-g1')).toBeVisible()
        await expect(page.getByTestId('ofrenda-general-mode-g2')).toBeVisible()
        await expect(page.getByTestId('ofrenda-delete-plan-btn')).toBeVisible()
    })

    test('alcance Día muestra chips con turno Mañana/Tarde', async ({ page }) => {
        await ensureNextMonthPlan(page)
        await goLaborTab(page, 'generar')
        await expect(page.getByTestId('ofrenda-plano-generate-panel')).toBeVisible({ timeout: 20_000 })
        await page.getByTestId('ofrenda-plano-generate-scope-day').click()
        await expect(page.getByTestId('plano-service-strip')).toBeVisible({ timeout: 10_000 })
        const chips = page.locator('[data-servicio-id]')
        expect(await chips.count()).toBeGreaterThanOrEqual(3)
        const labels = await chips.allTextContents()
        expect(labels.some(l => /· (Mañana|Matí)/.test(l))).toBe(true)
        expect(labels.some(l => /· (Tarde|Tarda)/.test(l))).toBe(true)
    })

    test('regenerar un solo día produce asignaciones', async ({ page }) => {
        await ensureNextMonthPlan(page)
        await goLaborTab(page, 'generar')
        await expect(page.getByTestId('ofrenda-plano-generate-panel')).toBeVisible({ timeout: 20_000 })
        await page.getByTestId('ofrenda-plano-generate-scope-day').click()
        await expect(page.getByTestId('plano-service-strip')).toBeVisible({ timeout: 10_000 })
        // Elegir el primer domingo mañana disponible
        const domingo = page.locator('[data-servicio-id]', { hasText: /· (Mañana|Matí)/ }).first()
        await domingo.click()
        await page.getByTestId('ofrenda-plano-generate-regenerar').click()
        await waitFeedbackSuccess(page)
    })

    test('eliminar el plan del mes siguiente (limpieza)', async ({ page }) => {
        await goNextMonth(page)
        await goGeneralTab(page, 'generar')
        await expect(page.getByTestId('ofrenda-general-generate-panel')).toBeVisible({ timeout: 15_000 })
        const deleteBtn = page.getByTestId('ofrenda-delete-plan-btn')
        test.skip(!(await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)), 'Sin plan que eliminar')
        await deleteBtn.click()
        await page.getByRole('button', { name: /sí, eliminar/i }).click()
        await waitFeedbackSuccess(page)
        // Sin plan: el panel vuelve al modo generación inicial (sin tarjetas ni eliminar)
        await expect(page.getByTestId('ofrenda-general-mode-all')).not.toBeVisible()
        await expect(page.getByTestId('ofrenda-delete-plan-btn')).not.toBeVisible()
    })
})
