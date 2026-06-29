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

function safePassword(p: string): string {
  return p.replace(/\s+/g, '').trim()
}

/** Prioriza .env.e2e.local (los workers de Playwright no heredan process.env del config). */
function loadE2ECredentials(): { email: string; password: string } {
  let email = ''
  let password = ''
  try {
    const envPath = path.join(process.cwd(), '.env.e2e.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split(/\r?\n/)) {
      const t = line.trim()
      if (t.startsWith('E2E_USER_EMAIL=')) {
        email = cleanEnvValue(t.slice('E2E_USER_EMAIL='.length))
      } else if (t.startsWith('E2E_USER_PASSWORD=')) {
        password = cleanEnvValue(t.slice('E2E_USER_PASSWORD='.length))
      }
    }
  } catch {
    // .env.e2e.local opcional
  }
  if (email && password) return { email, password }
  return {
    email: cleanEnvValue(process.env.E2E_USER_EMAIL ?? ''),
    password: cleanEnvValue(process.env.E2E_USER_PASSWORD ?? ''),
  }
}

export function hasE2ECredentials(): boolean {
  const { email, password } = loadE2ECredentials()
  return Boolean(email && password)
}

/**
 * Si la página está en /login, rellena el formulario y envía.
 * Espera redirección a /dashboard (animación de éxito ~1,5 s).
 */
export async function loginIfNeeded(page: Page): Promise<boolean> {
  const url = page.url()
  if (!url.includes('/login')) return true

  const { email, password } = loadE2ECredentials()
  if (!email || !password) return false

  const emailInput = page.getByTestId('login-email')
  const passwordInput = page.getByTestId('login-password')
  const submitBtn = page.getByTestId('login-submit')

  await emailInput.waitFor({ state: 'visible', timeout: 5000 })
  await emailInput.fill(email)
  await passwordInput.fill(safePassword(password))
  await submitBtn.click()

  try {
    await page.waitForURL(/\/dashboard/, { timeout: 25_000 })
    return true
  } catch {
    return false
  }
}

/** Devuelve el mensaje de error mostrado en la página de login (si hay). */
export async function getLoginError(page: Page): Promise<string> {
  const err = page.getByTestId('login-error')
  await err.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
  if (await err.isVisible()) return (await err.textContent()) ?? ''
  return ''
}
