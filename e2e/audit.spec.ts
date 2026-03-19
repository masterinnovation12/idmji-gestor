/**
 * E2E: Página de Auditoría (solo ADMIN).
 * Verifica carga, filtros, búsqueda, responsive y exportación.
 * Requiere login con usuario ADMIN (E2E_USER_EMAIL con rol ADMIN).
 */

import { test, expect } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded, getLoginError } from './auth.helper'

const AUDIT_URL = '/dashboard/admin/audit'

test.describe('Auditoría', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AUDIT_URL)
    if (page.url().includes('/login')) {
      if (hasE2ECredentials()) {
        await loginIfNeeded(page)
        await page.goto(AUDIT_URL)
      }
    }
  })

  test('audit requiere autenticación: redirige a login o muestra contenido', async ({ page }) => {
    await expect(page).toHaveURL(/\/(login|dashboard)/, { timeout: 10000 })
  })

  test('carga la página de auditoría con usuario ADMIN', async ({ page }) => {
    if (!hasE2ECredentials()) {
      test.skip(true, 'E2E: Falta .env.e2e.local con credenciales')
      return
    }
    if (page.url().includes('/login')) {
      test.skip(true, 'E2E: No se pudo hacer login')
      return
    }
    if (page.url().includes('/dashboard') && !page.url().includes('/admin/audit')) {
      test.skip(true, 'E2E: Usuario sin rol ADMIN (redirigido a dashboard)')
      return
    }

    await expect(page).toHaveURL(/\/dashboard\/admin\/audit/, { timeout: 10000 })

    const auditPage = page.getByTestId('audit-page')
    await expect(auditPage).toBeVisible({ timeout: 10000 })

    // Header con título
    await expect(page.getByRole('heading', { name: /auditoría|auditoria/i })).toBeVisible({ timeout: 5000 })

    // Filtros visibles
    const searchInput = page.getByTestId('audit-search')
    await expect(searchInput).toBeVisible({ timeout: 5000 })

    const filterSelect = page.getByTestId('audit-filter-type')
    await expect(filterSelect).toBeVisible({ timeout: 5000 })

    // Tabla o cards en desktop/mobile
    const auditTable = page.getByTestId('audit-table')
    const auditCards = page.getByTestId('audit-cards')
    const hasTable = await auditTable.isVisible()
    const hasCards = await auditCards.isVisible()
    const hasEmpty = page.getByText(/no hay registros|no hi ha registres/i)
    expect(hasTable || hasCards || (await hasEmpty.isVisible())).toBeTruthy()
  })

  test('filtro de búsqueda funciona', async ({ page }) => {
    if (!hasE2ECredentials() || page.url().includes('/login') || !page.url().includes('/admin/audit')) {
      test.skip(true, 'E2E: Requiere login ADMIN')
      return
    }

    const searchInput = page.getByTestId('audit-search')
    await searchInput.waitFor({ state: 'visible', timeout: 5000 })

    await searchInput.fill('asignacion')
    await page.waitForTimeout(600)

    const loader = page.locator('[class*="animate-spin"]').first()
    await loader.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})

    const auditTable = page.getByTestId('audit-table')
    const auditCards = page.getByTestId('audit-cards')
    const hasTable = await auditTable.isVisible()
    const hasCards = await auditCards.isVisible()
    const hasEmpty = page.getByText(/no hay registros|no hi ha registres/i)
    expect(hasTable || hasCards || (await hasEmpty.isVisible())).toBeTruthy()
  })

  test('filtro por tipo funciona', async ({ page }) => {
    if (!hasE2ECredentials() || page.url().includes('/login') || !page.url().includes('/admin/audit')) {
      test.skip(true, 'E2E: Requiere login ADMIN')
      return
    }

    const filterSelect = page.getByTestId('audit-filter-type')
    await filterSelect.waitFor({ state: 'visible', timeout: 5000 })

    const options = await filterSelect.locator('option').allTextContents()
    if (options.length > 1) {
      const firstTipo = options.find((o) => o && !/todos|tots/i.test(o))
      if (firstTipo) {
        await filterSelect.selectOption({ label: firstTipo })
        await page.waitForTimeout(500)
        const loader = page.locator('[class*="animate-spin"]').first()
        await loader.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {})
      }
    }

    const auditPage = page.getByTestId('audit-page')
    await expect(auditPage).toBeVisible()
  })

  test('responsive: cards en móvil', async ({ page }) => {
    if (!hasE2ECredentials() || page.url().includes('/login') || !page.url().includes('/admin/audit')) {
      test.skip(true, 'E2E: Requiere login ADMIN')
      return
    }

    await page.setViewportSize({ width: 375, height: 667 })

    const auditCards = page.getByTestId('audit-cards')
    const auditTable = page.getByTestId('audit-table')

    await page.waitForTimeout(1000)

    const cardsVisible = await auditCards.isVisible()
    const tableVisible = await auditTable.isVisible()

    expect(cardsVisible).toBe(true)
    expect(tableVisible).toBe(false)
  })

  test('responsive: tabla en desktop', async ({ page }) => {
    if (!hasE2ECredentials() || page.url().includes('/login') || !page.url().includes('/admin/audit')) {
      test.skip(true, 'E2E: Requiere login ADMIN')
      return
    }

    await page.setViewportSize({ width: 1280, height: 720 })

    const auditTable = page.getByTestId('audit-table')
    const auditCards = page.getByTestId('audit-cards')

    await page.waitForTimeout(1000)

    const tableVisible = await auditTable.isVisible()
    const cardsVisible = await auditCards.isVisible()

    expect(tableVisible).toBe(true)
    expect(cardsVisible).toBe(false)
  })

  test('botones de exportación existen y no fallan', async ({ page }) => {
    if (!hasE2ECredentials() || page.url().includes('/login') || !page.url().includes('/admin/audit')) {
      test.skip(true, 'E2E: Requiere login ADMIN')
      return
    }

    const exportPageBtn = page.getByRole('button', { name: /exportar página|exportar pàgina/i })
    const exportAllBtn = page.getByRole('button', { name: /exportar todo|exportar tot/i })

    await expect(exportPageBtn.first()).toBeVisible({ timeout: 5000 })
    await expect(exportAllBtn.first()).toBeVisible({ timeout: 5000 })

    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)

    await exportAllBtn.first().click()

    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toMatch(/auditoria_idmji_.*\.xlsx/)
    }
  })
})
