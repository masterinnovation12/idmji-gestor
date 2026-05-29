/**
 * E2E: Plan mensual — swipe entre semanas (móvil/tablet) y navegador desktop.
 */
import { test, expect } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded, getLoginError } from './auth.helper'

async function gotoOfrendaPlan(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/ofrenda')
    if (page.url().includes('/login')) {
        if (!hasE2ECredentials()) return 'no-creds' as const
        const ok = await loginIfNeeded(page)
        if (!ok) return 'login-failed' as const
        await page.goto('/dashboard/ofrenda')
    }
    await page.waitForURL(/\/dashboard\/ofrenda/, { timeout: 20000 })
    return 'ok' as const
}

test.describe('Labor Ofrenda — semanas plan', () => {
    test('vista móvil: swipe area y cambio por flecha', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })

        const nav = await gotoOfrendaPlan(page)
        if (nav === 'no-creds') {
            test.skip(true, 'E2E: Falta .env.e2e.local')
            return
        }
        if (nav === 'login-failed') {
            test.skip(true, `E2E: Login falló (${await getLoginError(page)})`)
            return
        }

        const swipeArea = page.getByTestId('ofrenda-week-swipe-area')
        const hasPlan = await swipeArea.isVisible({ timeout: 12000 }).catch(() => false)
        if (!hasPlan) {
            test.skip(true, 'E2E: No hay plan generado para probar semanas')
            return
        }

        const labelBefore = await page.locator('.max-\\[1023px\\]\\:block .text-sm.font-bold').first().textContent()

        await page.getByRole('button', { name: /siguiente|següent|next/i }).click()
        await expect(page.locator('.max-\\[1023px\\]\\:block .text-sm.font-bold').first()).not.toHaveText(
            labelBefore ?? '',
        )

        await page.getByRole('button', { name: /anterior|previous|anterior/i }).click()
        await expect(page.getByTestId('ofrenda-week-swipe-area')).toBeVisible()

        await swipeArea.evaluate((el) => {
            const start = new Touch({ identifier: 1, target: el, clientX: 220, clientY: 200 })
            const move = new Touch({ identifier: 1, target: el, clientX: 300, clientY: 202 })
            el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start], targetTouches: [start] }))
            el.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [move], targetTouches: [move] }))
            el.dispatchEvent(
                new TouchEvent('touchend', {
                    bubbles: true,
                    changedTouches: [new Touch({ identifier: 1, target: el, clientX: 300, clientY: 202 })],
                }),
            )
        })

        await expect(page.getByTestId('ofrenda-week-edge-start')).toBeVisible({ timeout: 3000 })
    })

    test('vista desktop: navegador de semanas y scroll', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })

        const nav = await gotoOfrendaPlan(page)
        if (nav !== 'ok') {
            test.skip(true, 'E2E: Sin acceso a ofrenda')
            return
        }

        const desktopNav = page.getByTestId('ofrenda-desktop-week-nav')
        const visible = await desktopNav.isVisible({ timeout: 12000 }).catch(() => false)
        if (!visible) {
            test.skip(true, 'E2E: Sin plan o navegador desktop no visible')
            return
        }

        const week2 = desktopNav.getByRole('button', { name: /semana 2|setmana 2/i })
        await week2.click()

        await expect(week2).toHaveAttribute('aria-current', 'true')
    })
})
