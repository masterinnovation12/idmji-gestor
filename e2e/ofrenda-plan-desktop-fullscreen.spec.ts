/**
 * E2E senior — desktop fullscreen: cada chip de semana debe mostrar
 * su bloque Jue/Dom sin solapar la columna Rol fija.
 */
import { test, expect } from '@playwright/test'
import { scrollLeftForWeekIndex } from '../src/app/dashboard/ofrenda/planTableScroll'
import {
    DESKTOP_FULLSCREEN,
    assertWeekAudit,
    auditWeekLayout,
    getDesktopWeekCount,
    gotoOfrendaPlan,
    requireDesktopPlan,
    selectDesktopWeek,
    waitForScrollLeft,
} from './ofrenda-plan-desktop.helpers'

test.describe('Labor Ofrenda — desktop fullscreen (1920×1080)', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize(DESKTOP_FULLSCREEN)
    })

    test('precondiciones: tabla desktop premium, sin vista móvil', async ({ page }) => {
        const nav = await gotoOfrendaPlan(page)
        if (nav !== 'ok') {
            test.skip(true, `E2E: ${nav}`)
            return
        }
        if (!(await requireDesktopPlan(page))) {
            test.skip(true, 'E2E: Genera un plan mensual antes de probar')
            return
        }

        await expect(page.getByTestId('ofrenda-plan-desktop')).toHaveClass(
            /ofrenda-plan-desktop-shell/,
        )
        await expect(page.getByTestId('ofrenda-plan-desktop-scroll')).toHaveClass(
            /ofrenda-plan-desktop-scroll/,
        )
        await expect(page.getByTestId('ofrenda-mobile-week-pager')).toHaveCount(0)
        await expect(page.getByTestId('ofrenda-plan-sticky-role-header')).toBeVisible()
    })

    test('auditoría completa: todas las semanas visibles y sin solape con Rol', async ({
        page,
    }) => {
        const nav = await gotoOfrendaPlan(page)
        if (nav !== 'ok') {
            test.skip(true, `E2E: ${nav}`)
            return
        }
        if (!(await requireDesktopPlan(page))) {
            test.skip(true, 'E2E: Sin plan')
            return
        }

        const weekCount = await getDesktopWeekCount(page)
        if (weekCount < 2) {
            test.skip(true, 'E2E: El plan necesita al menos 2 semanas')
            return
        }

        const audits: Awaited<ReturnType<typeof auditWeekLayout>>[] = []

        for (let w = 0; w < weekCount; w++) {
            await selectDesktopWeek(page, w)
            const audit = await auditWeekLayout(page, w)
            expect(audit, `No se pudo medir semana ${w + 1}`).not.toBeNull()
            if (audit) {
                assertWeekAudit(audit, w)
                audits.push(audit)
            }
        }

        // Semana 1: scroll casi 0
        expect(audits[0]?.scrollLeft ?? 999).toBeLessThanOrEqual(
            scrollLeftForWeekIndex(0) + 24,
        )

        // Cada semana posterior desplaza el scroll (o se mantiene si ya está al máximo)
        for (let w = 1; w < audits.length; w++) {
            expect(audits[w]!.scrollLeft).toBeGreaterThanOrEqual(audits[w - 1]!.scrollLeft)
        }

        test.info().attach('week-layout-audits.json', {
            body: JSON.stringify(audits, null, 2),
            contentType: 'application/json',
        })
    })

    test('navegación ida y vuelta: semana 3 → 1 → 2 mantiene layout correcto', async ({
        page,
    }) => {
        const nav = await gotoOfrendaPlan(page)
        if (nav !== 'ok') {
            test.skip(true, `E2E: ${nav}`)
            return
        }
        if (!(await requireDesktopPlan(page))) {
            test.skip(true, 'E2E: Sin plan')
            return
        }

        const weekCount = await getDesktopWeekCount(page)
        if (weekCount < 3) {
            test.skip(true, 'E2E: Se necesitan ≥3 semanas')
            return
        }

        const sequence = [2, 0, 1]
        for (const w of sequence) {
            await selectDesktopWeek(page, w)
            const audit = await auditWeekLayout(page, w)
            expect(audit).not.toBeNull()
            if (audit) assertWeekAudit(audit, w)
        }
    })

    test('flechas del navegador: avanzar semana actualiza scroll y chip activo', async ({
        page,
    }) => {
        const nav = await gotoOfrendaPlan(page)
        if (nav !== 'ok') {
            test.skip(true, `E2E: ${nav}`)
            return
        }
        if (!(await requireDesktopPlan(page))) {
            test.skip(true, 'E2E: Sin plan')
            return
        }

        const weekCount = await getDesktopWeekCount(page)
        if (weekCount < 2) {
            test.skip(true, 'E2E: Menos de 2 semanas')
            return
        }

        await selectDesktopWeek(page, 0)
        await page.getByTestId('ofrenda-desktop-week-nav').getByLabel(/siguiente|següent|next/i).click()
        await waitForScrollLeft(page, scrollLeftForWeekIndex(1))

        const audit = await auditWeekLayout(page, 1)
        expect(audit).not.toBeNull()
        if (audit) assertWeekAudit(audit, 1)
    })

    test('captura visual semana 2 (regresión solape Rol)', async ({ page }) => {
        const nav = await gotoOfrendaPlan(page)
        if (nav !== 'ok') {
            test.skip(true, `E2E: ${nav}`)
            return
        }
        if (!(await requireDesktopPlan(page))) {
            test.skip(true, 'E2E: Sin plan')
            return
        }
        if ((await getDesktopWeekCount(page)) < 2) {
            test.skip(true, 'E2E: Menos de 2 semanas')
            return
        }

        await selectDesktopWeek(page, 1)
        const audit = await auditWeekLayout(page, 1)
        expect(audit).not.toBeNull()
        if (audit) assertWeekAudit(audit, 1)

        const shot = await page.getByTestId('ofrenda-plan-desktop').screenshot()
        await test.info().attach('desktop-week-2.png', {
            body: shot,
            contentType: 'image/png',
        })
    })
})
