/**
 * QA completo — 10 casos de uso Labor Ofrenda + Labores generales.
 * Verifica acciones reales contra Supabase con usuario E2E (EDITOR/ADMIN).
 *
 * UC01 Shell + mes global
 * UC02 Regenerar plan mensual (labores generales)
 * UC03 Configuración de sacos
 * UC04 Personas generales — turnos disponibles
 * UC05 Puesto fijo G1 (coordinador)
 * UC06 Export labores — solo colaboradores + semana
 * UC07 Plano personas — estrella (prioridad) y capacidad
 * UC08 Generar plano mes completo + verificar canvas
 * UC09 Rellenar huecos + regenerar semana
 * UC10 Export plano — panel plano y lista
 */
import { test, expect } from '@playwright/test'
import { hasE2ECredentials } from './auth.helper'
import {
    setupOfrendaQA,
    dismissFeedback,
    goGeneralTab,
    goLaborTab,
    waitFeedbackSuccess,
    clickPlanoAction,
    expectPlanTableHasAssignments,
    expectPlanoCanvasReady,
} from './labor-ofrenda-qa-completo.helpers'
import { applySacosConfig, restoreDefaultSacos } from './ofrenda-sacos.helpers'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.describe('QA completo — 10 casos de uso Ofrenda', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E en .env.e2e.local')
        const state = await setupOfrendaQA(page)
        test.skip(state === 'no-creds', 'Sin credenciales')
        test.skip(state === 'login-failed', 'Login falló')
        test.skip(state === 'no-plan', 'No hay plan en el mes visible — navega a un mes con plan')
        await dismissFeedback(page)
    })

    test('UC01 — Shell: dos secciones y mes global persiste al cambiar pestañas', async ({ page }) => {
        await expect(page.getByTestId('ofrenda-section-general')).toBeVisible()
        await expect(page.getByTestId('ofrenda-section-laborOfrenda')).toBeVisible()

        const titleBefore = await page.getByTestId('ofrenda-month-title').textContent()

        await goLaborTab(page, 'personas')
        await expect(page.getByTestId('plano-personas-manager')).toBeVisible({ timeout: 15_000 })
        await expect(page.getByTestId('ofrenda-month-title')).toHaveText(titleBefore ?? '')

        await goGeneralTab(page, 'exportar')
        await expect(page.getByTestId('ofrenda-export-scope')).toBeVisible({ timeout: 15_000 })
        await expect(page.getByTestId('ofrenda-month-title')).toHaveText(titleBefore ?? '')

        await page.getByTestId('ofrenda-month-nav').getByRole('button').nth(1).click()
        await page.getByTestId('ofrenda-month-title-skeleton').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})
        const titleAfter = await page.getByTestId('ofrenda-month-title').textContent()
        expect(titleAfter).not.toBe(titleBefore)
    })

    test('UC02 — Labores generales: regenerar plan desde la pestaña Generar', async ({ page }) => {
        await goGeneralTab(page, 'generar')
        await expect(page.getByTestId('ofrenda-general-generate-panel')).toBeVisible({ timeout: 15_000 })
        await page.getByTestId('ofrenda-general-mode-all').click()
        await page.getByTestId('ofrenda-general-generate-btn').click()
        await waitFeedbackSuccess(page)
        await goGeneralTab(page, 'plan')
        await expectPlanTableHasAssignments(page)
        const cells = page.locator('[data-testid="ofrenda-plan-desktop-table"] td, [data-testid="ofrenda-plan-sticky-role"]')
        expect(await cells.count()).toBeGreaterThan(4)
    })

    test('UC03 — Configuración sacos: aplicar valores y restaurar', async ({ page }) => {
        await goGeneralTab(page, 'plan')
        await applySacosConfig(page, { jueves: '5', domingo: '9', domingoTarde: '5', secuenciaMax: '25' })
        await expect(page.getByText(/configuración actualizada|configuració actualitzada/i)).toBeVisible({ timeout: 90_000 })
        await dismissFeedback(page)

        await page.getByTestId('ofrenda-sacos-config-toggle').click()
        await expect(page.getByTestId('ofrenda-sacos-jueves').locator('input')).toHaveValue('5')
        await expect(page.getByTestId('ofrenda-sacos-domingo-manana').locator('input')).toHaveValue('9')

        await restoreDefaultSacos(page)
        await dismissFeedback(page)
        await page.getByTestId('ofrenda-sacos-config-toggle').click()
        await expect(page.getByTestId('ofrenda-sacos-jueves').locator('input')).toHaveValue('4')
    })

    test('UC04 — Personas generales: toggle turno jueves en primer miembro activo', async ({ page }) => {
        await goGeneralTab(page, 'personas')
        const expandBtn = page.locator('[data-testid^="ofrenda-member-turns-toggle-"]').first()
        await expect(expandBtn).toBeVisible({ timeout: 10_000 })
        await expandBtn.click()
        const toggle = page.locator('[data-testid$="-puede_jueves"]').first()
        await expect(toggle).toBeVisible({ timeout: 8000 })
        const pressedBefore = await toggle.getAttribute('aria-pressed')
        await toggle.click()
        await expect
            .poll(async () => toggle.getAttribute('aria-pressed'))
            .not.toBe(pressedBefore)
        await toggle.click()
        await expect
            .poll(async () => toggle.getAttribute('aria-pressed'))
            .toBe(pressedBefore)
    })

    test('UC05 — Puesto fijo G1: asignar coordinador jueves y ver badge', async ({ page }) => {
        await goGeneralTab(page, 'personas')
        const fijoEditor = page.locator('[data-testid^="ofrenda-miembro-fijo-"]').first()
        if (!(await fijoEditor.isVisible({ timeout: 8000 }).catch(() => false))) {
            test.skip(true, 'No hay miembros G1 con editor de puesto fijo')
            return
        }
        const miembroId = (await fijoEditor.getAttribute('data-testid'))?.replace('ofrenda-miembro-fijo-', '') ?? ''
        await fijoEditor.locator(`[data-testid="ofrenda-miembro-fijo-dia-${miembroId}-jueves"]`).click()
        await fijoEditor.locator(`[data-testid="ofrenda-miembro-fijo-rol-${miembroId}-realiza"]`).click()
        await waitFeedbackSuccess(page)
        await expect(page.getByTestId(`ofrenda-miembro-fijo-badge-${miembroId}`)).toBeVisible({ timeout: 8000 })
        await fijoEditor.getByRole('button', { name: /ninguno|cap/i }).click()
        await waitFeedbackSuccess(page)
        await expect(page.getByTestId(`ofrenda-miembro-fijo-badge-${miembroId}`)).not.toBeVisible({ timeout: 8000 })
    })

    test('UC06 — Export labores: solo colaboradores sin G1 ni sacos en captura', async ({ page }) => {
        await goGeneralTab(page, 'exportar')
        await page.getByTestId('ofrenda-export-people-g2').click()
        await expect(page.getByTestId('ofrenda-export-people-g2')).toHaveAttribute('aria-selected', 'true')
        await page.getByTestId('ofrenda-export-scope-week').click()
        await page.getByTestId('ofrenda-export-week-1').click()
        const root = page.locator('#ofrenda-export-capture-root')
        await expect
            .poll(async () => (await root.innerText()) ?? '')
            .toMatch(/Colaborador 1|Col·laborador 1/i)
        const text = (await root.innerText()) ?? ''
        expect(text).not.toMatch(/Coordinador|Coordina/i)
        expect(text).not.toMatch(/sacos\/semana|sacs\/setmana/i)
        expect(text).toMatch(/Semana 1|Setmana 1/i)
    })

    test('UC07 — Plano personas: estrella (prioridad) y cambio de capacidad', async ({ page }) => {
        await goLaborTab(page, 'personas')
        await expect(page.getByTestId('plano-personas-manager')).toBeVisible({ timeout: 15_000 })
        const countText = await page.getByTestId('plano-personas-count').textContent()
        expect(countText).toMatch(/\d+/)

        const star = page.getByRole('button', { name: /prioridad ofrendario|prioritat ofrenador/i }).first()
        await expect(star).toBeVisible({ timeout: 10_000 })
        const starBefore = await star.getAttribute('aria-pressed')
        await star.click()
        await expect
            .poll(async () => star.getAttribute('aria-pressed'))
            .not.toBe(starBefore)
        await star.click()
        await expect
            .poll(async () => star.getAttribute('aria-pressed'))
            .toBe(starBefore)

        const capApoyo = page.getByRole('button', { name: /^Apoyo$|^Suport$|^Solo apoyo$|^Només suport$/i }).first()
        const firstExpand = page.getByTestId(/plano-persona-expand-/).first()
        if (await firstExpand.isVisible({ timeout: 3000 }).catch(() => false)) {
            await firstExpand.click()
        }
        if (await capApoyo.isVisible({ timeout: 3000 }).catch(() => false)) {
            const capBefore = await capApoyo.getAttribute('aria-pressed')
            await capApoyo.click()
            await waitFeedbackSuccess(page)
            if (capBefore === 'true') {
                await expect(capApoyo).toHaveAttribute('aria-pressed', 'false')
            } else {
                await expect(capApoyo).toHaveAttribute('aria-pressed', 'true')
            }
        }
    })

    test('UC08 — Generar plano mes completo y verificar canvas con disposición', async ({ page }) => {
        await clickPlanoAction(page, 'generar', 'month')
        await expectPlanoCanvasReady(page)
        const sacos = page.getByTestId('plano-canvas').locator('svg[viewBox="0 0 46 62"]')
        await expect(sacos.first()).toBeVisible()
        expect(await sacos.count()).toBeGreaterThanOrEqual(4)
    })

    test('UC09 — Rellenar huecos y regenerar semana del plano', async ({ page }) => {
        await clickPlanoAction(page, 'rellenar', 'month')
        await clickPlanoAction(page, 'regenerar', 'week')
        await expectPlanoCanvasReady(page)
        await expect(page.getByTestId('plano-service-strip')).toBeVisible()
    })

    test('UC10 — Export plano: panel plano/lista y botón de descarga habilitado', async ({ page }) => {
        await goLaborTab(page, 'exportar')
        await expect(page.getByTestId('ofrenda-plano-export-panel')).toBeVisible({ timeout: 15_000 })
        await expect(page.getByTestId('ofrenda-plano-export-btn')).toBeVisible()

        const listaBtn = page.getByRole('button', { name: /lista|llista/i })
        if (await listaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await listaBtn.click()
        }
        await expect(page.getByTestId('plano-service-strip')).toBeVisible({ timeout: 10_000 })
        await expect(page.getByTestId('ofrenda-plano-export-btn')).toBeEnabled()
    })
})
