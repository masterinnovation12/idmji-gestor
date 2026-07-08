/**
 * E2E Chromium: criterios de instalabilidad PWA en producción.
 * No requiere login — valida manifest, SW y meta tags desde la home/login.
 */
import { test, expect, devices } from '@playwright/test'

const PROD_URL = process.env.PWA_AUDIT_URL || 'https://idmji-gestor.vercel.app'

test.describe('PWA installability (Chromium)', () => {
  test('manifest.json cumple criterios mínimos de Chrome', async ({ request }) => {
    const res = await request.get(`${PROD_URL}/manifest.json`)
    expect(res.ok()).toBeTruthy()
    const ct = res.headers()['content-type'] || ''
    expect(ct).toMatch(/json/i)

    const manifest = await res.json()
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBeTruthy()
    expect(manifest.display).toMatch(/standalone|fullscreen|minimal-ui/)
    expect(manifest.icons?.length).toBeGreaterThanOrEqual(2)

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(manifest.prefer_related_applications).toBe(false)
  })

  test('service worker se registra y controla la página', async ({ page }) => {
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' })

    const swState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false }
      const reg = await navigator.serviceWorker.getRegistration('/')
      if (!reg) return { supported: true, registered: false }
      await navigator.serviceWorker.ready
      return {
        supported: true,
        registered: true,
        scope: reg.scope,
        scriptURL: reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL,
        controlled: !!navigator.serviceWorker.controller,
      }
    })

    expect(swState.supported).toBe(true)
    expect(swState.registered).toBe(true)
    expect(swState.scope).toContain(PROD_URL)
    expect(swState.scriptURL).toContain('/sw.js')
  })

  test('layout enlaza manifest y apple-touch-icon', async ({ page }) => {
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' })

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(manifestHref).toBe('/manifest.json')

    const appleIcon = await page.locator('link[rel="apple-touch-icon"]').first().getAttribute('href')
    expect(appleIcon).toMatch(/icon-180x180/)

    const mobileCapable = await page.locator('meta[name="mobile-web-app-capable"]').first().getAttribute('content')
    expect(mobileCapable).toBe('yes')
  })

  test('emulación Android: fallback manual tras timeout sin BIP', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 7'],
      storageState: undefined,
    })
    const page = await context.newPage()

    await page.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' })

    // Sin beforeinstallprompt → debe aparecer fallback android-manual ~12s
    const manual = page.getByTestId('pwa-android-manual')
    await expect(manual).toBeVisible({ timeout: 20_000 })

    await context.close()
  })

  test('emulación Android: banner nativo si hay beforeinstallprompt', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 7'],
    })
    const page = await context.newPage()

    await page.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' })

    await page.waitForFunction(() => 'serviceWorker' in navigator && !!navigator.serviceWorker.controller, {
      timeout: 15_000,
    })

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
        prompt: () => Promise<void>
        userChoice: Promise<{ outcome: string }>
      }
      event.prompt = async () => undefined
      event.userChoice = Promise.resolve({ outcome: 'dismissed' })
      window.dispatchEvent(event)
    })

    const banner = page.getByTestId('pwa-install-prompt')
    await expect(banner).toBeVisible({ timeout: 12_000 })
    await expect(page.getByTestId('pwa-install-confirm')).toBeVisible()

    await context.close()
  })
})
