/**
 * E2E — Cambio de TIPO de un día con propagación al detalle (Chromium).
 *
 * Requisito clave: al cambiar el jueves de Enseñanza a Alabanza desde admin,
 * los cultos futuros planeados de ese día pasan a Alabanza y pierden los roles
 * que Alabanza no contempla (enseñanza y testimonios). Se hace sobre la sede
 * demo Badalona.
 *
 * El test es autocontenido e idempotente: prepara su propia precondición
 * (jueves = Enseñanza con enseñante/testimonios asignados) y al terminar
 * restaura el horario y las asignaciones, para no dejar datos a medias ni
 * depender del orden de ejecución respecto a otras suites.
 */

import { test, expect, type Page } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hasE2ECredentials, loginIfNeeded } from './auth.helper'
import { hasServiceRole, serviceClient } from './sedes.helper'

const canRun = hasE2ECredentials() && hasServiceRole()
const TIPO_ENSENANZA = 6
const TIPO_ALABANZA = 5

async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    if (page.url().includes('/login')) {
        expect(await loginIfNeeded(page)).toBe(true)
    }
}

/** IDs de los cultos de jueves 19:00 futuros planeados de la sede. */
async function juevesFuturos(admin: SupabaseClient, sedeId: string, hoy: string): Promise<string[]> {
    const { data } = await admin
        .from('cultos')
        .select('id, fecha')
        .eq('sede_id', sedeId)
        .eq('hora_inicio', '19:00')
        .eq('estado', 'planeado')
        .gte('fecha', hoy)
    return (data ?? []).filter(c => new Date(`${c.fecha}T12:00:00`).getDay() === 4).map(c => c.id as string)
}

test.describe('Admin horarios · cambio de tipo con propagación', () => {
    test.skip(!canRun, 'Faltan credenciales E2E o service-role')

    test('Jueves Enseñanza → Alabanza propaga y limpia roles', async ({ page }) => {
        const admin = serviceClient()
        const { data: sede } = await admin.from('sedes').select('id').eq('slug', 'badalona').single()
        const sedeId = sede!.id as string
        const hoy = new Date().toISOString().slice(0, 10)

        const { data: pulpito } = await admin
            .from('profiles')
            .select('id')
            .eq('sede_id', sedeId)
            .eq('pulpito', true)
            .limit(2)
        const ensId = pulpito![0].id as string
        const testId = pulpito![1].id as string

        // ── Precondición: jueves = Enseñanza con enseñante/testimonios ──────────
        await admin.from('culto_schedules').update({ tipo_culto_id: TIPO_ENSENANZA }).eq('sede_id', sedeId).eq('day_of_week', 4)
        const juevesIds = await juevesFuturos(admin, sedeId, hoy)
        expect(juevesIds.length, 'hay jueves futuros que probar').toBeGreaterThan(0)
        await admin
            .from('cultos')
            .update({ tipo_culto_id: TIPO_ENSENANZA, id_usuario_ensenanza: ensId, id_usuario_testimonios: testId })
            .in('id', juevesIds)

        await loginAsAdmin(page)
        await page.goto('/dashboard/admin/horarios')
        await page.getByTestId('horarios-sede-badalona').click()

        try {
            // Editar el jueves 19:00 → Alabanza, con propagación activada
            await page.getByTestId('horario-editar-4-19:00').click()
            await page.getByTestId(`horario-form-tipo-${TIPO_ALABANZA}`).click()
            await page.getByTestId('horario-form-guardar').click()
            await page.waitForTimeout(1500)

            // No deben quedar jueves 19:00 futuros de tipo Enseñanza
            const { count: quedanEnsenanza } = await admin
                .from('cultos')
                .select('id', { count: 'exact', head: true })
                .in('id', juevesIds)
                .eq('tipo_culto_id', TIPO_ENSENANZA)
            expect(quedanEnsenanza ?? 0).toBe(0)

            // Los que ahora son Alabanza perdieron enseñanza y testimonios
            const { data: despues } = await admin
                .from('cultos')
                .select('id, tipo_culto_id, id_usuario_ensenanza, id_usuario_testimonios')
                .in('id', juevesIds)
            expect(despues!.every(c => c.tipo_culto_id === TIPO_ALABANZA)).toBe(true)
            expect(despues!.some(c => c.id_usuario_ensenanza)).toBe(false)
            expect(despues!.some(c => c.id_usuario_testimonios)).toBe(false)

            await page.screenshot({ path: 'qa-admin-horario-jueves-alabanza.png', fullPage: true })
        } finally {
            // Revertir SIEMPRE por UI: Alabanza → Enseñanza (propaga tipo de vuelta)
            await page.getByTestId('horario-editar-4-19:00').click()
            await page.getByTestId(`horario-form-tipo-${TIPO_ENSENANZA}`).click()
            await page.getByTestId('horario-form-guardar').click()
            await page.waitForTimeout(1200)
            // Restaurar las asignaciones que el cambio a Alabanza limpió
            const restaurar = await juevesFuturos(admin, sedeId, hoy)
            if (restaurar.length > 0) {
                await admin
                    .from('cultos')
                    .update({ id_usuario_ensenanza: ensId, id_usuario_testimonios: testId })
                    .in('id', restaurar)
            }
        }
    })
})
