import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials } from './auth.helper'
import { gotoOfrendaWithPlan } from './ofrenda-sacos.helpers'

/**
 * QA E2E — «Personas» de Labor ofrenda: género al crear y al editar.
 *  - crear una persona con género asignado desde el alta
 *  - crear sin género → aviso «sin género» → asignarlo desde la fila
 * Cada test crea su propia persona de prueba y la borra al final.
 */

function nombrePrueba(sufijo: string): string {
    return `Zz E2E Genero ${sufijo} ${Date.now() % 100000}`
}

async function crearPersona(page: Page, nombre: string, genero: 'hombre' | 'mujer' | null) {
    if (genero) {
        await page.getByTestId(`plano-personas-add-genero-${genero}`).click()
        await expect(page.getByTestId(`plano-personas-add-genero-${genero}`)).toHaveAttribute(
            'aria-pressed',
            'true',
        )
    }
    await page.getByTestId('plano-personas-add-input').fill(nombre)
    await page.getByTestId('plano-personas-add-btn').click()
}

function filaDe(page: Page, nombre: string) {
    return page.locator('[data-testid^="plano-persona-row-"]', { hasText: nombre })
}

async function expandirFila(page: Page, nombre: string) {
    const fila = filaDe(page, nombre)
    await fila.locator('[data-testid^="plano-persona-expand-"]').click()
    await expect(fila.locator('[data-testid^="plano-persona-expanded-"]')).toBeVisible()
    return fila
}

async function borrarPersona(page: Page, nombre: string) {
    const fila = filaDe(page, nombre)
    await fila.locator('[data-testid^="plano-persona-delete-"]').click()
    await page.getByTestId('plano-personas-delete-confirm').click()
    await expect(filaDe(page, nombre)).toHaveCount(0, { timeout: 15000 })
}

test.describe('Labor ofrenda — Personas: género al crear y editar', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const nav = await gotoOfrendaWithPlan(page)
        test.skip(nav !== 'ok', 'Sin plan o login')
        await page.getByTestId('ofrenda-section-laborOfrenda').click()
        await page.getByTestId('ofrenda-tab-laborOfrenda-personas').click()
        await page.getByTestId('plano-personas-manager').waitFor({ timeout: 20000 })
    })

    test('crear con género mujer y cambiarlo a hombre desde la fila', async ({ page }) => {
        const nombre = nombrePrueba('A')
        await crearPersona(page, nombre, 'mujer')

        const fila = filaDe(page, nombre)
        await expect(fila).toHaveCount(1, { timeout: 15000 })
        // Con género asignado no hay aviso «sin género»
        await expect(fila.locator('[data-testid^="plano-persona-genero-missing-"]')).toHaveCount(0)

        await expandirFila(page, nombre)
        await expect(fila.locator('[data-testid$="-mujer"][data-testid^="plano-persona-genero-"]')).toHaveAttribute(
            'aria-pressed',
            'true',
        )

        // Cambiar a hombre desde el control de la fila
        await fila.locator('[data-testid$="-hombre"][data-testid^="plano-persona-genero-"]').click()
        await expect(fila.locator('[data-testid$="-hombre"][data-testid^="plano-persona-genero-"]')).toHaveAttribute(
            'aria-pressed',
            'true',
        )

        await borrarPersona(page, nombre)
    })

    test('crear sin género muestra el aviso y se asigna después', async ({ page }) => {
        const nombre = nombrePrueba('B')
        await crearPersona(page, nombre, null)

        const fila = filaDe(page, nombre)
        await expect(fila).toHaveCount(1, { timeout: 15000 })
        await expect(fila.locator('[data-testid^="plano-persona-genero-missing-"]')).toBeVisible()

        await expandirFila(page, nombre)
        await fila.locator('[data-testid$="-mujer"][data-testid^="plano-persona-genero-"]').click()
        await expect(fila.locator('[data-testid$="-mujer"][data-testid^="plano-persona-genero-"]')).toHaveAttribute(
            'aria-pressed',
            'true',
        )
        // El aviso desaparece al asignar género
        await expect(fila.locator('[data-testid^="plano-persona-genero-missing-"]')).toHaveCount(0)

        await borrarPersona(page, nombre)
    })
})
