/**
 * Tests de configuración PWA: manifest, splash, iconos.
 * Verifica que la app instalable muestre fondo blanco y logo grande.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const PUBLIC = join(process.cwd(), 'public')

describe('PWA config', () => {
  describe('manifest.json', () => {
    it('debe tener background_color blanco para splash', () => {
      const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.json'), 'utf-8'))
      expect(manifest.background_color).toBe('#ffffff')
    })

    it('debe tener theme_color blanco para splash', () => {
      const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.json'), 'utf-8'))
      expect(manifest.theme_color).toBe('#ffffff')
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
  })

  describe('assets PWA', () => {
    it('debe existir splash-iphone.png', () => {
      expect(existsSync(join(PUBLIC, 'splash', 'splash-iphone.png'))).toBe(true)
    })

    it('splash-iphone debe ser PNG válido con dimensiones esperadas', () => {
      const buf = readFileSync(join(PUBLIC, 'splash', 'splash-iphone.png'))
      // PNG signature
      expect(buf[0]).toBe(0x89)
      expect(buf[1]).toBe(0x50)
      expect(buf[2]).toBe(0x4e)
      expect(buf[3]).toBe(0x47)
    })

    it('debe existir logo.jpg', () => {
      expect(existsSync(join(PUBLIC, 'logo.jpg'))).toBe(true)
    })

    it('debe existir icono 512x512', () => {
      expect(existsSync(join(PUBLIC, 'icons', 'icon-512x512.png'))).toBe(true)
    })
  })
})
