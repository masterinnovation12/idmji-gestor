/**
 * E2E — Testimonios (labor G1+G2) y secciones seleccionables de exportación.
 *
 * Cubre:
 *  - Filas Testimonios 1/2 en la tabla del plan (desktop) y en tarjetas (móvil).
 *  - Checks de secciones: defaults G1+G2 (todo) y Solo G2 (colaboradores + testimonios).
 *  - Título del documento siempre «Labores Generales» en ambos alcances.
 *  - Toggle de secciones se refleja en la captura (capture root).
 *  - Responsive: panel usable en móvil 390px y desktop 1920px.
 */
import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials } from './auth.helper'
import { gotoOfrendaWithPlan } from './ofrenda-sacos.helpers'

const ALL_SECTIONS = [
    'sacos',
    'realiza',
    'apoyo',
    'vigilancia',
    'primera_vez',
    'segunda_tercera_vez',
    'imposicion_manos',
    'colaboradores',
    'testimonios',
] as const

const G2_DEFAULTS = new Set(['colaboradores', 'testimonios'])

async function openExportTab(page: Page): Promise<void> {
    await page.getByTestId('ofrenda-tab-general-exportar').click()
    await page.getByTestId('ofrenda-export-sections').waitFor({ timeout: 20000 })
}

async function captureText(page: Page): Promise<string> {
    return (await page.locator('#ofrenda-export-capture-root').innerText()) ?? ''
}

test.describe('Labor Ofrenda — testimonios y secciones de export', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E')
        const nav = await gotoOfrendaWithPlan(page)
        test.skip(nav !== 'ok', 'Sin plan o login')
    })

    test('desktop: la tabla del plan muestra las filas Testimonios 1 y 2', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 })
        const desktop = page.getByTestId('ofrenda-plan-desktop')
        await desktop.waitFor({ timeout: 15000 })
        const roles = page.getByTestId('ofrenda-plan-sticky-role')
        await expect(roles.filter({ hasText: /Testimonios 1|Testimonis 1/ })).toHaveCount(1)
        await expect(roles.filter({ hasText: /Testimonios 2|Testimonis 2/ })).toHaveCount(1)
    })

    test('móvil 390px: las tarjetas de servicio incluyen Testimonios', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.reload()
        await page.getByTestId('ofrenda-sacos-config-toggle').waitFor({ timeout: 20000 })
        await expect(
            page.getByText(/Testimonios 1|Testimonis 1/).first(),
        ).toBeVisible({ timeout: 15000 })
        await expect(
            page.getByText(/Testimonios 2|Testimonis 2/).first(),
        ).toBeVisible()
    })

    test('G1+G2: todas las secciones marcadas por defecto', async ({ page }) => {
        await openExportTab(page)
        for (const key of ALL_SECTIONS) {
            await expect(
                page.getByTestId(`ofrenda-export-section-${key}`),
                `sección ${key} debería estar marcada`,
            ).toHaveAttribute('aria-pressed', 'true')
        }
    })

    test('Solo G2: por defecto solo colaboradores y testimonios marcados', async ({ page }) => {
        await openExportTab(page)
        await page.getByTestId('ofrenda-export-people-g2').click()
        for (const key of ALL_SECTIONS) {
            const expected = G2_DEFAULTS.has(key) ? 'true' : 'false'
            await expect(
                page.getByTestId(`ofrenda-export-section-${key}`),
                `sección ${key} debería ser aria-pressed=${expected}`,
            ).toHaveAttribute('aria-pressed', expected)
        }
    })

    test('volver a G1+G2 restaura todos los checks', async ({ page }) => {
        await openExportTab(page)
        await page.getByTestId('ofrenda-export-people-g2').click()
        await expect(page.getByTestId('ofrenda-export-section-sacos')).toHaveAttribute('aria-pressed', 'false')
        await page.getByTestId('ofrenda-export-people-all').click()
        for (const key of ALL_SECTIONS) {
            await expect(page.getByTestId(`ofrenda-export-section-${key}`)).toHaveAttribute('aria-pressed', 'true')
        }
    })

    test('el título del documento es «Labores Generales» en ambos alcances', async ({ page }) => {
        await openExportTab(page)
        await expect
            .poll(async () => captureText(page))
            .toMatch(/Labores Generales|Labors Generals/)

        await page.getByTestId('ofrenda-export-people-g2').click()
        await expect
            .poll(async () => captureText(page))
            .toMatch(/Labores Generales|Labors Generals/)
        const text = await captureText(page)
        expect(text).not.toMatch(/Labores Profecía|Labors Profecia/)
    })

    test('Solo G2: la captura incluye testimonios y excluye G1 y sacos', async ({ page }) => {
        await openExportTab(page)
        await page.getByTestId('ofrenda-export-people-g2').click()
        await expect
            .poll(async () => captureText(page))
            .toMatch(/Testimonios 1|Testimonis 1/)
        const text = await captureText(page)
        expect(text).toMatch(/Testimonios 2|Testimonis 2/)
        expect(text).toMatch(/Colaborador 1|Col·laborador 1/)
        expect(text).not.toMatch(/Coordinador/)
        expect(text).not.toMatch(/Vigilancia|Vigilància/)
        expect(text).not.toMatch(/sacos\/semana|sacs\/setmana/i)
    })

    test('desmarcar una sección la quita de la captura', async ({ page }) => {
        await openExportTab(page)
        await expect
            .poll(async () => captureText(page))
            .toMatch(/Testimonios 1|Testimonis 1/)

        await page.getByTestId('ofrenda-export-section-testimonios').click()
        await expect
            .poll(async () => captureText(page))
            .not.toMatch(/Testimonios 1|Testimonis 1/)

        await page.getByTestId('ofrenda-export-section-imposicion_manos').click()
        await expect
            .poll(async () => captureText(page))
            .not.toMatch(/Imposición de manos|Imposició de mans/)
    })

    test('móvil 390px: panel de export usable, checks accesibles y captura correcta', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.reload()
        await page.getByTestId('ofrenda-tab-general-exportar').click()
        await page.getByTestId('ofrenda-export-sections').waitFor({ timeout: 20000 })

        // Sin scroll horizontal en el body (responsive total)
        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow).toBeLessThanOrEqual(1)

        // Los chips son táctiles (mín. 40px de alto) y responden al toque
        const chip = page.getByTestId('ofrenda-export-section-testimonios')
        await chip.scrollIntoViewIfNeeded()
        const box = await chip.boundingBox()
        expect(box, 'chip visible').not.toBeNull()
        expect(box!.height).toBeGreaterThanOrEqual(40)
        await chip.click()
        await expect(chip).toHaveAttribute('aria-pressed', 'false')
        await chip.click()
        await expect(chip).toHaveAttribute('aria-pressed', 'true')

        // El alcance G2 también funciona en móvil
        await page.getByTestId('ofrenda-export-people-g2').click()
        await expect
            .poll(async () => captureText(page))
            .toMatch(/Testimonios 1|Testimonis 1/)
    })

    test('Personas: existe la sección Grupo 3 · Testimonios con controles de gestión', async ({ page }) => {
        await page.getByTestId('ofrenda-tab-general-personas').click()
        // Encabezado de la sección G3 (h2) y su leyenda (badge G3)
        const heading = page.getByRole('heading', { name: /Grupo 3 — Testimonios|Grup 3 — Testimonis/ })
        await expect(heading).toBeVisible({ timeout: 20000 })
        // La sección G3 es una sección completa: comparte los controles Añadir/Importar
        const section = page.locator('section', { hasText: /Grupo 3 — Testimonios|Grup 3 — Testimonis/ })
        await expect(section.getByRole('button', { name: /Añadir|Afegir/ })).toBeVisible()
    })

    test('desktop 1920px: testimonios tras imposición de manos y antes de colaboradores', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 })
        await openExportTab(page)
        await expect
            .poll(async () => captureText(page))
            .toMatch(/Testimonios 2|Testimonis 2/)
        const text = await captureText(page)
        // Orden de filas: G1 (…Imposición de manos) → Testimonios → Colaboradores.
        // «Colaborador 3» es inequívoco de G2 (evita casar con «Colaborador 1ª vez» de G1).
        const idxCoord = text.search(/Coordinador/)
        const idxImposicion = text.search(/Imposición de manos|Imposició de mans/)
        const idxTst = text.search(/Testimonios 1|Testimonis 1/)
        const idxColabG2 = text.search(/Colaborador 3|Col·laborador 3/)
        expect(idxCoord).toBeGreaterThanOrEqual(0)
        expect(idxImposicion).toBeGreaterThan(idxCoord)
        expect(idxTst).toBeGreaterThan(idxImposicion)
        expect(idxColabG2).toBeGreaterThan(idxTst)
    })
})
