import { defineConfig, devices } from '@playwright/test'
import path from 'path'
import { readFileSync } from 'fs'

// Cargar credenciales E2E desde .env.e2e.local (no se sube al repo)
try {
  const envPath = path.join(process.cwd(), '.env.e2e.local')
  const content = readFileSync(envPath, 'utf-8')
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('E2E_USER_EMAIL=')) {
      process.env.E2E_USER_EMAIL = trimmed.slice(16).replace(/^["']|["']$/g, '').replace(/\r/g, '').trim()
    } else if (trimmed.startsWith('E2E_USER_PASSWORD=')) {
      process.env.E2E_USER_PASSWORD = trimmed.slice(18).replace(/^["']|["']$/g, '').replace(/\r/g, '').trim()
    }
  })
} catch {
  // .env.e2e.local opcional; los tests que requieran login harán skip si no hay credenciales
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      },
})
