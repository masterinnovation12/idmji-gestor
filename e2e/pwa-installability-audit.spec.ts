/**
 * Auditoría senior de instalabilidad PWA en producción.
 * Comprueba criterios que Chrome exige para «Instalar aplicación» (WebAPK)
 * frente a «Añadir a pantalla de inicio» (solo acceso directo).
 */
import { test, expect } from '@playwright/test'
import sharp from 'sharp'

const PROD_URL = process.env.PWA_AUDIT_URL || 'https://idmji-gestor.vercel.app'

test.describe('PWA installability audit (senior)', () => {
  test('iconos 192 y 512 son PNG válidos con dimensiones exactas', async ({ request }) => {
    for (const spec of [
      { path: '/icons/icon-192x192.png', size: 192 },
      { path: '/icons/icon-512x512.png', size: 512 },
      { path: '/icons/icon-maskable-512x512.png', size: 512 },
    ]) {
      const res = await request.get(`${PROD_URL}${spec.path}`)
      expect(res.ok(), `${spec.path} debe responder 200`).toBeTruthy()
      const buf = await res.body()
      const meta = await sharp(buf).metadata()
      expect(meta.format).toBe('png')
      expect(meta.width).toBe(spec.size)
      expect(meta.height).toBe(spec.size)
    }
  })

  test('manifest enlazado desde /login con start_url en scope', async ({ page }) => {
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' })

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(manifestHref).toBe('/manifest.json')

    const audit = await page.evaluate(async () => {
      const res = await fetch('/manifest.json')
      const manifest = await res.json()
      const reg = await navigator.serviceWorker.getRegistration('/')
      await navigator.serviceWorker.ready
      return {
        manifestOk: res.ok,
        display: manifest.display,
        startUrl: manifest.start_url,
        scope: manifest.scope,
        iconCount: manifest.icons?.length ?? 0,
        swRegistered: !!reg,
        swControlled: !!navigator.serviceWorker.controller,
        swScript: reg?.active?.scriptURL ?? null,
        origin: location.origin,
        path: location.pathname,
      }
    })

    expect(audit.manifestOk).toBe(true)
    expect(audit.display).toBe('standalone')
    expect(audit.iconCount).toBeGreaterThanOrEqual(2)
    expect(audit.swRegistered).toBe(true)
    expect(audit.swControlled).toBe(true)
    expect(audit.swScript).toContain('/sw.js')
    expect(audit.path).toMatch(/\/login/)
    expect(audit.startUrl).toBe('/dashboard?utm_source=pwa_install')
    expect(audit.scope).toBe('/')
  })

  test('no hay errores de registro SW en consola al cargar login', async ({ page }) => {
    const swErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /service worker|sw\.js|manifest/i.test(msg.text())) {
        swErrors.push(msg.text())
      }
    })

    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' })
    expect(swErrors).toEqual([])
  })

  test('related_applications id coincide con manifest.id (getInstalledRelatedApps)', async ({
    request,
  }) => {
    const res = await request.get(`${PROD_URL}/manifest.json`)
    const manifest = await res.json()
    const webapp = manifest.related_applications?.find(
      (a: { platform: string }) => a.platform === 'webapp'
    )
    expect(webapp?.id).toBe(manifest.id)
    expect(webapp?.url).toBe(`${PROD_URL}/manifest.json`)
    expect(manifest.prefer_related_applications).toBe(false)
  })
})
