/**
 * E2E — Administración del catálogo del himnario (Chromium).
 *
 * Ciclo completo como ADMIN: crear himno → editarlo (nombre y número) →
 * buscarlo → eliminarlo; y lo mismo en la pestaña de coros. Incluye
 * comprobación responsive en móvil. Limpieza total con service-role.
 *
 * Requiere: migración 20260712100000_catalogos_rls_admin.sql aplicada.
 */

import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'
import { hasServiceRole, serviceClient } from './sedes.helper'

test.describe.configure({ mode: 'serial' })

const canRun = hasE2ECredentials() && hasServiceRole()

// Números altos para no chocar con el catálogo real
const NUM_HIMNO = 9871
const NUM_HIMNO_EDITADO = 9872
const NUM_CORO = 9873

async function cleanupCatalogo(): Promise<void> {
    const admin = serviceClient()
    await admin.from('himnos').delete().in('numero', [NUM_HIMNO, NUM_HIMNO_EDITADO])
    await admin.from('coros').delete().in('numero', [NUM_CORO])
}

async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    if (page.url().includes('/login')) {
        const ok = await loginIfNeeded(page)
        expect(ok, 'login de ADMIN fallido (revisa .env.e2e.local)').toBe(true)
    }
}

test.describe('Admin: catálogo del himnario', () => {
    test.skip(!canRun, 'Faltan credenciales E2E o service-role en .env.local')

    test.beforeAll(async () => {
        await cleanupCatalogo()
    })

    test.afterAll(async () => {
        await cleanupCatalogo()
    })

    test('1. Crear, editar, buscar y eliminar un himno', async ({ page }) => {
        await loginAsAdmin(page)

        // El hub muestra el módulo y lleva a la página
        // (timeout amplio: la primera visita compila la ruta en dev)
        await page.goto('/dashboard/admin')
        await page.getByTestId('admin-mod-himnario').click()
        await expect(page.getByTestId('himnario-admin-hero')).toBeVisible({ timeout: 30_000 })

        // Crear
        await page.getByTestId('himnario-nuevo').click()
        await page.getByTestId('himnario-form-numero').fill(String(NUM_HIMNO))
        await page.getByTestId('himnario-form-titulo').fill('E2E Himno de prueba')
        await page.getByTestId('himnario-form-duracion').fill('4:05')
        await page.getByTestId('himnario-form-guardar').click()
        await expect(page.getByTestId(`himnario-item-himno-${NUM_HIMNO}`)).toBeVisible({ timeout: 10_000 })

        // Editar (nombre + número)
        await page.getByTestId(`himnario-editar-himno-${NUM_HIMNO}`).click()
        await page.getByTestId('himnario-form-numero').fill(String(NUM_HIMNO_EDITADO))
        await page.getByTestId('himnario-form-titulo').fill('E2E Himno editado')
        await page.getByTestId('himnario-form-guardar').click()
        const editado = page.getByTestId(`himnario-item-himno-${NUM_HIMNO_EDITADO}`)
        await expect(editado).toBeVisible({ timeout: 10_000 })
        await expect(editado).toContainText('E2E Himno editado')

        // Buscar por número
        await page.getByTestId('himnario-buscar').fill(String(NUM_HIMNO_EDITADO))
        await expect(editado).toBeVisible()

        // Eliminar (sin usos: permitido)
        await page.getByTestId(`himnario-eliminar-himno-${NUM_HIMNO_EDITADO}`).click()
        await page.getByTestId('himnario-eliminar-confirmar').click()
        await expect(page.getByTestId(`himnario-item-himno-${NUM_HIMNO_EDITADO}`)).toHaveCount(0, { timeout: 10_000 })
    })

    test('2. Pestaña de coros: crear y eliminar (y responsive móvil)', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/himnario')

        await page.getByTestId('himnario-tab-coro').click()
        await page.getByTestId('himnario-nuevo').click()
        await page.getByTestId('himnario-form-numero').fill(String(NUM_CORO))
        await page.getByTestId('himnario-form-titulo').fill('E2E Coro de prueba')
        await page.getByTestId('himnario-form-guardar').click()
        const coro = page.getByTestId(`himnario-item-coro-${NUM_CORO}`)
        await expect(coro).toBeVisible({ timeout: 10_000 })

        // Responsive: en móvil la fila sigue siendo usable
        await page.setViewportSize({ width: 375, height: 812 })
        await expect(coro).toBeVisible()
        await expect(page.getByTestId(`himnario-eliminar-coro-${NUM_CORO}`)).toBeVisible()

        await page.getByTestId(`himnario-eliminar-coro-${NUM_CORO}`).click()
        await page.getByTestId('himnario-eliminar-confirmar').click()
        await expect(coro).toHaveCount(0, { timeout: 10_000 })
        await page.setViewportSize({ width: 1280, height: 800 })
    })
})
