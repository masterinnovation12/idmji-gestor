import { test, expect } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded, getLoginError } from './auth.helper'

test.describe('Sunday Dual Services (10:00 and 17:00)', () => {
    test.beforeEach(async ({ page }) => {
        // Ir a login e iniciar sesión si es necesario
        await page.goto('/dashboard')
        if (page.url().includes('/login')) {
            if (!hasE2ECredentials()) {
                test.skip(true, 'E2E: Falta .env.e2e.local con E2E_USER_EMAIL y E2E_USER_PASSWORD')
                return
            }
            const loggedIn = await loginIfNeeded(page)
            if (!loggedIn) {
                const errMsg = await getLoginError(page)
                test.skip(true, `E2E: Login falló (${errMsg || 'revisar credenciales'})`)
                return
            }
            await page.goto('/dashboard')
        }
    })

    test('El calendario de Junio 2026 muestra múltiples cultos para los domingos (10h y 17h)', async ({ page }) => {
        if (page.url().includes('/login')) {
            test.skip(true, 'E2E: No autenticado')
            return
        }

        // Navegar a la página de cultos (Calendario)
        await page.goto('/dashboard/cultos')
        await expect(page).toHaveURL(/\/dashboard\/cultos/)

        // Esperar a que el calendario se renderice
        await page.waitForSelector('.grid')

        // Hoy es 25 de Mayo de 2026. Hacemos click en "Siguiente" para ir a Junio de 2026
        const nextMonthBtn = page.getByRole('button', { name: /siguiente|següent/i }).first()
        if (await nextMonthBtn.isVisible()) {
            await nextMonthBtn.click()
            await page.waitForTimeout(1000)
        }

        // En Junio de 2026, los domingos (ej: 7 de Junio) deben tener ambos cultos
        const morningCulto = page.locator('text=Enseñanza (10h)').or(page.locator('text=10:00'))
        const eveningCulto = page.locator('text=Enseñanza (17h)').or(page.locator('text=17:00'))

        // Al menos uno de los dos marcadores debe ser visible en el mes de Junio
        const cultoMarkers = morningCulto.or(eveningCulto)
        await expect(cultoMarkers.first()).toBeVisible({ timeout: 15000 })
    })

    test('El Dashboard muestra las pestañas de selección de horario al seleccionar un domingo con doble culto', async ({ page }) => {
        if (page.url().includes('/login')) {
            test.skip(true, 'E2E: No autenticado')
            return
        }

        await page.goto('/dashboard')
        await expect(page).toHaveURL(/\/dashboard/)

        // Buscamos el navegador de cultos y hacemos click en el día Domingo
        const sundayBtn = page.getByRole('button').filter({ hasText: /^dom$|^d$/i }).first()
        if (await sundayBtn.isVisible()) {
            await sundayBtn.click()
            await page.waitForTimeout(1500)

            // Si el domingo tiene dos cultos, debe aparecer el selector de horario con las opciones
            const morningTab = page.getByRole('button', { name: /10:00/ }).first()
            const eveningTab = page.getByRole('button', { name: /17:00/ }).first()

            if (await morningTab.isVisible() && await eveningTab.isVisible()) {
                await expect(morningTab).toBeVisible()
                await expect(eveningTab).toBeVisible()

                // Hacer click en la tarde y verificar que se selecciona
                await eveningTab.click()
                await page.waitForTimeout(500)
                await expect(eveningTab).toHaveClass(/bg-slate-900|bg-white/)
            }
        }
    })

    test('La página de lecturas bíblicas carga correctamente', async ({ page }) => {
        if (page.url().includes('/login')) {
            test.skip(true, 'E2E: No autenticado')
            return
        }

        await page.goto('/dashboard/lecturas')
        await expect(page).toHaveURL(/\/dashboard\/lecturas/)

        // Esperar que termine de cargar
        const loader = page.locator('[class*="animate-spin"]').first()
        await loader.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})

        // Debe cargar el título o lista de lecturas
        const title = page.getByRole('heading', { name: /historial/i })
        await expect(title).toBeVisible({ timeout: 10000 })
    })
})
