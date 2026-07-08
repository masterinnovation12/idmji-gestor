/**
 * Tests de configuración PWA: manifest, splash (marco dorado), iconos.
 * Verifica que la app instalable muestre fondo navy + logo en marco dorado,
 * idéntico en el splash del sistema y en el splash in-app.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp'
import {
    computeSplashBadgeLayout,
    SPLASH_IPHONE_HEIGHT,
    SPLASH_IPHONE_WIDTH,
} from './splashLayout'

const PUBLIC = join(process.cwd(), 'public')
const SPLASH = join(PUBLIC, 'splash', 'splash-iphone.png')

async function pixelAt(path: string, x: number, y: number): Promise<[number, number, number]> {
    const { data } = await sharp(path)
        .extract({ left: x, top: y, width: 1, height: 1 })
        .raw()
        .toBuffer({ resolveWithObject: true })
    return [data[0], data[1], data[2]]
}

describe('PWA config', () => {
    describe('manifest.json', () => {
        it('debe tener background_color navy para splash', () => {
            const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.json'), 'utf-8'))
            expect(manifest.background_color).toBe('#1f2e85')
        })

        it('debe tener theme_color navy para splash', () => {
            const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.json'), 'utf-8'))
            expect(manifest.theme_color).toBe('#1f2e85')
        })

        it('debe listar icono 512x512 primero para splash más grande', () => {
            const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.json'), 'utf-8'))
            const firstIcon = manifest.icons[0]
            expect(firstIcon.sizes).toBe('512x512')
            expect(firstIcon.src).toContain('icon-512x512')
        })

        it('debe tener iconos requeridos para instalación', () => {
            const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.json'), 'utf-8'))
            const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
            expect(sizes).toContain('192x192')
            expect(sizes).toContain('512x512')
        })

        it('related_applications permite detectar la PWA instalada (getInstalledRelatedApps)', () => {
            const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.json'), 'utf-8'))
            const webapp = manifest.related_applications?.find(
                (a: { platform: string }) => a.platform === 'webapp'
            )
            expect(webapp).toBeDefined()
            expect(webapp.id).toBe(manifest.id)
            expect(webapp.url).toMatch(/^https:\/\/.+\/manifest\.json$/)
            // Nunca preferir apps nativas: instalación PWA siempre disponible
            expect(manifest.prefer_related_applications).toBe(false)
        })
    })

    describe('assets PWA', () => {
        it('debe existir splash-iphone.png', () => {
            expect(existsSync(SPLASH)).toBe(true)
        })

        it('splash-iphone debe ser PNG válido', () => {
            const buf = readFileSync(SPLASH)
            expect(buf[0]).toBe(0x89)
            expect(buf[1]).toBe(0x50)
            expect(buf[2]).toBe(0x4e)
            expect(buf[3]).toBe(0x47)
        })

        it('splash-iphone tiene las dimensiones esperadas', async () => {
            const meta = await sharp(SPLASH).metadata()
            expect(meta.width).toBe(SPLASH_IPHONE_WIDTH)
            expect(meta.height).toBe(SPLASH_IPHONE_HEIGHT)
        })

        it('debe existir logo.jpg', () => {
            expect(existsSync(join(PUBLIC, 'logo.jpg'))).toBe(true)
        })

        it('debe existir icono 512x512', () => {
            expect(existsSync(join(PUBLIC, 'icons', 'icon-512x512.png'))).toBe(true)
        })

        it('deben existir los apple-touch-icons referenciados en layout', () => {
            for (const s of [152, 167, 180]) {
                expect(existsSync(join(PUBLIC, 'icons', `icon-${s}x${s}.png`))).toBe(true)
            }
        })
    })

    describe('splash con marco dorado', () => {
        const layout = computeSplashBadgeLayout(SPLASH_IPHONE_WIDTH, SPLASH_IPHONE_HEIGHT)

        it('el marco del badge es dorado', async () => {
            const x = Math.round(layout.left + layout.size / 2)
            const y = Math.round(layout.top + layout.rim / 2)
            const [r, g, b] = await pixelAt(SPLASH, x, y)
            expect(r).toBeGreaterThan(150)
            expect(g).toBeGreaterThan(110)
            expect(r).toBeGreaterThan(b) // tono dorado (rojo > azul)
            expect(b).toBeLessThan(170)
        })

        it('la zona interior (aro entre marco y logo) es blanca', async () => {
            // Centro superior del aro blanco (entre el rim dorado y el logo),
            // lejos de las esquinas redondeadas del badge.
            const x = Math.round(layout.left + layout.size / 2)
            const y = layout.top + layout.rim + Math.round((layout.innerPad - layout.rim) / 2)
            const [r, g, b] = await pixelAt(SPLASH, x, y)
            expect(r).toBeGreaterThan(240)
            expect(g).toBeGreaterThan(240)
            expect(b).toBeGreaterThan(240)
        })

        it('el fondo alrededor del badge es navy', async () => {
            // #1f2e85 → r=31 g=46 b=133
            const [r, g, b] = await pixelAt(SPLASH, 40, 40)
            expect(r).toBeLessThan(60)
            expect(g).toBeLessThan(80)
            expect(b).toBeGreaterThan(100)
        })
    })

    describe('iconos con marco dorado', () => {
        it('icon-512 (any) tiene el marco dorado en el borde', async () => {
            const icon = join(PUBLIC, 'icons', 'icon-512x512.png')
            // Centro del borde superior: dentro del rim dorado
            const [r, g, b] = await pixelAt(icon, 256, 6)
            expect(r).toBeGreaterThan(150)
            expect(g).toBeGreaterThan(110)
            expect(r).toBeGreaterThan(b)
        })

        it('icon maskable tiene fondo navy full-bleed en las esquinas', async () => {
            const icon = join(PUBLIC, 'icons', 'icon-maskable-512x512.png')
            const [r, g, b] = await pixelAt(icon, 10, 10)
            expect(r).toBeLessThan(60)
            expect(g).toBeLessThan(80)
            expect(b).toBeGreaterThan(100)
        })

        it('apple-touch-icon 180 es full-bleed dorado en el borde', async () => {
            const icon = join(PUBLIC, 'icons', 'icon-180x180.png')
            const [r, g, b] = await pixelAt(icon, 90, 3)
            expect(r).toBeGreaterThan(150)
            expect(g).toBeGreaterThan(110)
            expect(r).toBeGreaterThan(b)
        })
    })
})
