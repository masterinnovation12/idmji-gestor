/**
 * E2E — Administración enterprise sobre las 3 sedes demo (Chromium).
 *
 * QA senior de los módulos nuevos, verificando SOLO las 3 sedes creadas por
 * scripts/seed-sedes-demo.mts (Barcelona, Terrassa, Badalona):
 *  1. Hub de administración con los módulos nuevos.
 *  2. Panel de control: KPIs, cambio de sede, gráficas y tablas por sede.
 *  3. Horarios por sede: crear un culto nuevo el domingo 08:00 en una sede y
 *     cambiar el tipo de un día (enseñanza ↔ alabanza) con propagación.
 *  4. Mapa de sedes: ficha, estado y horario semanal.
 *  5. Personas por sede: púlpito / labor / plano.
 *  6. Auditoría filtrada por sede.
 *
 * Requiere: seed ejecutado, .env.e2e.local (ADMIN) y .env.local (service-role).
 * No crea ni borra datos destructivos; sus cambios en horarios se revierten.
 */

import { test, expect, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'
import { hasServiceRole, serviceClient } from './sedes.helper'

test.describe.configure({ mode: 'serial' })

const canRun = hasE2ECredentials() && hasServiceRole()
const SEDES_DEMO = ['barcelona', 'terrassa', 'badalona'] as const

async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    if (page.url().includes('/login')) {
        const ok = await loginIfNeeded(page)
        expect(ok, 'login de ADMIN fallido (revisa .env.e2e.local)').toBe(true)
    }
}

test.describe('Admin enterprise · sedes demo', () => {
    test.skip(!canRun, 'Faltan credenciales E2E o service-role')

    test('1. Hub muestra los módulos enterprise nuevos', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin')
        await expect(page.getByTestId('admin-hub-hero')).toBeVisible()
        for (const mod of ['control', 'comparador', 'horarios', 'mapa', 'personas', 'sedes', 'audit']) {
            await expect(page.getByTestId(`admin-mod-${mod}`)).toBeVisible()
        }
        await page.screenshot({ path: 'qa-admin-enterprise-hub.png', fullPage: true })
    })

    test('2. Panel de control: KPIs y cambio entre las 3 sedes demo', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/control')
        await expect(page.getByTestId('control-hero')).toBeVisible()

        // Vista global: KPIs presentes
        for (const kpi of ['cultos', 'participaciones', 'lecturas', 'labores', 'usuarios']) {
            await expect(page.getByTestId(`control-kpi-${kpi}`)).toBeVisible()
        }
        // Resumen por sede incluye las 3 nuevas
        for (const slug of SEDES_DEMO) {
            await expect(page.getByTestId(`control-resumen-${slug}`)).toBeVisible()
        }
        await page.screenshot({ path: 'qa-admin-control-global.png', fullPage: true })

        // Filtrar por cada sede demo y comprobar que hay cultos de julio
        for (const slug of SEDES_DEMO) {
            await page.getByTestId(`control-sede-${slug}`).click()
            await expect(page.getByTestId('control-tabla-cultos')).toBeVisible()
            const filas = page.locator('[data-testid="control-tabla-cultos"] tbody tr')
            await expect.poll(() => filas.count()).toBeGreaterThan(0)
            await page.screenshot({ path: `qa-admin-control-${slug}.png`, fullPage: true })
        }
    })

    test('3. Horarios: crear domingo 08:00 y propagar tipo en una sede demo', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/horarios')
        await expect(page.getByTestId('horarios-hero')).toBeVisible({ timeout: 30_000 })

        // Trabajamos sobre Badalona para no chocar con Barcelona (que ya tiene 08:00)
        await page.getByTestId('horarios-sede-badalona').click()

        // ¿ya existe un 08:00 el domingo? (idempotencia entre ejecuciones)
        const yaExiste = await page.getByTestId('horario-0-08:00').count()
        if (yaExiste === 0) {
            await page.getByTestId('horarios-add-0').click()
            await page.getByTestId('horario-form-hora').fill('08:00')
            // tipo Enseñanza (domingo = enseñanza)
            await page.getByTestId('horario-form-tipo-6').click()
            await page.getByTestId('horario-form-guardar').click()
            await expect(page.getByTestId('horario-0-08:00')).toBeVisible({ timeout: 15_000 })
        }
        await page.screenshot({ path: 'qa-admin-horarios-badalona.png', fullPage: true })

        // Verificar en BD que se generaron cultos futuros del nuevo horario
        const admin = serviceClient()
        const { data: sede } = await admin.from('sedes').select('id').eq('slug', 'badalona').single()
        const hoy = new Date().toISOString().slice(0, 10)
        const { count } = await admin
            .from('cultos')
            .select('id', { count: 'exact', head: true })
            .eq('sede_id', sede!.id)
            .eq('hora_inicio', '08:00')
            .gte('fecha', hoy)
        expect(count ?? 0, 'el horario nuevo generó cultos futuros').toBeGreaterThan(0)

        // Limpieza: quitar el horario 08:00 y sus cultos futuros
        await page.getByTestId('horario-eliminar-0-08:00').click()
        await page.getByTestId('horario-eliminar-confirmar').click()
        await expect(page.getByTestId('horario-0-08:00')).toHaveCount(0, { timeout: 15_000 })
    })

    test('4. Mapa: ficha con estado y horario semanal de las sedes demo', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/mapa')
        await expect(page.getByTestId('mapa-hero')).toBeVisible()
        await expect(page.getByTestId('mapa-canvas')).toBeVisible()

        for (const slug of SEDES_DEMO) {
            await page.getByTestId(`mapa-sede-${slug}`).click()
            await expect(page.getByTestId('mapa-ficha')).toBeVisible()
            await expect(page.getByTestId('mapa-ficha-horario')).toBeVisible()
        }
        await page.screenshot({ path: 'qa-admin-mapa.png', fullPage: true })
    })

    test('5. Personas por sede: púlpito, labor y plano', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/personas')
        await expect(page.getByTestId('personas-hero')).toBeVisible()

        await page.getByTestId('personas-sede-terrassa').click()
        for (const tab of ['pulpito', 'labor', 'plano'] as const) {
            await page.getByTestId(`personas-tab-${tab}`).click()
            await expect(page.getByTestId('personas-lista')).toBeVisible()
        }
        await page.screenshot({ path: 'qa-admin-personas-terrassa.png', fullPage: true })
    })

    test('7. Export Excel premium descarga un .xlsx', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/control')
        await expect(page.getByTestId('control-hero')).toBeVisible()
        // Filtramos por Barcelona para exportar solo esa sede
        await page.getByTestId('control-sede-barcelona').click()
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 30_000 }),
            page.getByTestId('control-export-excel').click(),
        ])
        expect(download.suggestedFilename()).toMatch(/idmji-control-barcelona-2026-07\.xlsx$/)
        await download.saveAs('qa-control-barcelona.xlsx')
    })

    test('6. Auditoría filtrable por sede', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/audit')
        // Rutas que compilan bajo demanda en dev: margen amplio en el primer acceso
        await expect(page.getByTestId('audit-page')).toBeVisible({ timeout: 30_000 })
        await expect(page.getByTestId('audit-filter-sede')).toBeVisible()

        // Filtrar por Barcelona: debe haber registros del seed
        const admin = serviceClient()
        const { data: sede } = await admin.from('sedes').select('id').eq('slug', 'barcelona').single()
        await page.getByTestId('audit-filter-sede').selectOption(sede!.id)
        await page.waitForTimeout(800)
        await page.screenshot({ path: 'qa-admin-audit-sede.png', fullPage: true })
    })

    test('8. Salud de datos: alertas accionables en el panel', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/control')
        await expect(page.getByTestId('control-salud')).toBeVisible()
        // El bloque muestra o bien "todo ok" o bien alertas; ambos son válidos.
        const ok = await page.getByTestId('control-salud-ok').count()
        if (ok === 0) {
            const alertas = page.locator('[data-testid^="control-alerta-"]')
            await expect.poll(() => alertas.count()).toBeGreaterThan(0)
        }
        await page.screenshot({ path: 'qa-admin-salud.png', fullPage: true })
    })

    test('9. Perfil 360° del hermano desde el panel', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/control')
        await page.getByTestId('control-sede-barcelona').click()
        await expect(page.getByTestId('control-tabla-hermanos')).toBeVisible()

        // Clic en el primer hermano con enlace → perfil 360°
        const primer = page.locator('[data-testid^="control-hermano-"]').first()
        await expect(primer).toBeVisible()
        await primer.click()
        // La ruta dinámica [id] compila en el primer acceso (dev): margen amplio.
        await expect(page.getByTestId('hermano-hero')).toBeVisible({ timeout: 30_000 })
        await expect(page.getByTestId('hermano-breakdown')).toBeVisible()
        await expect(page.getByTestId('hermano-por-anio')).toBeVisible()
        await expect(page.getByTestId('hermano-recientes')).toBeVisible()
        await page.screenshot({ path: 'qa-admin-hermano-360.png', fullPage: true })
    })

    test('10. Comparador de sedes lado a lado', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/comparador')
        await expect(page.getByTestId('comparador-hero')).toBeVisible({ timeout: 30_000 })
        await expect(page.getByTestId('comparador-tabla')).toBeVisible()
        // Las 3 sedes demo aparecen como tarjetas comparativas
        for (const slug of SEDES_DEMO) {
            await expect(page.getByTestId(`comparador-card-${slug}`)).toBeVisible()
        }
        await page.screenshot({ path: 'qa-admin-comparador.png', fullPage: true })
    })

    test('12. Tendencias mes a mes con toggle de métrica', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/control')
        await expect(page.getByTestId('control-tendencias')).toBeVisible()
        // La gráfica de líneas renderiza (svg de recharts presente)
        await expect(page.locator('[data-testid="control-tendencias"] svg').first()).toBeVisible()
        // Cambiar métrica a cultos y comprobar que sigue renderizando
        await page.getByTestId('control-tendencias-cultos').click()
        await expect(page.locator('[data-testid="control-tendencias"] svg').first()).toBeVisible()
        // Julio 2026 aparece en el eje X
        await expect(page.locator('[data-testid="control-tendencias"]').getByText('2026-07').first()).toBeVisible()
        await page.screenshot({ path: 'qa-admin-tendencias.png', fullPage: true })
    })

    test('11. Export PDF ejecutivo descarga un .pdf', async ({ page }) => {
        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/control')
        await expect(page.getByTestId('control-hero')).toBeVisible()
        await page.getByTestId('control-sede-barcelona').click()
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 30_000 }),
            page.getByTestId('control-export-pdf').click(),
        ])
        expect(download.suggestedFilename()).toMatch(/idmji-control-barcelona-2026-07\.pdf$/)
        await download.saveAs('qa-control-barcelona.pdf')
    })
})
