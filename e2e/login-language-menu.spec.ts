/**
 * E2E / QA: menú de idioma en login (icono → panel compacto).
 * Replica comprobaciones tipo Chrome DevTools: desktop, tablet, móvil.
 * No requiere credenciales (solo /login).
 */
import { test, expect, type Locator } from '@playwright/test'

/** Comprueba que el texto del ítem no queda recortado (scrollWidth ≈ clientWidth). */
async function expectNoHorizontalTextClip(locator: Locator, label: string) {
    await expect
        .poll(
            async () =>
                locator.evaluate((el) => {
                    const n = el as HTMLElement
                    return n.scrollWidth <= n.clientWidth + 2
                }),
            { message: `${label}: el botón recorta contenido (revisar overflow del layout o ancho del menú)` }
        )
        .toBe(true)
}

const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
] as const

for (const vp of viewports) {
    test.describe(`Login – idioma (${vp.name})`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } })

        test('menú se abre, opciones visibles y cambio a catalán actualiza la UI', async ({ page }) => {
            const errors: string[] = []
            page.on('console', (msg) => {
                if (msg.type() === 'error') errors.push(msg.text())
            })

            await page.addInitScript(() => {
                localStorage.setItem('language', 'es-ES')
            })
            await page.goto('/login', { waitUntil: 'networkidle' })

            await expect(page.getByTestId('language-menu-trigger')).toBeVisible()
            await expect(page.getByTestId('language-trigger-flag-es')).toBeVisible()

            await page.getByTestId('language-menu-trigger').click()

            const menu = page.getByRole('menu', { name: /idioma/i })
            await expect(menu).toBeVisible()
            await expect(page.getByTestId('language-select-es')).toBeVisible()
            await expect(page.getByTestId('language-select-ca')).toBeVisible()

            await expectNoHorizontalTextClip(page.getByTestId('language-select-es'), `idioma ES (${vp.name})`)
            await expectNoHorizontalTextClip(page.getByTestId('language-select-ca'), `idioma CA (${vp.name})`)

            await page.getByTestId('language-select-ca').click()
            await expect(menu).toBeHidden({ timeout: 5000 })

            await expect(page.getByTestId('language-trigger-flag-ca')).toBeVisible()
            await expect(page.getByText('Correu electrònic', { exact: true })).toBeVisible()
            await expect(page.getByRole('button', { name: /Triar idioma|Seleccionar castellà/i })).toBeVisible()

            await page.getByTestId('language-menu-trigger').click()
            await expect(page.getByRole('menu')).toBeVisible()
            await expectNoHorizontalTextClip(page.getByTestId('language-select-es'), `idioma ES en UI CA (${vp.name})`)
            await expectNoHorizontalTextClip(page.getByTestId('language-select-ca'), `idioma CA en UI CA (${vp.name})`)
            await page.getByTestId('language-select-es').click()
            await expect(page.getByText('Correo electrónico', { exact: true })).toBeVisible()
            await expect(page.getByTestId('language-trigger-flag-es')).toBeVisible()

            expect(errors, `Errores de consola (${vp.name})`).toEqual([])
        })

        test('Escape cierra el menú sin cambiar idioma', async ({ page }) => {
            await page.addInitScript(() => {
                localStorage.setItem('language', 'es-ES')
            })
            await page.goto('/login', { waitUntil: 'networkidle' })
            await page.getByTestId('language-menu-trigger').click()
            await expect(page.getByRole('menu')).toBeVisible()
            await page.keyboard.press('Escape')
            await expect(page.getByRole('menu')).toBeHidden({ timeout: 5000 })
        })
    })
}
