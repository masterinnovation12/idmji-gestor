/**
 * E2E — Aislamiento por sede del Historial de Lecturas + módulo admin de
 * "Lecturas por sede" (Chromium).
 *
 * Bug reportado: siendo ADMIN con Sabadell activa, al buscar un libro en
 * Historial > Lecturas aparecían lectores/lecturas de TODAS las sedes.
 *
 * 1. Con Sabadell activa, el historial NO muestra lectores de otras sedes.
 * 2. Al cambiar a Barcelona el historial pasa a ser de Barcelona (y no cuela
 *    Terrassa/Badalona).
 * 3. El nuevo módulo /dashboard/admin/lecturas compara todas las sedes y deja
 *    filtrar por una sola.
 *
 * Siempre restaura Sabadell como sede activa al terminar.
 */

import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'
import { hasServiceRole, serviceClient, getSedeIdBySlug } from './sedes.helper'

/** Conteo real de lecturas de una sede en BD (verdad de referencia). */
async function contarLecturasSede(slug: string): Promise<number> {
    const sedeId = await getSedeIdBySlug(slug)
    if (!sedeId) return 0
    const admin = serviceClient()
    const { data: cultos } = await admin.from('cultos').select('id').eq('sede_id', sedeId)
    const ids = (cultos ?? []).map((c: { id: string }) => c.id)
    if (ids.length === 0) return 0
    const { count } = await admin
        .from('lecturas_biblicas')
        .select('id', { count: 'exact', head: true })
        .in('culto_id', ids)
    return count ?? 0
}

test.describe.configure({ mode: 'serial' })

const canRun = hasE2ECredentials() && hasServiceRole()

const BCN = ['Marc Vila', 'Jordi Puig', 'David Serra', 'Pau Roca', 'Joan Ferrer', 'Oriol Camps', 'Xavier Bosch', 'Genis Soler']
const TRS = ['Miquel Font', 'Albert Riera', 'Sergi Casas', 'Ramon Pla', 'Enric Vidal', 'Narcis Costa', 'Aleix Mas', 'Pol Grau']
const BDN = ['Victor Sala', 'Guillem Torres', 'Dani Prat', 'Ivan Romero', 'Adria Soto', 'Marcel Rius', 'Bernat Coll', 'Quim Pons']

async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    if (page.url().includes('/login')) {
        expect(await loginIfNeeded(page)).toBe(true)
    }
}

async function seleccionarSede(page: Page, slug: string): Promise<void> {
    const boton = page.getByTestId('sede-switcher-boton').filter({ visible: true }).first()
    await expect(boton).toBeVisible({ timeout: 15_000 })
    await boton.click()
    await expect(page.getByTestId('sede-switcher-lista').filter({ visible: true }).first()).toBeVisible()
    await page.getByTestId(`sede-switcher-opcion-${slug}`).filter({ visible: true }).first().click()
    await page.waitForTimeout(1800) // setActiveSede + router.refresh()
}

async function buscarLibro(page: Page, libro: string): Promise<void> {
    const search = page.getByTestId('lecturas-search-wrap').locator('input').first()
    await expect(search).toBeVisible({ timeout: 15_000 })
    await search.fill('')
    await search.fill(libro)
    await page.waitForTimeout(1400) // debounce de búsqueda + fetch
}

test.describe('Historial de Lecturas · aislamiento por sede', () => {
    test.skip(!canRun, 'Faltan credenciales E2E o service-role')

    test.afterAll(async ({ browser }) => {
        const page = await browser.newPage()
        await loginAsAdmin(page)
        await page.goto('/dashboard')
        await seleccionarSede(page, 'sabadell')
        await page.close()
    })

    test('1. Sabadell activa: buscar un libro no cuela lectores de otras sedes', async ({ page }) => {
        test.setTimeout(120_000)
        await loginAsAdmin(page)
        await page.goto('/dashboard')
        await seleccionarSede(page, 'sabadell')

        await page.goto('/dashboard/historial/lecturas')
        await page.waitForLoadState('networkidle')
        await buscarLibro(page, 'Salmos')

        const body = await page.locator('body').innerText()
        expect(body).toContain('Salmos')
        const colados = [...BCN, ...TRS, ...BDN].filter(n => body.includes(n))
        expect(colados, `lectores de otras sedes visibles: ${colados.join(', ')}`).toEqual([])
        await page.screenshot({ path: 'qa-historial-lecturas-sabadell.png', fullPage: true })
    })

    test('2. Cambiar a Barcelona: el historial es de Barcelona y no cuela Terrassa/Badalona', async ({ page }) => {
        test.setTimeout(120_000)
        await loginAsAdmin(page)
        await page.goto('/dashboard')
        await seleccionarSede(page, 'barcelona')

        await page.goto('/dashboard/historial/lecturas')
        await page.waitForLoadState('networkidle')

        // Sin filtro (las 20 lecturas más recientes de Barcelona): deben aparecer
        // lectores de Barcelona y NINGUNO de Terrassa/Badalona.
        await expect(async () => {
            const body = await page.locator('body').innerText()
            expect(BCN.some(n => body.includes(n)), 'aparece un lector de Barcelona').toBe(true)
            const colados = [...TRS, ...BDN].filter(n => body.includes(n))
            expect(colados, `lectores de otra sede visibles: ${colados.join(', ')}`).toEqual([])
        }).toPass({ timeout: 25_000 })
        await page.screenshot({ path: 'qa-historial-lecturas-barcelona.png', fullPage: true })

        // Volver a Sabadell: los lectores demo de Barcelona ya no aparecen.
        await page.goto('/dashboard')
        await seleccionarSede(page, 'sabadell')
        await page.goto('/dashboard/historial/lecturas')
        await page.waitForLoadState('networkidle')
        const bodySab = await page.locator('body').innerText()
        expect([...BCN, ...TRS, ...BDN].filter(n => bodySab.includes(n))).toEqual([])
    })

    test('3. TODAS las lecturas registradas de Sabadell aparecen (total UI == BD)', async ({ page }) => {
        test.setTimeout(120_000)
        const esperado = await contarLecturasSede('sabadell')
        expect(esperado, 'Sabadell debe tener lecturas de referencia en BD').toBeGreaterThan(0)

        await loginAsAdmin(page)
        await page.goto('/dashboard')
        await seleccionarSede(page, 'sabadell')
        await page.goto('/dashboard/historial/lecturas')
        await page.waitForLoadState('networkidle')

        // Abrir el panel de Estadísticas: el total de registros de la sede activa
        // DEBE coincidir con el conteo real en BD (ninguna lectura queda fuera).
        await page.getByRole('button', { name: /Estad[íi]stic/i }).first().click()
        const total = page.getByTestId('lecturas-stats-total')
        await expect(total).toBeVisible({ timeout: 15_000 })
        await expect(async () => {
            const n = Number((await total.innerText()).replace(/\D/g, ''))
            expect(n, `total historial (${n}) == lecturas en BD (${esperado})`).toBe(esperado)
        }).toPass({ timeout: 15_000 })

        // La paginación es coherente con el total (sin filtros, 20 por página).
        const info = page.getByTestId('lecturas-pagination-info')
        if (esperado > 20) {
            await expect(info).toBeVisible()
            await expect(info).toContainText(String(Math.ceil(esperado / 20)))
        }
        await page.screenshot({ path: 'qa-historial-lecturas-total-sabadell.png', fullPage: true })
    })

    test('4. Admin · Lecturas por sede: compara sedes y filtra por una', async ({ page }) => {
        test.setTimeout(120_000)
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/lecturas')
        await page.waitForLoadState('networkidle')

        await expect(page.getByTestId('lecturas-sede-hero')).toBeVisible({ timeout: 30_000 })

        // KPI global con un total positivo
        const total = await page.getByTestId('lecturas-sede-total').innerText()
        expect(Number(total.replace(/\D/g, ''))).toBeGreaterThan(0)

        // Desglose por sede: la tarjeta de Sabadell existe y su libro top es Salmos
        const cardSabadell = page.getByTestId('lecturas-sede-card-sabadell')
        await expect(cardSabadell).toBeVisible()
        await expect(cardSabadell).toContainText('Salmos')
        // Las 4 sedes demo aparecen como tarjetas
        for (const slug of ['sabadell', 'barcelona', 'terrassa', 'badalona']) {
            await expect(page.getByTestId(`lecturas-sede-card-${slug}`)).toBeVisible()
        }
        await page.screenshot({ path: 'qa-admin-lecturas-todas.png', fullPage: true })

        // Filtrar a una sola sede oculta el desglose por sede (ámbito = 1 sede)
        await page.getByTestId('lecturas-sede-selector').selectOption({ label: 'Sabadell' })
        await page.waitForTimeout(1200)
        await expect(page.getByTestId('lecturas-sede-cards')).toHaveCount(0)
        await expect(page.getByTestId('lecturas-sede-ranking')).toContainText('Salmos')
        await page.screenshot({ path: 'qa-admin-lecturas-sabadell.png', fullPage: true })
    })
})
