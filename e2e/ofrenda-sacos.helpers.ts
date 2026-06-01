/**
 * Helpers E2E — configuración de sacos (reproducir constraint puntero > 20).
 */
import type { Page, expect } from '@playwright/test'
import { gotoOfrendaPlan, type OfrendaNavResult } from './ofrenda-plan-desktop.helpers'

export type SacosFieldTestId =
    | 'ofrenda-sacos-jueves'
    | 'ofrenda-sacos-domingo-manana'
    | 'ofrenda-sacos-domingo-tarde'
    | 'ofrenda-sacos-secuencia-max'

export interface SacosValues {
    jueves?: string
    domingo?: string
    domingoTarde?: string
    secuenciaMax?: string
}

const DEFAULT_SACOS: Required<SacosValues> = {
    jueves: '4',
    domingo: '8',
    domingoTarde: '4',
    secuenciaMax: '20',
}

export async function gotoOfrendaWithPlan(page: Page): Promise<OfrendaNavResult> {
    const nav = await gotoOfrendaPlan(page)
    if (nav !== 'ok') return nav

    const empty = page.getByRole('heading', { name: /sin plan para este mes/i })
    if (await empty.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.getByRole('button', { name: /mes anterior/i }).click()
        await page.waitForTimeout(400)
    }

    const toggle = page.getByTestId('ofrenda-sacos-config-toggle')
    await toggle.waitFor({ state: 'visible', timeout: 20000 })
    return 'ok'
}

export async function openSacosConfig(page: Page): Promise<void> {
    const toggle = page.getByTestId('ofrenda-sacos-config-toggle')
    const expanded = await toggle.getAttribute('aria-expanded')
    if (expanded !== 'true') {
        await toggle.click()
    }
    await page.getByTestId('ofrenda-sacos-config-body').waitFor({ state: 'visible', timeout: 10000 })
}

export async function fillSacosField(
    page: Page,
    testId: SacosFieldTestId,
    value: string,
): Promise<void> {
    const input = page.getByTestId(testId).locator('input')
    await input.click()
    await input.fill(value)
}

async function dismissFeedbackIfOpen(page: Page): Promise<void> {
    const ok = page.getByTestId('ofrenda-feedback-ok')
    if (await ok.isVisible({ timeout: 1500 }).catch(() => false)) {
        await ok.click()
        await ok.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    }
}

export async function applySacosConfig(page: Page, values: SacosValues): Promise<void> {
    await dismissFeedbackIfOpen(page)
    await openSacosConfig(page)
    if (values.jueves !== undefined) await fillSacosField(page, 'ofrenda-sacos-jueves', values.jueves)
    if (values.domingo !== undefined) {
        await fillSacosField(page, 'ofrenda-sacos-domingo-manana', values.domingo)
    }
    if (values.domingoTarde !== undefined) {
        await fillSacosField(page, 'ofrenda-sacos-domingo-tarde', values.domingoTarde)
    }
    if (values.secuenciaMax !== undefined) {
        await fillSacosField(page, 'ofrenda-sacos-secuencia-max', values.secuenciaMax)
    }
    await page.getByTestId('ofrenda-sacos-apply').click()
}

export async function expectSacosApplySuccess(
    page: Page,
    expectFn: typeof expect,
): Promise<void> {
    await expectFn(page.getByText('Configuración actualizada')).toBeVisible({ timeout: 90_000 })
    await expectFn(page.getByText(/check constraint/i)).not.toBeVisible()
    await expectFn(page.getByText(/new row for relation/i)).not.toBeVisible()
}

export async function expectSacosApplyNoDbLeak(
    page: Page,
    expectFn: typeof expect,
): Promise<void> {
    const feedback = page.getByTestId('ofrenda-feedback-root')
    if (await feedback.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expectFn(feedback).not.toContainText(/check constraint/i)
        await expectFn(feedback).not.toContainText(/ofrenda_planes_secuencia_puntero/i)
    }
}

export async function restoreDefaultSacos(page: Page): Promise<void> {
    await applySacosConfig(page, DEFAULT_SACOS)
    await page.getByText('Configuración actualizada').waitFor({ timeout: 45000 }).catch(() => {})
}
