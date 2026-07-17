/**
 * E2E — Sede activa del ADMIN: aislamiento visual y selector móvil (Chromium).
 *
 * 1. Con Sabadell activa, el dashboard muestra SOLO el culto de Sabadell
 *    (antes un ADMIN veía el mismo día repetido, uno por sede).
 * 2. Cambiar la sede activa desde el sidebar cambia los datos del dashboard.
 * 3. En MÓVIL, el selector de sede del drawer se despliega visible dentro
 *    del viewport y permite cambiar de sede (antes quedaba tapado).
 *
 * Siempre se restaura Sabadell como sede activa al terminar.
 */

import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'
import { hasServiceRole } from './sedes.helper'

test.describe.configure({ mode: 'serial' })

const canRun = hasE2ECredentials() && hasServiceRole()

async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    if (page.url().includes('/login')) {
        expect(await loginIfNeeded(page)).toBe(true)
    }
}

/**
 * Selecciona una sede en el switcher del sidebar y espera el refresh.
 * El sidebar se monta dos veces (drawer móvil + desktop): usamos siempre
 * la instancia VISIBLE.
 */
async function seleccionarSede(page: Page, slug: string): Promise<void> {
    const boton = page.getByTestId('sede-switcher-boton').filter({ visible: true }).first()
    await expect(boton).toBeVisible({ timeout: 15_000 })
    await boton.click()
    await expect(page.getByTestId('sede-switcher-lista').filter({ visible: true }).first()).toBeVisible()
    await page.getByTestId(`sede-switcher-opcion-${slug}`).filter({ visible: true }).first().click()
    await page.waitForTimeout(1800) // setActiveSede + router.refresh()
}

test.describe('Sede activa · dashboard y selector móvil', () => {
    test.skip(!canRun, 'Faltan credenciales E2E o service-role')

    test.afterAll(async ({ browser }) => {
        // Restaurar Sabadell como sede activa
        const page = await browser.newPage()
        await loginAsAdmin(page)
        await page.goto('/dashboard')
        await seleccionarSede(page, 'sabadell')
        await page.close()
    })

    test('1. Dashboard del ADMIN muestra solo la sede activa (sin duplicados)', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard')
        await seleccionarSede(page, 'sabadell')

        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        const body = await page.locator('body').innerText()

        // Antes del fix, el ADMIN veía el día repetido (un culto por sede) y
        // por tanto hermanos de las sedes demo. Con Sabadell activa no puede
        // aparecer NINGÚN hermano de Barcelona/Terrassa/Badalona.
        const hermanosDemo = [
            'Marc Vila', 'Jordi Puig', 'Pau Roca', 'Oriol Camps', // Barcelona
            'Miquel Font', 'Albert Riera', 'Enric Vidal',          // Terrassa
            'Victor Sala', 'Guillem Torres', 'Marcel Rius',        // Badalona
        ]
        const colados = hermanosDemo.filter(n => body.includes(n))
        expect(colados, `hermanos de otras sedes visibles: ${colados.join(', ')}`).toEqual([])
        await page.screenshot({ path: 'qa-sede-dashboard-sabadell.png', fullPage: true })
    })

    test('2. Cambiar de sede cambia los datos del dashboard', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard')

        // Con Barcelona activa deben aparecer hermanos de Barcelona en el
        // culto mostrado (seed: Vila/Puig/Serra/Roca/Ferrer/Camps/Bosch/Soler)
        await seleccionarSede(page, 'barcelona')
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        const bodyBcn = await page.locator('body').innerText()
        const apellidosBcn = ['Vila', 'Puig', 'Serra', 'Roca', 'Ferrer', 'Camps', 'Bosch', 'Soler']
        expect(
            apellidosBcn.some(a => bodyBcn.includes(a)),
            'el dashboard con Barcelona activa muestra hermanos de Barcelona',
        ).toBe(true)
        await page.screenshot({ path: 'qa-sede-dashboard-barcelona.png', fullPage: true })

        // Volver a Sabadell: los hermanos demo de Barcelona ya no aparecen
        await seleccionarSede(page, 'sabadell')
        await page.goto('/dashboard')
        await page.waitForLoadState('networkidle')
        const bodySab = await page.locator('body').innerText()
        const nombresDemoBcn = ['Marc Vila', 'Jordi Puig', 'Pau Roca', 'Oriol Camps']
        expect(
            nombresDemoBcn.some(n => bodySab.includes(n)),
            'con Sabadell activa no se cuelan hermanos de Barcelona',
        ).toBe(false)
    })

    test('3. Móvil: el selector de sedes del drawer es visible y usable', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await loginAsAdmin(page)
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')

        // Abrir el drawer móvil. El click puede llegar antes de que React
        // hidrate el onClick: reintentamos hasta que el drawer esté DENTRO
        // del viewport (x >= 0), que es la prueba real de que se abrió.
        const hamburger = page.getByTestId('mobile-menu-abrir')
        await expect(hamburger).toBeVisible({ timeout: 15_000 })
        const boton = page.getByTestId('sede-switcher-boton').first()
        await expect(async () => {
            await hamburger.click({ timeout: 2000 }).catch(() => undefined)
            await page.waitForTimeout(500) // animación del drawer
            const box = await boton.boundingBox()
            expect(box, 'el switcher tiene caja').not.toBeNull()
            expect(box!.x, 'el drawer está abierto (no desplazado fuera)').toBeGreaterThanOrEqual(0)
        }).toPass({ timeout: 30_000 })

        // Abrir el selector de sede
        await boton.click()

        const lista = page.getByTestId('sede-switcher-lista').filter({ visible: true }).first()
        await expect(lista).toBeVisible()

        // La lista está DENTRO del viewport y por encima (clicable):
        const box = await lista.boundingBox()
        expect(box, 'la lista tiene caja visible').not.toBeNull()
        expect(box!.y).toBeGreaterThanOrEqual(0)
        expect(box!.y + box!.height).toBeLessThanOrEqual(844)
        expect(box!.height).toBeGreaterThan(80) // 4 sedes visibles, no colapsada

        // Todas las opciones del seed son visibles y la de Terrassa clicable
        for (const slug of ['sabadell', 'barcelona', 'terrassa', 'badalona']) {
            await expect(
                page.getByTestId(`sede-switcher-opcion-${slug}`).filter({ visible: true }).first(),
            ).toBeVisible()
        }
        await page.screenshot({ path: 'qa-sede-switcher-movil.png', fullPage: false })

        await page.getByTestId('sede-switcher-opcion-terrassa').filter({ visible: true }).first().click()
        await page.waitForTimeout(1800)

        // El cambio se aplicó (el botón del switcher muestra Terrassa)
        await hamburger.click({ timeout: 5000 }).catch(() => undefined)
        await page.waitForTimeout(500)
        const textoBoton = await page
            .getByTestId('sede-switcher-boton')
            .filter({ visible: true })
            .first()
            .innerText()
            .catch(() => '')
        expect(textoBoton).toContain('Terrassa')
    })

    test('4. Móvil: al cambiar de sede el drawer se cierra solo y el dashboard carga la sede nueva sin reload', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 })
        await loginAsAdmin(page)
        await page.goto('/dashboard')
        await page.waitForLoadState('domcontentloaded')

        // Abrir el drawer (mismo patrón robusto del test 3)
        const hamburger = page.getByTestId('mobile-menu-abrir')
        await expect(hamburger).toBeVisible({ timeout: 15_000 })
        const boton = page.getByTestId('sede-switcher-boton').first()
        await expect(async () => {
            await hamburger.click({ timeout: 2000 }).catch(() => undefined)
            await page.waitForTimeout(500)
            const box = await boton.boundingBox()
            expect(box).not.toBeNull()
            expect(box!.x).toBeGreaterThanOrEqual(0)
        }).toPass({ timeout: 30_000 })

        await boton.click()
        await page.getByTestId('sede-switcher-opcion-badalona').filter({ visible: true }).first().click()

        // 1) El drawer se cierra SOLO tras confirmar el cambio (antes había
        //    que cerrarlo a mano).
        await expect(async () => {
            const box = await boton.boundingBox()
            expect(box === null || box.x < 0, 'drawer cerrado (off-canvas)').toBe(true)
        }).toPass({ timeout: 10_000 })

        // 2) Seguimos en el dashboard y SIN reload manual los datos ya son de
        //    Badalona (antes se quedaban los de la sede anterior en pantalla).
        await expect(page).toHaveURL(/\/dashboard\/?(\?.*)?$/)
        const badalona = ['Victor Sala', 'Guillem Torres', 'Dani Prat', 'Ivan Romero', 'Adria Soto', 'Marcel Rius', 'Bernat Coll', 'Quim Pons']
        const otrasSedes = [
            'Marc Vila', 'Jordi Puig', 'David Serra', 'Pau Roca', 'Joan Ferrer', 'Oriol Camps', 'Xavier Bosch', 'Genis Soler',
            'Miquel Font', 'Albert Riera', 'Sergi Casas', 'Ramon Pla', 'Enric Vidal', 'Narcis Costa', 'Aleix Mas', 'Pol Grau',
        ]
        await expect(async () => {
            const body = await page.locator('body').innerText()
            expect(badalona.some(n => body.includes(n)), 'aparece un hermano de Badalona').toBe(true)
            const colados = otrasSedes.filter(n => body.includes(n))
            expect(colados, `hermanos de otra sede visibles: ${colados.join(', ')}`).toEqual([])
        }).toPass({ timeout: 25_000 })
        await page.screenshot({ path: 'qa-sede-movil-autoclose-badalona.png', fullPage: false })
    })

    test('5. Labor púlpito: el plan solo muestra la sede activa y cambia con ella', async ({ page }) => {
        // Dev compila /dashboard/ofrenda bajo demanda: margen extra.
        test.setTimeout(120_000)
        const BCN = ['Marc Vila', 'Jordi Puig', 'David Serra', 'Pau Roca', 'Joan Ferrer', 'Oriol Camps', 'Xavier Bosch', 'Genis Soler']
        const TRS = ['Miquel Font', 'Albert Riera', 'Sergi Casas', 'Ramon Pla', 'Enric Vidal', 'Narcis Costa', 'Aleix Mas', 'Pol Grau']
        const BDN = ['Victor Sala', 'Guillem Torres', 'Dani Prat', 'Ivan Romero', 'Adria Soto', 'Marcel Rius', 'Bernat Coll', 'Quim Pons']

        const abrirPlanPulpitoMes = async () => {
            await page.goto('/dashboard/ofrenda')
            await page.waitForLoadState('domcontentloaded')
            const tabPulpito = page.getByTestId('ofrenda-section-laborPulpito')
            await expect(tabPulpito).toBeVisible({ timeout: 30_000 })
            await tabPulpito.click()
            await expect(page.getByTestId('pulpito-section')).toBeVisible({ timeout: 15_000 })
            // Mes completo (julio 2026 tiene datos demo en las 3 sedes)
            await page.getByTestId('pulpito-scope-month').click()
            await expect(page.getByTestId('pulpito-plan')).toBeVisible({ timeout: 15_000 })
        }

        await loginAsAdmin(page)
        await page.goto('/dashboard')

        // Con Barcelona activa: el plan tiene hermanos de Barcelona y NINGUNO
        // de Terrassa/Badalona (antes del fix se mezclaban todas las sedes).
        await seleccionarSede(page, 'barcelona')
        await abrirPlanPulpitoMes()
        await expect(async () => {
            const texto = await page.getByTestId('pulpito-section').innerText()
            expect(BCN.some(n => texto.includes(n)), 'el plan muestra hermanos de Barcelona').toBe(true)
            const colados = [...TRS, ...BDN].filter(n => texto.includes(n))
            expect(colados, `el plan mezcla sedes: ${colados.join(', ')}`).toEqual([])
        }).toPass({ timeout: 25_000 })
        await page.screenshot({ path: 'qa-pulpito-plan-barcelona.png', fullPage: true })

        // Al cambiar a Terrassa el plan pasa a ser SOLO de Terrassa.
        await seleccionarSede(page, 'terrassa')
        await abrirPlanPulpitoMes()
        await expect(async () => {
            const texto = await page.getByTestId('pulpito-section').innerText()
            expect(TRS.some(n => texto.includes(n)), 'el plan muestra hermanos de Terrassa').toBe(true)
            const colados = [...BCN, ...BDN].filter(n => texto.includes(n))
            expect(colados, `el plan mezcla sedes: ${colados.join(', ')}`).toEqual([])
        }).toPass({ timeout: 25_000 })
        await page.screenshot({ path: 'qa-pulpito-plan-terrassa.png', fullPage: true })
    })
})
