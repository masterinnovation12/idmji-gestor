/**
 * QA rediseño "liquid premium" del Dashboard (/dashboard) y del modal
 * "Añadir lectura" + acciones de asignación en el detalle de culto.
 *
 * DL01 Dashboard — cards liquid (culto del día, asignaciones, accesos rápidos)
 * DL02 Dashboard — botón CTA "Ver detalles" navy/dorado
 * DL03 Modal Añadir lectura — inputs liquid con borde dorado + botón registrar navy
 * DL04 Modal Añadir lectura — dropdown de libros con marco dorado y grupos AT/NT
 * DL05 Detalle de culto — acciones Modificar/Quitar junto al asignado (móvil)
 * DL06 Detalle de culto — selector de hermanos liquid (input + dropdown)
 */
import { test, expect, type Locator, type Page } from '@playwright/test'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'

const GOLD = /184,\s*150,\s*74/      // #b8964a en rgb()
const NAVY = /31,\s*46,\s*133/       // #1f2e85 en rgb()

async function borderColors(el: Locator): Promise<string> {
    return el.evaluate(node => {
        const s = getComputedStyle(node as Element)
        return [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor].join(' ')
    })
}
async function bgImage(el: Locator): Promise<string> {
    return el.evaluate(node => getComputedStyle(node as Element).backgroundImage)
}

async function gotoDashboard(page: Page): Promise<boolean> {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    const ok = await loginIfNeeded(page)
    if (!ok) return false
    await page.waitForTimeout(2500)
    return true
}

/** Abre el modal Añadir lectura desde el dashboard si el culto visible lo permite. */
async function openAddLecturaModal(page: Page): Promise<boolean> {
    const addBtn = page.locator('button', { hasText: /añadir lectura|afegir lectura/i }).first()
    if (!(await addBtn.isVisible({ timeout: 5000 }).catch(() => false))) return false
    await addBtn.click()
    await page.waitForTimeout(800)
    return true
}

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.describe('Dashboard — rediseño liquid', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E en .env.e2e.local')
        const ok = await gotoDashboard(page)
        test.skip(!ok, 'Login falló')
    })

    test('DL01 — cards liquid en el dashboard', async ({ page }) => {
        const cards = page.locator('.ofrenda-liquid-card')
        await expect(cards.first()).toBeVisible()
        expect(await cards.count()).toBeGreaterThanOrEqual(3)
        expect(await borderColors(cards.first())).toMatch(GOLD)
    })

    test('DL02 — CTA "Ver detalles" navy/dorado', async ({ page }) => {
        const cta = page.locator('button', { hasText: /ver detalles|veure('ls)? detalls|ver todos los detalles/i }).first()
        if (!(await cta.isVisible({ timeout: 5000 }).catch(() => false))) {
            test.skip(true, 'No hay culto visible con CTA')
            return
        }
        expect(await borderColors(cta)).toMatch(GOLD)
        expect(await bgImage(cta)).toMatch(NAVY)
    })

    test('DL03 — modal Añadir lectura: inputs liquid + botón registrar navy', async ({ page }) => {
        const opened = await openAddLecturaModal(page)
        test.skip(!opened, 'El culto visible no permite añadir lectura')

        const bookInput = page.locator('input[placeholder*="libro" i], input[placeholder*="llibre" i]').first()
        await expect(bookInput).toBeVisible()
        expect(await borderColors(bookInput)).toMatch(GOLD)

        const registrar = page.locator('button', { hasText: /registrar (la )?lectura/i }).first()
        await expect(registrar).toBeVisible()
        expect(await bgImage(registrar)).toMatch(NAVY)
        expect(await borderColors(registrar)).toMatch(GOLD)
    })

    test('DL04 — modal Añadir lectura: dropdown de libros liquid con grupos AT/NT', async ({ page }) => {
        const opened = await openAddLecturaModal(page)
        test.skip(!opened, 'El culto visible no permite añadir lectura')

        const bookInput = page.locator('input[placeholder*="libro" i], input[placeholder*="llibre" i]').first()
        await bookInput.click()
        await page.waitForTimeout(800)

        await expect(page.getByText(/antiguo testamento|antic testament/i).first()).toBeVisible()
        // Elegir un libro y comprobar la vista previa liquid
        await bookInput.fill('Salmos')
        await page.waitForTimeout(600)
        const opt = page.locator('button', { hasText: /salmos|salms/i }).first()
        if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
            await opt.click()
            const capInput = page.locator('input[type="number"]').first()
            await expect(capInput).toBeEnabled()
            expect(await borderColors(capInput)).toMatch(GOLD)
        }
    })
})

test.describe('Detalle de culto — acciones de asignación', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(!hasE2ECredentials(), 'Faltan credenciales E2E en .env.e2e.local')
        const ok = await gotoDashboard(page)
        test.skip(!ok, 'Login falló')
    })

    test('DL05 — Modificar/Quitar junto al asignado y flujo de edición', async ({ page }) => {
        // Ir a la ficha del culto visible
        const cta = page.locator('a[href*="/dashboard/cultos/"]').first()
        test.skip(!(await cta.isVisible({ timeout: 5000 }).catch(() => false)), 'Sin culto visible')
        await cta.click()
        try {
            await page.waitForURL(/\/dashboard\/cultos\//, { timeout: 15000 })
        } catch {
            // El rate limit de auth de Supabase puede tumbar la sesión en local
            test.skip(page.url().includes('/login'), 'Sesión caída (rate limit de auth)')
            throw new Error('No se llegó a la ficha del culto: ' + page.url())
        }
        await page.waitForTimeout(2500)

        const modify = page.getByTestId('assignment-modify-btn').first()
        test.skip(!(await modify.isVisible({ timeout: 5000 }).catch(() => false)), 'Sin asignados en este culto')

        // Los botones están junto al contenido (no solo en la cabecera)
        const remove = page.getByTestId('assignment-remove-btn').first()
        await expect(remove).toBeVisible()

        // Modificar abre el selector de hermanos y Cancelar lo cierra sin tocar datos
        await modify.click()
        const selectorInput = page.getByTestId('user-selector-input').first()
        await expect(selectorInput).toBeVisible()
        expect(await borderColors(selectorInput)).toMatch(GOLD)
        const cancel = page.locator('button', { hasText: /^cancelar$|^cancel·lar$/i }).first()
        await expect(cancel).toBeVisible()
        await cancel.click()
        await expect(selectorInput).toBeHidden()
        // La barra de guardado no debe aparecer (no hubo cambios)
        await expect(page.getByTestId('save-changes-bar')).toBeHidden()
    })

    test('DL06 — dropdown del selector de hermanos liquid', async ({ page }) => {
        const cta = page.locator('a[href*="/dashboard/cultos/"]').first()
        test.skip(!(await cta.isVisible({ timeout: 5000 }).catch(() => false)), 'Sin culto visible')
        await cta.click()
        try {
            await page.waitForURL(/\/dashboard\/cultos\//, { timeout: 15000 })
        } catch {
            test.skip(page.url().includes('/login'), 'Sesión caída (rate limit de auth)')
            throw new Error('No se llegó a la ficha del culto: ' + page.url())
        }
        await page.waitForTimeout(2500)

        // Abrir un selector: usar Modificar si hay asignado, o el input directo si está vacío
        let selectorInput = page.getByTestId('user-selector-input').first()
        if (!(await selectorInput.isVisible({ timeout: 3000 }).catch(() => false))) {
            const modify = page.getByTestId('assignment-modify-btn').first()
            test.skip(!(await modify.isVisible({ timeout: 3000 }).catch(() => false)), 'Sin secciones de asignación')
            await modify.click()
            selectorInput = page.getByTestId('user-selector-input').first()
        }
        await selectorInput.click()
        const dropdown = page.getByTestId('user-selector-dropdown')
        await expect(dropdown).toBeVisible()
        expect(await borderColors(dropdown)).toMatch(GOLD)
        // Cerrar sin seleccionar
        await page.keyboard.press('Escape')
    })
})
