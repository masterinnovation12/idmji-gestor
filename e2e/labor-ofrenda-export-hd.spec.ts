import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { hasE2ECredentials } from './auth.helper'
import {
    dismissFeedback,
    goLaborTab,
    setupOfrendaQA,
    waitFeedbackSuccess,
} from './labor-ofrenda-qa-completo.helpers'

const WHATSAPP_HD_MIN_PX = 3024
const LISTA_EXPECTED_PX = 3240

async function assertPngMeetsWhatsAppHd(filePath: string): Promise<{ width: number; height: number }> {
    const meta = await sharp(filePath).metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0
    const longest = Math.max(width, height)
    expect(longest).toBeGreaterThanOrEqual(WHATSAPP_HD_MIN_PX)
    return { width, height }
}

test.describe('Labor ofrenda — export PNG HD WhatsApp', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const setup = await setupOfrendaQA(page)
        test.skip(setup !== 'ok', 'Sin plan o login')
    })

    test('lista: PNG descargado ≥3024px (3240×3240)', async ({ page }) => {
        await goLaborTab(page, 'exportar')
        await expect(page.getByTestId('ofrenda-plano-export-panel')).toBeVisible({ timeout: 15_000 })

        const listaBtn = page.getByRole('button', { name: /lista|llista/i })
        await listaBtn.click()
        await expect(page.getByTestId('plano-service-strip')).toBeVisible({ timeout: 10_000 })

        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'labor-hd-'))
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 30_000 }),
            page.getByTestId('ofrenda-plano-export-btn').click(),
        ])
        const filePath = path.join(tmp, download.suggestedFilename())
        await download.saveAs(filePath)

        expect(download.suggestedFilename()).toMatch(/^labor-ofrenda-lista-.*\.png$/)

        const { width, height } = await assertPngMeetsWhatsAppHd(filePath)
        expect(width).toBe(LISTA_EXPECTED_PX)
        expect(height).toBe(LISTA_EXPECTED_PX)

        await waitFeedbackSuccess(page).catch(() => dismissFeedback(page))
    })

    test('plano: PNG descargado con lado largo ≥3024px', async ({ page }) => {
        await goLaborTab(page, 'exportar')
        await expect(page.getByTestId('ofrenda-plano-export-panel')).toBeVisible({ timeout: 15_000 })

        const planoBtn = page.getByRole('button', { name: /^plano$/i })
        if (await planoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await planoBtn.click()
        }

        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'labor-hd-'))
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 45_000 }),
            page.getByTestId('ofrenda-plano-export-btn').click(),
        ])
        const filePath = path.join(tmp, download.suggestedFilename())
        await download.saveAs(filePath)

        expect(download.suggestedFilename()).toMatch(/^labor-ofrenda-plano-.*\.png$/)

        const { width, height } = await assertPngMeetsWhatsAppHd(filePath)
        expect(Math.max(width, height)).toBeGreaterThanOrEqual(WHATSAPP_HD_MIN_PX)

        await waitFeedbackSuccess(page).catch(() => dismissFeedback(page))
    })
})
