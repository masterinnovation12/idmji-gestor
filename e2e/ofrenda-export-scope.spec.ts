/**
 * E2E — selector mensual/semanal en exportación.
 */
import { test, expect } from '@playwright/test'
import { hasE2ECredentials } from './auth.helper'
import { gotoOfrendaWithPlan } from './ofrenda-sacos.helpers'

test.describe('Labor Ofrenda — exportación alcance', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const nav = await gotoOfrendaWithPlan(page)
        test.skip(nav !== 'ok', 'Sin plan o login')
        await page.getByRole('tab', { name: /exportar/i }).click()
        await page.getByTestId('ofrenda-export-scope').waitFor({ timeout: 20000 })
    })

    test('muestra selector mes y semana', async ({ page }) => {
        await expect(page.getByTestId('ofrenda-export-scope-month')).toBeVisible()
        await expect(page.getByTestId('ofrenda-export-scope-week')).toBeVisible()
    })

    test('modo semanal muestra chips de semana', async ({ page }) => {
        await page.getByTestId('ofrenda-export-scope-week').click()
        await expect(page.getByTestId('ofrenda-export-week-picker')).toBeVisible()
        const chips = page.locator('[data-testid^="ofrenda-export-week-"]')
        await expect(chips.first()).toBeVisible()
        expect(await chips.count()).toBeGreaterThanOrEqual(1)
    })

    test('layout captura no incluye idmji.org ni CGMJCI', async ({ page }) => {
        const root = page.locator('#ofrenda-export-capture-root')
        await expect(root).toBeAttached()
        await expect(root).not.toContainText('idmji.org')
        await expect(root).not.toContainText('CGMJCI')
    })

    test('muestra selector contenido completo y solo colaboradores', async ({ page }) => {
        await expect(page.getByTestId('ofrenda-export-people-scope')).toBeVisible()
        await expect(page.getByTestId('ofrenda-export-people-all')).toBeVisible()
        await expect(page.getByTestId('ofrenda-export-people-g2')).toBeVisible()
    })

    test('solo colaboradores: captura sin G1 ni secuencia de sacos', async ({ page }) => {
        await page.getByTestId('ofrenda-export-people-g2').click()
        await page.waitForTimeout(300)
        const root = page.locator('#ofrenda-export-capture-root')
        const text = (await root.innerText()) ?? ''
        expect(text).toMatch(/Col\. 1|Col·laborador 1/i)
        expect(text).not.toMatch(/Realiza labor|Realitza/i)
        expect(text).not.toMatch(/sacos\/semana|sacs\/setmana/i)
    })

    test('modo semanal: subtítulo y leyenda no solapados en captura', async ({ page }) => {
        await page.getByTestId('ofrenda-export-scope-week').click()
        await page.getByTestId('ofrenda-export-week-1').click()
        await page.waitForTimeout(400)
        const root = page.locator('#ofrenda-export-capture-root')
        const text = (await root.innerText()) ?? ''
        expect(text).toMatch(/Semana 1 de/)
        expect(text).toMatch(/Dom\. mañana/)
        const idxSub = text.indexOf('Semana')
        const idxDom = text.indexOf('Dom. mañana')
        expect(idxSub).toBeGreaterThanOrEqual(0)
        expect(idxDom).toBeGreaterThan(idxSub)
    })
})
