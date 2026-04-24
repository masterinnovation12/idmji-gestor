/**
 * E2E: el tema de la app NO debe seguir forzosamente prefers-color-scheme del SO.
 * Caso reclamado: móvil/PC en modo oscuro del sistema pero el usuario quiere la app en claro.
 */
import { test, expect } from '@playwright/test'

test.describe('Tema independiente del sistema (prefers-color-scheme)', () => {
    test.use({ colorScheme: 'dark' })

    test('login: html sin .dark por defecto; toggle claro↔oscuro funciona', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'networkidle' })

        const root = page.locator('html')
        await expect(root).not.toHaveClass('dark')

        await page.getByRole('button', { name: /Activar tema oscuro|Activar tema fosc/i }).click()
        await expect(root).toHaveClass('dark')

        await page.getByRole('button', { name: /Activar tema claro|Activar tema clar/i }).click()
        await expect(root).not.toHaveClass('dark')
    })
})
