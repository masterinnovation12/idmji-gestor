/**
 * Helpers E2E — QA completo Labor Ofrenda (10 casos de uso).
 */
import { expect, type Page } from '@playwright/test'
import { gotoOfrendaWithPlan } from './ofrenda-sacos.helpers'

export type GeneralTab = 'plan' | 'personas' | 'exportar'
export type LaborTab = 'personas' | 'generar' | 'plano' | 'exportar'

export const FEEDBACK_DISMISS_MS = 90_000

export async function setupOfrendaQA(page: Page): Promise<'ok' | 'no-creds' | 'login-failed' | 'no-plan'> {
    const nav = await gotoOfrendaWithPlan(page)
    if (nav !== 'ok') return nav === 'no-creds' ? 'no-creds' : 'login-failed'
    const hasPlan = await page.getByTestId('ofrenda-sacos-config-toggle').isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasPlan) return 'no-plan'
    return 'ok'
}

export async function dismissFeedback(page: Page): Promise<void> {
    const panel = page.getByTestId('ofrenda-feedback-panel')
    if (!(await panel.isVisible({ timeout: 2500 }).catch(() => false))) return
    const ok = page.getByTestId('ofrenda-feedback-ok')
    if (await ok.isVisible({ timeout: 1500 }).catch(() => false)) {
        await ok.click()
    }
    await expect(panel).toBeHidden({ timeout: FEEDBACK_DISMISS_MS })
}

export async function goGeneralTab(page: Page, tab: GeneralTab): Promise<void> {
    await page.getByTestId('ofrenda-section-general').click()
    await page.getByTestId(`ofrenda-tab-general-${tab}`).click()
}

export async function goLaborTab(page: Page, tab: LaborTab): Promise<void> {
    await page.getByTestId('ofrenda-section-laborOfrenda').click()
    await page.getByTestId(`ofrenda-tab-laborOfrenda-${tab}`).click()
}

export async function waitFeedbackSuccess(page: Page): Promise<void> {
    const panel = page.getByTestId('ofrenda-feedback-panel')
    await expect(panel).toBeVisible({ timeout: 120_000 })
    await dismissFeedback(page)
}

export async function clickPlanoAction(
    page: Page,
    modo: 'generar' | 'regenerar' | 'rellenar',
    scope: 'week' | 'month' = 'month',
): Promise<void> {
    await goLaborTab(page, 'generar')
    await page.getByTestId(`ofrenda-plano-generate-scope-${scope}`).click()
    await page.getByTestId(`ofrenda-plano-generate-${modo}`).click()
    await waitFeedbackSuccess(page)
}

export async function expectPlanTableHasAssignments(page: Page): Promise<void> {
    const desktop = page.getByTestId('ofrenda-plan-desktop')
    const mobile = page.getByTestId('ofrenda-mobile-week-pager')
    const hasDesktop = await desktop.isVisible({ timeout: 8000 }).catch(() => false)
    const hasMobile = await mobile.isVisible({ timeout: 3000 }).catch(() => false)
    expect(hasDesktop || hasMobile).toBe(true)
}

export async function expectPlanoCanvasReady(page: Page): Promise<void> {
    await goLaborTab(page, 'plano')
    await expect(page.getByTestId('plano-tab')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('plano-canvas')).toBeVisible({ timeout: 30_000 })
    const badge = page.getByTestId('plano-modo-badge')
    await expect(badge).toBeVisible()
    const text = (await badge.textContent()) ?? ''
    expect(text).not.toMatch(/sin disposición|sense disposició/i)
}
