/**
 * Helpers E2E — auditoría visual/geometría tabla plan desktop.
 */
import { expect, type Page } from '@playwright/test'
import {
    isServiceColumnClearOfStickyRole,
    scrollLeftForWeekIndex,
} from '../src/app/dashboard/ofrenda/planTableScroll'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'

export const DESKTOP_FULLSCREEN = { width: 1920, height: 1080 } as const

export const SCROLL_LEFT_TOLERANCE_PX = 24

export type OfrendaNavResult = 'ok' | 'no-creds' | 'login-failed'

export interface WeekLayoutAudit {
    weekIndex: number
    scrollLeft: number
    expectedScrollLeft: number
    maxScrollLeft: number
    clampedExpectedScrollLeft: number
    ariaCurrent: boolean
    roleRight: number
    weekLeft: number
    weekRight: number
    scrollLeftEdge: number
    scrollRightEdge: number
    clearOfRole: boolean
    visibleInViewport: boolean
    headerText: string
}

export async function gotoOfrendaPlan(page: Page): Promise<OfrendaNavResult> {
    await page.goto('/dashboard/ofrenda')
    if (page.url().includes('/login')) {
        if (!hasE2ECredentials()) return 'no-creds'
        const ok = await loginIfNeeded(page)
        if (!ok) return 'login-failed'
        await page.goto('/dashboard/ofrenda')
    }
    await page.waitForURL(/\/dashboard\/ofrenda/, { timeout: 20000 })
    return 'ok'
}

export async function requireDesktopPlan(page: Page): Promise<boolean> {
    const desktop = page.getByTestId('ofrenda-plan-desktop')
    return desktop.isVisible({ timeout: 15000 }).catch(() => false)
}

export async function getDesktopWeekCount(page: Page): Promise<number> {
    return page.getByTestId('ofrenda-desktop-week-nav').locator('[data-testid^="ofrenda-desktop-week-"]').count()
}

/** Espera a que termine el scroll horizontal (smooth o instant). */
export async function waitForScrollLeft(
    page: Page,
    expected: number,
    tolerancePx = SCROLL_LEFT_TOLERANCE_PX,
    timeoutMs = 5000,
) {
    const scroll = page.getByTestId('ofrenda-plan-desktop-scroll')
    await expect
        .poll(async () => {
            const left = await scroll.evaluate((el, exp) => {
                const target = Math.min(exp, el.scrollWidth - el.clientWidth)
                return Math.abs(el.scrollLeft - target)
            }, expected)
            return left
        }, { timeout: timeoutMs })
        .toBeLessThanOrEqual(tolerancePx)
}

/** Mide geometría de la semana seleccionada respecto a la columna Rol fija. */
export async function auditWeekLayout(
    page: Page,
    weekIndex: number,
): Promise<WeekLayoutAudit | null> {
    return page.evaluate((idx) => {
        const role = document.querySelector(
            '[data-testid="ofrenda-plan-sticky-role-header"]',
        )
        const weekCol = document.querySelector(`[data-week-col="${idx}"]`)
        const scroll = document.querySelector(
            '[data-testid="ofrenda-plan-desktop-scroll"]',
        )
        const weekBtn = document.querySelector(
            `[data-testid="ofrenda-desktop-week-${idx + 1}"]`,
        )
        if (!role || !weekCol || !scroll) return null

        const roleRect = role.getBoundingClientRect()
        const weekRect = weekCol.getBoundingClientRect()
        const scrollRect = scroll.getBoundingClientRect()
        const scrollEl = scroll as HTMLElement
        const scrollLeft = scrollEl.scrollLeft
        const maxScrollLeft = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth)
        const expectedScrollLeft = idx * 3 * 120
        const clampedExpectedScrollLeft = Math.min(expectedScrollLeft, maxScrollLeft)

        const clearOfRole = weekRect.left >= roleRect.right - 4
        const visibleInViewport =
            weekRect.right > scrollRect.left + roleRect.width * 0.85 &&
            weekRect.left < scrollRect.right - 8 &&
            weekRect.width > 40

        return {
            weekIndex: idx,
            scrollLeft,
            expectedScrollLeft,
            maxScrollLeft,
            clampedExpectedScrollLeft,
            ariaCurrent: weekBtn?.getAttribute('aria-current') === 'true',
            roleRight: roleRect.right,
            weekLeft: weekRect.left,
            weekRight: weekRect.right,
            scrollLeftEdge: scrollRect.left,
            scrollRightEdge: scrollRect.right,
            clearOfRole,
            visibleInViewport,
            headerText: (weekCol.textContent ?? '').trim().slice(0, 80),
        }
    }, weekIndex)
}

export function assertWeekAudit(audit: WeekLayoutAudit, weekIndex: number) {
    expect(audit.weekIndex).toBe(weekIndex)
    expect(audit.ariaCurrent).toBe(true)
    expect(
        Math.abs(audit.scrollLeft - audit.clampedExpectedScrollLeft),
        `scrollLeft=${audit.scrollLeft} expected≈${audit.clampedExpectedScrollLeft}`,
    ).toBeLessThanOrEqual(SCROLL_LEFT_TOLERANCE_PX)
    expect(
        isServiceColumnClearOfStickyRole(
            { left: 0, right: audit.roleRight, top: 0, bottom: 0 } as DOMRect,
            { left: audit.weekLeft, right: audit.weekRight, top: 0, bottom: 0 } as DOMRect,
        ),
    ).toBe(true)
    expect(audit.clearOfRole, `Semana ${weekIndex + 1} solapa Rol`).toBe(true)
    expect(audit.visibleInViewport, `Semana ${weekIndex + 1} fuera del viewport`).toBe(true)
    expect(audit.headerText.length).toBeGreaterThan(0)
}

export async function selectDesktopWeek(page: Page, weekIndex: number) {
    const btn = page.getByTestId(`ofrenda-desktop-week-${weekIndex + 1}`)
    await btn.click()
    await waitForScrollLeft(page, scrollLeftForWeekIndex(weekIndex))
}
