/**
 * Helper de login para E2E.
 * Credenciales en .env.e2e.local (E2E_USER_EMAIL, E2E_USER_PASSWORD).
 * Si el login falla ("Invalid login credentials"), comprueba usuario en Supabase y que la app use el mismo proyecto.
 */

import path from 'path'
import { readFileSync } from 'fs'
import type { Page } from '@playwright/test'

function cleanEnvValue(s: string): string {
  return s.replace(/^["']|["']$/g, '').replace(/\r?\n|\r/g, '').trim()
}
// Asegurar que la contraseña no tenga espacios/saltos de línea al rellenar
function safePassword(p: string): string {
  return p.replace(/\s+/g, '').trim()
}

function loadE2ECredentials(): { email: string; password: string } {
  let email = cleanEnvValue(process.env.E2E_USER_EMAIL ?? '')
  let password = cleanEnvValue(process.env.E2E_USER_PASSWORD ?? '')
  if (email && password) return { email, password }
  try {
    const envPath = path.join(process.cwd(), '.env.e2e.local')
    const content = readFileSync(envPath, 'utf-8')
    content.split(/\r?\n/).forEach((line) => {
      const t = line.trim()
      if (t.startsWith('E2E_USER_EMAIL=')) {
        email = cleanEnvValue(t.slice(16))
      }
      if (t.startsWith('E2E_USER_PASSWORD=')) {
        password = cleanEnvValue(t.slice(18))
      }
    })
  } catch {
    // .env.e2e.local opcional
  }
  return { email, password }
}

const { email: EMAIL, password: PASSWORD } = loadE2ECredentials()
const PASSWORD_CLEAN = safePassword(PASSWORD)

export function hasE2ECredentials(): boolean {
  return Boolean(EMAIL && PASSWORD)
}

/**
 * Si la página está en /login, rellena el formulario y envía.
 * Espera a que la navegación termine (dashboard o error).
 * Si falla, se puede llamar getLoginError(page) para ver el mensaje mostrado en la app.
 */
export async function loginIfNeeded(page: Page): Promise<boolean> {
  const url = page.url()
  if (!url.includes('/login')) return true
  if (!hasE2ECredentials()) return false

  const emailInput = page.getByTestId('login-email')
  const passwordInput = page.getByTestId('login-password')
  const submitBtn = page.getByTestId('login-submit')

  await emailInput.waitFor({ state: 'visible', timeout: 5000 })
  await emailInput.fill(EMAIL)
  await passwordInput.fill(PASSWORD_CLEAN)
  await submitBtn.click()

  await page.waitForURL(/\/(dashboard|login)/, { timeout: 20000 })
  return page.url().includes('/dashboard')
}

/** Devuelve el mensaje de error mostrado en la página de login (si hay). */
export async function getLoginError(page: Page): Promise<string> {
  const err = page.getByTestId('login-error')
  await err.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
  if (await err.isVisible()) return (await err.textContent()) ?? ''
  return ''
}
