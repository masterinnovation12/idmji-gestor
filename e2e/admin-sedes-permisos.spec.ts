/**
 * E2E — Administración multi-sede + permisos granulares (Chromium).
 *
 * Escenario senior de punta a punta:
 *  1. El ADMIN ve el hub de administración (también en móvil).
 *  2. El ADMIN crea la sede "E2E Barcelona" desde la UI.
 *  3. Con más de una sede, aparece el selector de sede del sidebar (solo ADMIN).
 *  4. El modal de usuarios muestra selector de sede y matriz de permisos.
 *  5. Un usuario asignado a Barcelona NO ve datos de Sabadell (aislamiento RLS)
 *     ni el selector de sede ni la navegación de administración.
 *  6. Ese usuario tiene `cultos.editarDetalle: false`: en el detalle del día
 *     no puede editar observaciones ni guardar.
 *
 * Requiere: migración 20260711120000_sedes_y_permisos.sql aplicada,
 * .env.e2e.local con credenciales de un ADMIN y .env.local con service-role.
 */

import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'
import {
    E2E_SEDE,
    E2E_BCN_USER,
    hasServiceRole,
    cleanupE2ESede,
    getSedeIdBySlug,
    createBarcelonaUser,
    createBarcelonaCulto,
} from './sedes.helper'

test.describe.configure({ mode: 'serial' })

const canRun = hasE2ECredentials() && hasServiceRole()

async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    if (page.url().includes('/login')) {
        const ok = await loginIfNeeded(page)
        expect(ok, 'login de ADMIN fallido (revisa .env.e2e.local)').toBe(true)
    }
}

async function loginAs(page: Page, email: string, password: string): Promise<void> {
    await page.goto('/login')
    await page.getByTestId('login-email').fill(email)
    await page.getByTestId('login-password').fill(password)
    await page.getByTestId('login-submit').click()
    await page.waitForURL(/\/dashboard/, { timeout: 25_000 })
}

test.describe('Admin: sedes y permisos granulares', () => {
    test.skip(!canRun, 'Faltan credenciales E2E o service-role en .env.local')

    test.beforeAll(async () => {
        await cleanupE2ESede()
    })

    test.afterAll(async () => {
        await cleanupE2ESede()
    })

    test('1. ADMIN ve el hub de administración (desktop y móvil)', async ({ page }) => {
        await loginAsAdmin(page)

        await page.goto('/dashboard/admin')
        await expect(page.getByTestId('admin-hub-hero')).toBeVisible()
        await expect(page.getByTestId('admin-mod-usuarios')).toBeVisible()
        await expect(page.getByTestId('admin-mod-sedes')).toBeVisible()
        await expect(page.getByTestId('admin-mod-stats')).toBeVisible()
        await expect(page.getByTestId('admin-mod-audit')).toBeVisible()

        // Responsive: en móvil el hub sigue siendo usable (grid apilado)
        await page.setViewportSize({ width: 375, height: 812 })
        await expect(page.getByTestId('admin-hub-hero')).toBeVisible()
        await expect(page.getByTestId('admin-mod-sedes')).toBeVisible()
        await page.setViewportSize({ width: 1280, height: 800 })
    })

    test('2. ADMIN crea la sede E2E Barcelona desde la UI', async ({ page }) => {
        await loginAsAdmin(page)

        await page.goto('/dashboard/admin/sedes')
        await expect(page.getByTestId('sedes-hero')).toBeVisible()
        // La sede principal (Sabadell) siempre está
        await expect(page.getByTestId('sede-card-sabadell')).toBeVisible()

        await page.getByTestId('sedes-nueva').click()
        await page.getByTestId('sede-form-nombre').fill(E2E_SEDE.nombre)
        await page.getByTestId('sede-form-ciudad').fill(E2E_SEDE.ciudad)
        await page.getByTestId('sede-form-guardar').click()

        await expect(page.getByTestId(`sede-card-${E2E_SEDE.slug}`)).toBeVisible({ timeout: 10_000 })
    })

    test('3. Con más de una sede, el ADMIN ve el selector de sede', async ({ page }) => {
        await loginAsAdmin(page)

        await page.goto('/dashboard')
        // El sidebar se renderiza dos veces (off-canvas móvil oculto + desktop):
        // el switcher visible es el del sidebar desktop (el último en el DOM).
        const boton = page.getByTestId('sede-switcher-boton').last()
        await expect(boton).toBeVisible({ timeout: 15_000 })

        await boton.click()
        await expect(page.getByTestId(`sede-switcher-opcion-${E2E_SEDE.slug}`).last()).toBeVisible()
        // Cerrar sin cambiar: la sede activa del admin sigue siendo la suya
        await page.getByTestId('sede-switcher-opcion-sabadell').last().click()
    })

    test('4. El modal de usuarios muestra sede y matriz de permisos', async ({ page }) => {
        await loginAsAdmin(page)

        await page.goto('/dashboard/admin/users')
        await page.getByRole('button', { name: 'Nuevo Usuario' }).click()

        await expect(page.getByTestId('user-form-sede')).toBeVisible()
        await expect(page.getByTestId('permisos-editor')).toBeVisible()
        // La matriz muestra el permiso de asignar hermanos (input sr-only del switch)
        await expect(page.getByTestId('perm-switch-cultos.asignarHermanos')).toBeAttached()
    })

    test('5. El usuario de Barcelona no ve datos de Sabadell ni administración', async ({ browser }) => {
        // Preparación con service-role: usuario EDITOR en la sede E2E
        const sedeId = await getSedeIdBySlug(E2E_SEDE.slug)
        expect(sedeId, 'la sede E2E debe existir (test 2)').toBeTruthy()
        await createBarcelonaUser(sedeId as string)

        const context = await browser.newContext()
        const page = await context.newPage()
        try {
            await loginAs(page, E2E_BCN_USER.email, E2E_BCN_USER.password)

            // Sin selector de sede ni navegación de administración
            await expect(page.getByTestId('sede-switcher')).toHaveCount(0)
            await expect(page.locator('a[href="/dashboard/admin"]')).toHaveCount(0)

            // Aislamiento: en Personas de Labor General no aparecen los miembros de Sabadell
            await page.goto('/dashboard/ofrenda')
            await page.getByTestId('ofrenda-tab-general-personas').click()
            await expect(page.getByText('Rafael Quer')).toHaveCount(0)
            await expect(page.getByText('Edwin Wilches')).toHaveCount(0)
        } finally {
            await context.close()
        }
    })

    test('6. Sin permiso «editar detalle» no puede editar el día', async ({ browser }) => {
        const sedeId = await getSedeIdBySlug(E2E_SEDE.slug)
        expect(sedeId).toBeTruthy()
        const cultoId = await createBarcelonaCulto(sedeId as string)

        const context = await browser.newContext()
        const page = await context.newPage()
        try {
            await loginAs(page, E2E_BCN_USER.email, E2E_BCN_USER.password)

            await page.goto(`/dashboard/cultos/${cultoId}`)
            const obs = page.getByPlaceholder('Escribe aquí las observaciones del culto...')
            await expect(obs).toBeVisible({ timeout: 15_000 })
            // El textarea queda en solo-lectura y no hay barra de guardado
            await expect(obs).toHaveAttribute('readonly', '')
            await expect(page.getByTestId('save-changes-bar')).toHaveCount(0)
        } finally {
            await context.close()
        }
    })
})
