/**
 * E2E — configuración de sacos y constraint puntero 1..99.
 * Requiere E2E_USER_EMAIL / E2E_USER_PASSWORD y un mes con plan existente.
 */
import { test, expect } from '@playwright/test'
import { hasE2ECredentials } from './auth.helper'
import {
    applySacosConfig,
    expectSacosApplyNoDbLeak,
    expectSacosApplySuccess,
    gotoOfrendaWithPlan,
    restoreDefaultSacos,
} from './ofrenda-sacos.helpers'

test.describe.configure({ mode: 'serial' })

test.describe('Labor Ofrenda — configuración de sacos', () => {
    test.setTimeout(120_000)

    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E en .env.e2e.local')
        const nav = await gotoOfrendaWithPlan(page)
        test.skip(nav === 'no-creds', 'Sin credenciales')
        test.skip(nav === 'login-failed', 'Login E2E falló')
    })

    test.afterAll(async ({ browser }) => {
        if (!hasE2ECredentials()) return
        const page = await browser.newPage()
        try {
            const nav = await gotoOfrendaWithPlan(page)
            if (nav === 'ok') await restoreDefaultSacos(page)
        } finally {
            await page.close()
        }
    })

    test('máximo del ciclo 25 — antes fallaba check constraint puntero_fin', async ({ page }) => {
        await applySacosConfig(page, {
            jueves: '4',
            domingo: '8',
            domingoTarde: '4',
            secuenciaMax: '25',
        })
        await expectSacosApplySuccess(page, expect)
        await expectSacosApplyNoDbLeak(page, expect)
    })

    test('máximo del ciclo 30 con sacos distintos (jueves 5, domingo 10, tarde 6)', async ({
        page,
    }) => {
        await applySacosConfig(page, {
            jueves: '5',
            domingo: '10',
            domingoTarde: '6',
            secuenciaMax: '30',
        })
        await expectSacosApplySuccess(page, expect)
        await expectSacosApplyNoDbLeak(page, expect)
    })

    test('máximo del ciclo 99 (límite superior)', async ({ page }) => {
        await applySacosConfig(page, {
            jueves: '4',
            domingo: '8',
            domingoTarde: '4',
            secuenciaMax: '99',
        })
        await expectSacosApplySuccess(page, expect)
        await expectSacosApplyNoDbLeak(page, expect)
    })

    test('solo sacos por servicio con ciclo 20 (regresión)', async ({ page }) => {
        await applySacosConfig(page, {
            jueves: '6',
            domingo: '9',
            domingoTarde: '5',
            secuenciaMax: '20',
        })
        await expectSacosApplySuccess(page, expect)
        await expectSacosApplyNoDbLeak(page, expect)
    })

    test('ciclo 40 — escenario que forzaba puntero > 20 en BD antigua', async ({ page }) => {
        await applySacosConfig(page, {
            jueves: '4',
            domingo: '8',
            domingoTarde: '4',
            secuenciaMax: '40',
        })
        await expectSacosApplySuccess(page, expect)
        await expectSacosApplyNoDbLeak(page, expect)
    })
})
