/**
 * QA manual asistido: login E2E + flujo aviso capítulo en dashboard.
 * Uso: node scripts/qa-chapter-history.mjs
 */
import { readFileSync } from 'fs'
import path from 'path'
import { chromium } from 'playwright'

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001'

function loadCreds() {
  const envPath = path.join(process.cwd(), '.env.e2e.local')
  const content = readFileSync(envPath, 'utf-8')
  let email = ''
  let password = ''
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim()
    if (t.startsWith('E2E_USER_EMAIL=')) email = t.slice(16).replace(/^["']|["']$/g, '').trim()
    if (t.startsWith('E2E_USER_PASSWORD=')) password = t.slice(18).replace(/^["']|["']$/g, '').trim()
  }
  return { email, password: password.replace(/\s+/g, '') }
}

const { email, password } = loadCreds()
if (!email || !password) {
  console.error('Faltan E2E_USER_EMAIL / E2E_USER_PASSWORD en .env.e2e.local')
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.getByTestId('login-email').waitFor({ state: 'visible', timeout: 15000 })
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
  await page.waitForTimeout(3000)
  const loginErr = page.getByTestId('login-error')
  if (await loginErr.isVisible().catch(() => false)) {
    throw new Error(`Login: ${(await loginErr.textContent())?.trim() || 'error desconocido'}`)
  }
  if (!page.url().includes('/dashboard')) {
    throw new Error(`Tras login sigue en: ${page.url()}`)
  }

  const addBtn = page.getByRole('button', { name: /añadir lectura/i }).first()
  await addBtn.waitFor({ state: 'visible', timeout: 20000 })
  await addBtn.click()

  await page.getByPlaceholder(/Buscar libro/i).waitFor({ state: 'visible', timeout: 10000 })
  await page.getByPlaceholder(/Buscar libro/i).fill('Juan')
  await page.getByRole('button', { name: /^Juan$/i }).first().click({ timeout: 8000 })

  const capInput = page.getByPlaceholder('Ej: 1')
  await capInput.fill('3')
  await capInput.blur()
  await page.waitForTimeout(2000)

  const alert = page.getByRole('alert')
  const hasAlert = await alert.isVisible()
  const versesDisabled = await page.getByPlaceholder('Inicio').isDisabled()

  console.log('--- QA capítulo historial ---')
  console.log('URL:', page.url())
  console.log('Aviso visible:', hasAlert)
  console.log('Versículos bloqueados:', versesDisabled)

  if (hasAlert) {
    const text = await alert.innerText()
    console.log('Texto aviso (extracto):', text.slice(0, 200).replace(/\s+/g, ' '))
    const link = page.getByRole('link', { name: /historial/i })
    console.log('Enlace historial visible:', await link.isVisible().catch(() => false))

    await page.getByRole('button', { name: /^no$/i }).click()
    await page.waitForTimeout(500)
    console.log('Tras No — capítulo vacío:', (await capInput.inputValue()) === '')
    console.log('Tras No — libro Juan:', (await page.getByPlaceholder(/Buscar libro/i).inputValue()) === 'Juan')
  } else {
    console.log('Sin aviso (capítulo no registrado o sin datos en BD)')
    console.log('Versículos habilitados:', !(await page.getByPlaceholder('Inicio').isDisabled()))
  }

  await page.screenshot({ path: 'qa-chapter-history.png', fullPage: true })
  console.log('Captura: qa-chapter-history.png')
  console.log('OK')
} catch (err) {
  console.error('QA falló:', err.message)
  await page.screenshot({ path: 'qa-chapter-history-error.png', fullPage: true })
  process.exit(1)
} finally {
  await browser.close()
}
