import { expect, type Page } from '@playwright/test'

const IGNORE_PAGE_ERROR = /ResizeObserver loop|Loading chunk|AbortError/i

export const APP_PAGES: ReadonlyArray<{ name: string; path: string }> = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'cultos', path: '/dashboard/cultos' },
    { name: 'ofrenda', path: '/dashboard/ofrenda' },
    { name: 'historial-lecturas', path: '/dashboard/historial/lecturas' },
    { name: 'temas-alabanza', path: '/dashboard/historial/temas-alabanza' },
    { name: 'himnario', path: '/dashboard/himnario' },
    { name: 'hermanos', path: '/dashboard/hermanos' },
    { name: 'archivos', path: '/dashboard/archivos' },
    { name: 'instrucciones', path: '/dashboard/instrucciones' },
    { name: 'festivos', path: '/dashboard/festivos' },
    { name: 'profile', path: '/dashboard/profile' },
    { name: 'admin', path: '/dashboard/admin' },
    { name: 'admin-control', path: '/dashboard/admin/control' },
    { name: 'admin-users', path: '/dashboard/admin/users' },
    { name: 'admin-sedes', path: '/dashboard/admin/sedes' },
    { name: 'admin-horarios', path: '/dashboard/admin/horarios' },
    { name: 'admin-comparador', path: '/dashboard/admin/comparador' },
    { name: 'admin-mapa', path: '/dashboard/admin/mapa' },
    { name: 'admin-personas', path: '/dashboard/admin/personas' },
    { name: 'admin-himnario', path: '/dashboard/admin/himnario' },
    { name: 'admin-lecturas', path: '/dashboard/admin/lecturas' },
    { name: 'admin-stats', path: '/dashboard/admin/stats' },
    { name: 'admin-audit', path: '/dashboard/admin/audit' },
]

export const SIDEBAR_PATHS = [
    '/dashboard',
    '/dashboard/cultos',
    '/dashboard/ofrenda',
    '/dashboard/historial/lecturas',
    '/dashboard/himnario',
    '/dashboard/hermanos',
    '/dashboard/archivos',
    '/dashboard/instrucciones',
    '/dashboard/admin',
] as const

export function attachPageErrorCollector(page: Page): { errors: string[] } {
    const errors: string[] = []
    page.on('pageerror', (err) => {
        if (IGNORE_PAGE_ERROR.test(err.message)) return
        errors.push(err.message)
    })
    return { errors }
}

export async function waitForAppPage(page: Page): Promise<void> {
    await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })
    expect(page.url()).not.toMatch(/\/login/)
}

export async function assertNoCrashBanner(page: Page): Promise<void> {
    const crash = page.getByText(/error cargando|error al cargar|application error|something went wrong/i)
    await expect(crash).toHaveCount(0)
}

export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
    const metrics = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: window.innerWidth,
    }))
    expect(
        metrics.scroll,
        `overflow horizontal: scrollWidth ${metrics.scroll} > innerWidth ${metrics.inner}`,
    ).toBeLessThanOrEqual(metrics.inner + 16)
}

/**
 * Contraste del título del hero (blanco sobre marino).
 * No recorre todos los botones: degradados y chips del calendario dan falsos positivos.
 */
export async function assertMainTextReadable(page: Page): Promise<void> {
    const issues = await page.evaluate(() => {
        const parse = (c: string): [number, number, number, number] | null => {
            const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?/)
            if (!m) return null
            return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])]
        }
        const srgb = (v: number) => {
            const x = v / 255
            return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
        }
        const lum = (r: number, g: number, b: number) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
        const ratio = (fg: [number, number, number], bg: [number, number, number]) => {
            const L1 = lum(...fg)
            const L2 = lum(...bg)
            return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
        }

        const heroes = [...document.querySelectorAll('[data-testid="page-hero"] h1')]
        const bad: string[] = []
        for (const el of heroes) {
            const style = getComputedStyle(el)
            const fg = parse(style.color)
            if (!fg) continue
            const r = ratio([fg[0], fg[1], fg[2]], [31, 46, 133])
            if (r < 3) bad.push(`hero h1 "${(el.textContent || '').trim().slice(0, 40)}" ratio ${r.toFixed(2)}`)
        }
        return bad
    })
    expect(issues, issues.join(' | ')).toEqual([])
}

export async function assertPageLooksHealthy(page: Page, pageErrors: string[]): Promise<void> {
    await waitForAppPage(page)
    await assertNoCrashBanner(page)
    await assertNoHorizontalOverflow(page)
    await assertMainTextReadable(page)
    expect(pageErrors, pageErrors.join('\n')).toEqual([])
}
